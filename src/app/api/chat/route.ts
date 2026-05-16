import { convertToModelMessages, smoothStream, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { chatModel, buildStepSystemPrompt } from '@/lib/ai/chat-config';
import { saveMessages, loadFirstAssistantMessage } from '@/lib/ai/message-persistence';
import { assembleStepContext } from '@/lib/context/assemble-context';
import { getStepById, STEPS } from '@/lib/workshop/step-metadata';
import { db } from '@/db/client';
import { workshops, chatRequestLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentArcPhase } from '@/lib/ai/conversation-state';
import { streamTextWithRetry, isGeminiRateLimitError } from '@/lib/ai/gemini-retry';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { loadCanvasState } from '@/actions/canvas-actions';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { createHash } from 'node:crypto';

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

    // Hoisted so onFinish can backfill responseMessageId from any fresh-gen path.
    // Plan A's fresh-gen site (this task) assigns to this.
    // Plan B's won-greeting fresh-gen path will also assign to this.
    // Race-loser replay path (Plan B) does NOT use this — it inserts inline with its own crypto.randomUUID().
    let requestId: string | null = null;

    // Validate required parameters
    if (!sessionId || !stepId || !workshopId) {
      return new Response(
        JSON.stringify({ error: 'sessionId, stepId, and workshopId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Greeting singleton: if this request is the `__step_start__` auto-start
    // trigger and an assistant message already exists for this scope, replay
    // the stored greeting instead of generating a new one. Prevents duplicate
    // greetings caused by remounts, fast-refresh, Strict Mode, or the
    // page-mount cleanup racing with an in-flight stream's onFinish.
    const lastMsg = Array.isArray(messages) ? messages[messages.length - 1] : null;
    const isStepStartTrigger = !!(
      lastMsg?.role === 'user' &&
      lastMsg.parts?.some(
        (p: { type: string; text?: string }) =>
          p.type === 'text' && p.text === '__step_start__',
      )
    );

    if (isStepStartTrigger) {
      const existing = await loadFirstAssistantMessage(sessionId, stepId, participantId);
      if (existing) {
        const textId = `${existing.messageId}-text`;
        const stream = createUIMessageStream({
          execute: ({ writer }) => {
            writer.write({ type: 'start', messageId: existing.messageId });
            writer.write({ type: 'start-step' });
            writer.write({ type: 'text-start', id: textId });
            writer.write({ type: 'text-delta', id: textId, delta: existing.content });
            writer.write({ type: 'text-end', id: textId });
            writer.write({ type: 'finish-step' });
            writer.write({ type: 'finish' });
          },
        });
        return createUIMessageStreamResponse({ stream });
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
1. Synthesize a "How might we…" challenge statement from the Idea, Problem, and Audience cards in the "Filled by user" block.
2. Emit it as: [CANVAS_ITEM key="challenge-statement"]How might we…?[/CANVAS_ITEM]
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
        responseMessageId: null, // backfilled in onFinish below
        isReplay: false,
      });
    } catch (err) {
      console.error('[chat-request-log] fresh-gen insert failed', err);
      // Observability must never break the chat request. Continue.
    }

    // Stream Gemini response with context-aware prompt and rate limit retry
    const result = await streamTextWithRetry({
      model: chatModel,
      system: systemPrompt,
      messages: modelMessages,
      experimental_transform: smoothStream({ chunking: 'word' }),
    });

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
      onFinish: async ({ messages: responseMessages }) => {
        await saveMessages(sessionId, stepId, responseMessages, participantId);

        // Backfill the response_message_id now that we have the assistant message id.
        // KNOWN LIMITATION: AI SDK v5 generates the assistant message id client-side,
        // so responseMessages[last].id is '' here. response_message_id stays null until
        // a follow-up wires backfill through autoSaveMessages (which knows the client id).
        // See 62.1-01-SUMMARY.md "Known limitations".
        const assistantMsg = [...responseMessages].reverse().find((m) => m.role === 'assistant');
        const assistantMessageId = assistantMsg?.id ?? '';
        if (typeof requestId === 'string' && assistantMessageId) {
          try {
            await db.update(chatRequestLogs)
              .set({ responseMessageId: assistantMessageId })
              .where(eq(chatRequestLogs.requestId, requestId));
          } catch (err) {
            console.error('[chat-request-log] backfill failed', err);
          }
        }
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
