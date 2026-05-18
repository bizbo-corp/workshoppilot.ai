// The per-step AI greeting trigger is defended by 7 layers — read
// .planning/codebase/DEFENSIVE_PATTERNS.md before relaxing any guard in this
// file, in chat-panel.tsx, participant-chat-panel.tsx, or message-persistence.ts.
import { convertToModelMessages, smoothStream, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { chatModel, buildStepSystemPrompt } from '@/lib/ai/chat-config';
import { saveMessages, claimGreetingPlaceholder, fillGreetingPlaceholder, pollForFilledGreeting, deleteEmptyGreetingPlaceholder } from '@/lib/ai/message-persistence';
import { assembleStepContext } from '@/lib/context/assemble-context';
import { getStepById, STEPS } from '@/lib/workshop/step-metadata';
import { db } from '@/db/client';
import { workshops, chatRequestLogs, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentArcPhase } from '@/lib/ai/conversation-state';
import { streamTextWithRetry, isGeminiRateLimitError } from '@/lib/ai/gemini-retry';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { loadCanvasState } from '@/actions/canvas-actions';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { createHash } from 'node:crypto';
import { createPrefixedId } from '@/lib/ids';

/**
 * Increase Vercel serverless timeout for AI responses.
 * Complex stakeholder mapping responses with canvas items can take 40-50s.
 */
export const maxDuration = 60;

/**
 * POST /api/chat
 * Streams Gemini chat responses and persists messages to database
 *
 * Request body:
 * - messages: UIMessage[] - The conversation history
 * - sessionId: string - The session ID (ses_xxx)
 * - stepId: string - The semantic step ID ('empathize', 'define', etc.)
 * - workshopId: string - The workshop ID (wks_xxx)
 */
export async function POST(req: Request) {
  // Soft auth: allow guests for multiplayer, use IP-based rate limiting for them
  const { userId } = await auth();
  const rl = checkRateLimit(getRateLimitId(req, userId), 'chat');
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { messages, sessionId, stepId, workshopId, subStep, selectedStickyNoteIds, participantId, participantName, conceptOwnerId } = await req.json();

    // Hoisted so the fresh-gen path can populate chat_request_logs and pass the
    // server-generated id to toUIMessageStreamResponse's generateMessageId option.
    // The same id flows through to onFinish's responseMessage.id (the AI SDK v6
    // wire-format start chunk carries it to the client; see node_modules/ai/dist/index.mjs:5417-5418, 7488).
    // Race-loser replay path does NOT use these — it uses filled.messageId directly.
    let requestId: string | null = null;
    let responseMessageId: string | null = null;

    // Validate required parameters
    if (!sessionId || !stepId || !workshopId) {
      return new Response(
        JSON.stringify({ error: 'sessionId, stepId, and workshopId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Scope assertion: verify the sessionId belongs to the claimed workshopId.
    // Returns 404 if session doesn't exist, 409 if workshopId doesn't match.
    // Writes nothing to chat_messages on rejection.
    const sessionRow = await db
      .select({ workshopId: sessions.workshopId })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (sessionRow.length === 0) {
      return new Response(
        JSON.stringify({ error: 'session_not_found', sessionId }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (sessionRow[0].workshopId !== workshopId) {
      return new Response(
        JSON.stringify({
          error: 'workshop_session_mismatch',
          sessionId,
          requestedWorkshopId: workshopId,
          actualWorkshopId: sessionRow[0].workshopId,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // DB-lock greeting singleton: replace read-then-act with atomic INSERT ... ON CONFLICT
    // DO NOTHING against the existing unique index. Race losers poll briefly for the winner's
    // content, then replay. This eliminates the duplicate-greeting race condition.
    const lastMsg = Array.isArray(messages) ? messages[messages.length - 1] : null;
    const isStepStartTrigger = !!(
      lastMsg?.role === 'user' &&
      lastMsg.parts?.some(
        (p: { type: string; text?: string }) =>
          p.type === 'text' && p.text === '__step_start__',
      )
    );

    let greetingClaim:
      | { won: true; placeholderRowId: string; messageId: string }
      | { won: false; messageId: string }
      | null = null;

    const lifecycleScope = `(${sessionId},${stepId},${participantId ?? 'NULL'})`;
    if (isStepStartTrigger) {
      const tClaim = Date.now();
      console.log(`[greeting-lifecycle] route:trigger-received scope=${lifecycleScope}`);
      greetingClaim = await claimGreetingPlaceholder(sessionId, stepId, participantId);
      console.log(`[greeting-lifecycle] route:claim-result scope=${lifecycleScope} won=${greetingClaim.won} elapsedMs=${Date.now() - tClaim}`);

      if (!greetingClaim.won) {
        // Lost the race. Poll for the winner to fill the placeholder. Default 30s budget
        // catches typical prefetch (5-15s) and slow Gemini cases; on timeout we run the
        // empty-placeholder cleanup before falling through to fresh-gen to prevent the
        // race where prefetch fills AFTER fresh-gen has already saved a row of its own.
        const tPoll = Date.now();
        console.log(`[greeting-lifecycle] route:poll-start scope=${lifecycleScope}`);
        const filled = await pollForFilledGreeting(sessionId, stepId, participantId);
        console.log(`[greeting-lifecycle] route:poll-end scope=${lifecycleScope} found=${!!filled} elapsedMs=${Date.now() - tPoll}`);
        if (filled) {
          const textId = `${filled.messageId}-text`;
          const stream = createUIMessageStream({
            execute: ({ writer }) => {
              writer.write({ type: 'start', messageId: filled.messageId });
              writer.write({ type: 'start-step' });
              writer.write({ type: 'text-start', id: textId });
              writer.write({ type: 'text-delta', id: textId, delta: filled.content });
              writer.write({ type: 'text-end', id: textId });
              writer.write({ type: 'finish-step' });
              writer.write({ type: 'finish' });
            },
          });
          // SOLE replay-logging site. Plan A does NOT log replays. This is the only place
          // chat_request_logs gets a row with isReplay=true. Uses its own randomUUID — does NOT
          // touch the hoisted `requestId` (that's reserved for fresh-gen paths).
          try {
            await db.insert(chatRequestLogs).values({
              sessionId,
              stepId,
              participantId: participantId ?? null,
              workshopId,
              requestId: crypto.randomUUID(),
              systemPromptSha: '',
              systemPrompt: '',
              modelMessagesJson: messages,
              responseMessageId: filled.messageId,
              isReplay: true,
            });
          } catch (err) {
            console.error('[chat-request-log] replay insert failed', err);
          }
          return createUIMessageStreamResponse({ stream });
        }
        // Polling timed out. Atomically delete the empty placeholder so a slow-but-alive
        // prefetch's later `fillGreetingPlaceholder` UPDATE matches 0 rows — without this
        // step, fresh-gen would persist its own row AND the prefetch would persist its
        // (now-filled) row, with different message_ids → unique constraint can't help,
        // user sees two greetings (observed: ses_fcrjnajdicsoc1jvg53ikgo7).
        const deletedCount = await deleteEmptyGreetingPlaceholder(sessionId, stepId, participantId);
        console.log(`[greeting-lifecycle] route:empty-delete scope=${lifecycleScope} deleted=${deletedCount}`);
        // Re-poll briefly in case the prefetch filled the placeholder in the window
        // between our last poll check and the atomic delete (DELETE WHERE content=''
        // would have matched 0 rows in that race — content is now non-empty).
        const tLate = Date.now();
        const lateFilled = await pollForFilledGreeting(sessionId, stepId, participantId, 500, 50);
        console.log(`[greeting-lifecycle] route:late-poll-end scope=${lifecycleScope} found=${!!lateFilled} elapsedMs=${Date.now() - tLate}`);
        if (lateFilled) {
          const textId = `${lateFilled.messageId}-text`;
          const stream = createUIMessageStream({
            execute: ({ writer }) => {
              writer.write({ type: 'start', messageId: lateFilled.messageId });
              writer.write({ type: 'start-step' });
              writer.write({ type: 'text-start', id: textId });
              writer.write({ type: 'text-delta', id: textId, delta: lateFilled.content });
              writer.write({ type: 'text-end', id: textId });
              writer.write({ type: 'finish-step' });
              writer.write({ type: 'finish' });
            },
          });
          try {
            await db.insert(chatRequestLogs).values({
              sessionId,
              stepId,
              participantId: participantId ?? null,
              workshopId,
              requestId: crypto.randomUUID(),
              systemPromptSha: '',
              systemPrompt: '',
              modelMessagesJson: messages,
              responseMessageId: lateFilled.messageId,
              isReplay: true,
            });
          } catch (err) {
            console.error('[chat-request-log] late-replay insert failed', err);
          }
          return createUIMessageStreamResponse({ stream });
        }
        // Confirmed: no live placeholder and no filled content. Proceed to fresh-gen.
        console.log(`[greeting-lifecycle] route:fallthrough-to-fresh-gen scope=${lifecycleScope}`);
        greetingClaim = null;
      }
    }

    // Assemble three-tier context for this step
    const stepContext = await assembleStepContext(workshopId, stepId, participantId, conceptOwnerId);

    // Dev-only diagnostic for the challenge step — confirms what canvas state
    // the AI actually receives. Remove once df_d3dgmx43 is verified end-to-end.
    if (process.env.NODE_ENV !== 'production' && stepId === 'challenge') {
      console.log(
        `[challenge-debug] workshop=${workshopId} canvasContext:\n${stepContext.canvasContext || '(empty)'}\n[/challenge-debug]`,
      );
    }

    // Inject selected canvas items into context if any are selected
    if (Array.isArray(selectedStickyNoteIds) && selectedStickyNoteIds.length > 0) {
      const canvasState = await loadCanvasState(workshopId, stepId);
      if (canvasState) {
        const selectedTexts = canvasState.stickyNotes
          .filter(p => selectedStickyNoteIds.includes(p.id))
          .map(p => `- "${p.text}"`)
          .filter(t => t !== '- ""');

        if (selectedTexts.length > 0) {
          const selectionBlock = `\n\nCURRENTLY SELECTED ON CANVAS:\n${selectedTexts.join('\n')}`;
          stepContext.canvasContext = (stepContext.canvasContext || '') + selectionBlock;
        }
      }
    }

    // Get current arc phase from database
    const arcPhase = await getCurrentArcPhase(workshopId, stepId);

    // Get step metadata (display name and description)
    const step = getStepById(stepId);
    const stepName = step?.name || stepId;
    const stepDescription = step?.description ?? '';

    // Fetch workshop title for personalizing the AI introduction
    const workshop = await db.query.workshops.findFirst({
      where: eq(workshops.id, workshopId),
      columns: { title: true },
    });
    const workshopTitle = workshop?.title || null;

    // Sub-step prompt override for Step 8 Ideation
    let instructionsOverride: string | undefined;
    if (stepId === 'ideation' && subStep) {
      const { getIdeationSubStepInstructions } = await import('@/lib/ai/prompts/step-prompts');
      instructionsOverride = getIdeationSubStepInstructions(subStep);
    }

    // Build context-aware system prompt with arc phase and step instructions
    const isParticipant = !!participantId;
    let systemPrompt = buildStepSystemPrompt(
      stepId,
      stepName,
      arcPhase,
      stepDescription,
      stepContext.persistentContext,
      stepContext.summaries,
      stepContext.canvasContext,
      instructionsOverride,
      workshopTitle,
      stepContext.existingItemNames,
      isParticipant,
      participantName,
      stepContext.interviewMode,
    );

    // Per-turn override for the challenge step: when the user is asking the AI
    // to use the board AND the canvas has filled cards, append a hard directive
    // at the END of the system prompt (highest-recency = highest weight).
    // This breaks Gemini out of conversational momentum from earlier turns
    // where the board was genuinely empty. df_d3dgmx43.
    if (
      stepId === 'challenge' &&
      stepContext.canvasContext?.includes('Filled by user')
    ) {
      const lastMsg = Array.isArray(messages) ? messages[messages.length - 1] : null;
      const lastText =
        lastMsg?.parts
          ?.filter((p: { type: string; text?: string }) => p.type === 'text')
          .map((p: { text?: string }) => p.text || '')
          .join(' ') || '';
      const wantsBoard = /\b(board|whiteboard|notes?|cards?|use what|read|draft)\b/i.test(
        lastText,
      );
      if (wantsBoard) {
        systemPrompt += `\n\nTURN OVERRIDE (highest priority — supersedes all prior context):
The user's most recent message asks you to use the board content. The CANVAS STATE section above contains a "Filled by user" block with real, current content. Earlier in this conversation you may have said the board was empty — that was before these cards were filled, so it no longer applies. Ignore those earlier statements.

Do this NOW:
1. Synthesize a complete "How might we…" challenge statement from the Idea, Problem, and Audience cards in the "Filled by user" block. The sentence must be fully written — not the literal placeholder.
2. Emit it as: [CANVAS_ITEM key="challenge-statement"]<your full HMW question — e.g. "How might we help first-time managers give honest feedback without damaging trust?">[/CANVAS_ITEM]. NEVER emit the bare string "How might we…?" or "How might we...?" — the payload must always contain real, content-bearing words.
3. Briefly explain the synthesis in 1-2 sentences.

Do NOT ask the user to re-state the inputs. Do NOT say the board is empty. The cards are real and visible to you above.`;
      }
    }

    // Filter out messages with empty content before conversion.
    // Interrupted streams can leave assistant messages with empty parts in history,
    // which Gemini rejects with 400 ("must include at least one parts field").
    const validMessages = messages.filter((msg: { parts?: Array<{ type: string; text?: string }> }) => {
      const textParts = msg.parts?.filter((p: { type: string; text?: string }) => p.type === 'text' && p.text?.trim()) || [];
      return textParts.length > 0;
    });

    // Convert messages to model format
    const modelMessages = await convertToModelMessages(validMessages);

    // Observability: log this fresh-generation request to chat_request_logs before streaming.
    // Captures verbatim system prompt + sha256 + model messages for admin diagnosis.
    // NEVER throws — observability must not break the chat request.
    requestId = crypto.randomUUID();
    // Pre-generate the assistant message id. This same id is (a) stored in
    // chat_request_logs at insert time (no post-stream backfill), and (b) passed
    // as generateMessageId to toUIMessageStreamResponse so the AI SDK v6 wire-format
    // start chunk carries it to the client, where useChat adopts it. Both server's
    // onFinish and client's useAutoSave then converge on the same id.
    responseMessageId = createPrefixedId('msg');
    const systemPromptSha = createHash('sha256').update(systemPrompt).digest('hex');
    try {
      await db.insert(chatRequestLogs).values({
        sessionId,
        stepId,
        participantId: participantId ?? null,
        workshopId,
        requestId,
        systemPromptSha,
        systemPrompt,
        modelMessagesJson: modelMessages,
        responseMessageId, // populated up-front — no backfill needed
        isReplay: false,
      });
    } catch (err) {
      console.error('[chat-request-log] fresh-gen insert failed', err);
      // Observability must never break the chat request. Continue.
    }

    // Stream Gemini response with context-aware prompt and rate limit retry.
    // For greeting (__step_start__) requests we deliberately skip abortSignal: the placeholder
    // row was already inserted by claimGreetingPlaceholder, so the stream MUST complete
    // server-side to fill it. Without this, a Strict-Mode unmount or quick user navigation
    // leaves an empty placeholder that blocks future claims and forces a 3s poll → fresh-gen
    // recovery on every subsequent mount. For user-typed messages, end-to-end cancellation
    // still saves tokens on abort.
    const tStream = Date.now();
    console.log(`[greeting-lifecycle] route:stream-start scope=${lifecycleScope} isStepStart=${isStepStartTrigger} responseMessageId=${responseMessageId}`);
    const result = await streamTextWithRetry({
      model: chatModel,
      system: systemPrompt,
      messages: modelMessages,
      experimental_transform: smoothStream({ chunking: 'word' }),
      abortSignal: isStepStartTrigger ? undefined : req.signal,
    });
    console.log(`[greeting-lifecycle] route:stream-returned scope=${lifecycleScope} elapsedMs=${Date.now() - tStream}`);

    // Consume stream server-side to ensure onFinish fires even if client disconnects
    result.consumeStream();

    // Record token usage after stream completes (fire-and-forget)
    Promise.resolve(result.usage).then((usage) => {
      if (usage) {
        recordUsageEvent({
          workshopId,
          stepId,
          operation: 'chat',
          model: 'gemini-2.0-flash',
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        });
      }
    }).catch(() => {});

    // Return streaming response with persistence on finish
    // originalMessages enables "persistence mode" — onFinish receives the
    // full conversation (original + new assistant response), not just the new message
    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      originalMessages: messages,
      // AI SDK v6: pre-generated id flows through wire-format start chunk to client.
      // Server's onFinish.responseMessage.id === responseMessageId (no more empty string).
      // Client's useChat adopts via state.message.id = chunk.messageId.
      // Requires originalMessages above to apply (see node_modules/ai/dist/index.mjs:4751-4761).
      generateMessageId: () => responseMessageId!,
      onFinish: async ({ messages: responseMessages }) => {
        const assistantMsg = [...responseMessages].reverse().find((m) => m.role === 'assistant');
        const assistantContent = assistantMsg?.parts?.filter((p) => p.type === 'text').map((p) => (p as { type: 'text'; text: string }).text).join('') ?? '';
        // assistantMsg.id is now the AI SDK-generated id (==responseMessageId), no longer ''.
        console.log(`[greeting-lifecycle] route:onFinish scope=${lifecycleScope} contentLen=${assistantContent.length} wonGreeting=${!!(greetingClaim && greetingClaim.won)} totalStreamMs=${Date.now() - tStream}`);

        if (greetingClaim && greetingClaim.won && assistantContent.trim().length > 0) {
          // Won-greeting path: fill the placeholder row with the streamed content AND
          // replace the deterministic placeholder messageId with the real AI SDK-generated id.
          // The client's autoSaveMessages will try to write a parallel row with this same id;
          // the unique index chat_messages_session_step_participant_message_uniq drops the
          // second insert via onConflictDoNothing(). Dual-row state from 62.1 is eliminated.
          try {
            await fillGreetingPlaceholder(
              greetingClaim.placeholderRowId,
              assistantContent,
              assistantMsg!.id, // real AI SDK-generated id (not greetingClaim.messageId)
            );
            console.log(`[greeting-lifecycle] route:onFinish:filled-placeholder scope=${lifecycleScope} messageId=${assistantMsg!.id}`);
          } catch (err) {
            console.error(`[greeting-lifecycle] route:onFinish:fill-failed scope=${lifecycleScope}; falling back to saveMessages`, err);
            await saveMessages(sessionId, stepId, responseMessages, participantId);
          }
        } else {
          console.log(`[greeting-lifecycle] route:onFinish:saveMessages scope=${lifecycleScope} reason=${!greetingClaim ? 'no-claim' : !greetingClaim.won ? 'lost-claim' : 'empty-content'}`);
          await saveMessages(sessionId, stepId, responseMessages, participantId);
        }
        // chat_request_logs.response_message_id was populated at insert time — no backfill block needed.
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle rate limit errors specifically after all retries exhausted
    if (isGeminiRateLimitError(error)) {
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: 'The AI is currently experiencing high demand. Please try again in a few moments.',
          retryAfter: 30,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '30',
          },
        }
      );
    }

    // Generic error for non-rate-limit failures
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
