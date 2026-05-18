import { db } from '@/db/client';
import { chatMessages, workshops } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { convertToModelMessages, type UIMessage } from 'ai';
import { chatModel, buildStepSystemPrompt } from './chat-config';
import { claimGreetingPlaceholder, fillGreetingPlaceholder } from './message-persistence';
import { generateTextWithRetry } from './gemini-retry';
import { recordUsageEvent } from './usage-tracking';
import { assembleStepContext } from '@/lib/context/assemble-context';
import { getStepById } from '@/lib/workshop/step-metadata';
import { getCurrentArcPhase } from './conversation-state';
import { createPrefixedId } from '@/lib/ids';

/**
 * Pre-generate a step-start greeting on the server, before any client mounts the chat.
 *
 * Why: `/api/chat` already handles `__step_start__` triggers via a DB-lock singleton
 * (`claimGreetingPlaceholder`). But the client only sends the trigger AFTER the chat panel
 * mounts, which on slow paths (e.g. `setupWorkshop` waits ~30-60s for Liveblocks sync +
 * Gemini summary + invite emails before redirecting) means the facilitator stares at a
 * blank chat for the full Gemini latency once they finally land. This helper runs in the
 * server action's `after()` queue so the greeting is already in the DB by the time the
 * client mounts.
 *
 * Race semantics — uses the same `claimGreetingPlaceholder` singleton as `/api/chat`:
 * - If this prefetch wins the claim: generates the greeting, fills the placeholder.
 *   The client's later `__step_start__` request loses the claim and replays the stored
 *   content via `pollForFilledGreeting` (3s budget).
 * - If this prefetch loses the claim: a client already beat us to it. No-op.
 *
 * Failure mode: if we win the claim but Gemini fails, the placeholder is DELETED so
 * future requests can claim cleanly. Leaving an empty placeholder would force every
 * subsequent client into the 3s poll → fresh-gen recovery on each mount.
 *
 * Always fire-and-forget (caller should wrap in `after(() => ...)` or `void`). Errors
 * are logged but never thrown.
 */
export async function prefetchStepStartGreeting(params: {
  workshopId: string;
  sessionId: string;
  stepId: string;
  participantId?: string | null;
  participantName?: string | null;
}): Promise<void> {
  const { workshopId, sessionId, stepId, participantId, participantName } = params;
  const scope = `(${sessionId},${stepId},${participantId ?? 'NULL'})`;
  const t0 = Date.now();
  console.log(`[greeting-lifecycle] prefetch:start scope=${scope}`);

  let claim: Awaited<ReturnType<typeof claimGreetingPlaceholder>>;
  try {
    claim = await claimGreetingPlaceholder(sessionId, stepId, participantId);
  } catch (err) {
    console.error(`[greeting-lifecycle] prefetch:claim-error scope=${scope}:`, err);
    return;
  }

  console.log(`[greeting-lifecycle] prefetch:claim-result scope=${scope} won=${claim.won} elapsedMs=${Date.now() - t0}`);

  if (!claim.won) {
    // A client (or another prefetch) already claimed this scope. They will fill it.
    return;
  }

  try {
    const stepContext = await assembleStepContext(workshopId, stepId, participantId ?? undefined);
    const arcPhase = await getCurrentArcPhase(workshopId, stepId);
    const step = getStepById(stepId);
    const stepName = step?.name || stepId;
    const stepDescription = step?.description ?? '';
    const [workshopRow] = await db
      .select({ title: workshops.title })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);
    const workshopTitle = workshopRow?.title || null;

    const isParticipant = !!participantId;
    const systemPrompt = buildStepSystemPrompt(
      stepId,
      stepName,
      arcPhase,
      stepDescription,
      stepContext.persistentContext,
      stepContext.summaries,
      stepContext.canvasContext,
      undefined,
      workshopTitle,
      stepContext.existingItemNames,
      isParticipant,
      participantName ?? undefined,
      stepContext.interviewMode,
    );

    const triggerMessage: UIMessage = {
      id: `step-start:${sessionId}:${stepId}:prefetch`,
      role: 'user',
      parts: [{ type: 'text', text: '__step_start__' }],
    };
    const modelMessages = await convertToModelMessages([triggerMessage]);

    const tGemini = Date.now();
    console.log(`[greeting-lifecycle] prefetch:gemini-start scope=${scope}`);
    const result = await generateTextWithRetry({
      model: chatModel,
      system: systemPrompt,
      messages: modelMessages,
    });
    console.log(`[greeting-lifecycle] prefetch:gemini-end scope=${scope} elapsedMs=${Date.now() - tGemini} textLen=${result.text?.length ?? 0}`);

    const text = result.text?.trim() ?? '';
    if (text.length === 0) {
      throw new Error('Gemini returned empty greeting');
    }

    const finalMessageId = createPrefixedId('msg');
    await fillGreetingPlaceholder(claim.placeholderRowId, text, finalMessageId);
    console.log(`[greeting-lifecycle] prefetch:filled scope=${scope} messageId=${finalMessageId} totalElapsedMs=${Date.now() - t0}`);

    if (result.usage) {
      recordUsageEvent({
        workshopId,
        stepId,
        operation: 'chat',
        model: 'gemini-2.0-flash',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });
    }
  } catch (err) {
    console.error(`[greeting-lifecycle] prefetch:generation-failed scope=${scope} elapsedMs=${Date.now() - t0}:`, err);
    // Delete the empty placeholder we just claimed — leaving it would force every
    // subsequent request into pollForFilledGreeting's 3s timeout + fresh-gen recovery.
    try {
      await db.delete(chatMessages).where(eq(chatMessages.id, claim.placeholderRowId));
      console.log(`[greeting-lifecycle] prefetch:cleanup-deleted scope=${scope}`);
    } catch (cleanupErr) {
      console.error(
        `[greeting-lifecycle] prefetch:cleanup-failed scope=${scope}:`,
        cleanupErr,
      );
    }
  }
}
