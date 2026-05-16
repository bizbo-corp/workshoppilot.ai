import { db } from '@/db/client';
import { chatMessages } from '@/db/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';
import type { UIMessage } from 'ai';

export type StoredAssistantMessage = {
  messageId: string;
  content: string;
};

/**
 * Build the WHERE clause for participant-scoped queries.
 * NULL participantId = facilitator/solo messages.
 */
function participantFilter(participantId?: string | null) {
  return participantId
    ? eq(chatMessages.participantId, participantId)
    : isNull(chatMessages.participantId);
}

/**
 * Save messages to database for a given session and step
 * Uses a transaction to avoid duplicates by comparing with existing messageIds
 *
 * @param sessionId - The session ID (ses_xxx)
 * @param stepId - The semantic step ID ('empathize', 'define', etc.)
 * @param messages - Array of UIMessage objects from AI SDK
 * @param participantId - Optional participant ID (NULL = facilitator/solo)
 */
export async function saveMessages(
  sessionId: string,
  stepId: string,
  messages: UIMessage[],
  participantId?: string | null,
): Promise<void> {
  // Fetch existing messageIds for this session+step+participant
  const existingMessages = await db
    .select({ messageId: chatMessages.messageId })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatMessages.stepId, stepId),
        participantFilter(participantId),
      )
    );

  const existingMessageIds = new Set(
    existingMessages.map((m) => m.messageId)
  );

  // Filter to only new messages
  const newMessages = messages.filter(
    (msg) => !existingMessageIds.has(msg.id)
  );

  if (newMessages.length === 0) {
    return; // Nothing to insert
  }

  // Phase 62.2: AI SDK v6 generateMessageId on the server (see /api/chat route.ts)
  // ensures every assistant message reaches this site with a non-empty id. The
  // chat_messages_message_id_nonempty_chk CHECK constraint is the canary: if a
  // misconfiguration ever lets an empty id slip through, the insert will fail loudly
  // (surfacing as a 500/ERR_INCOMPLETE_CHUNKED_ENCODING) instead of being silently dropped.
  const rows = newMessages.map((msg) => {
    const textParts = msg.parts?.filter((part) => part.type === 'text') || [];
    const content = textParts.map((part) => part.text).join('\n');

    return {
      sessionId,
      stepId,
      messageId: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content,
      participantId: participantId || null,
    };
  });

  if (rows.length === 0) return;

  await db.insert(chatMessages).values(rows).onConflictDoNothing();
}

/**
 * Load messages from database for a given session and step
 *
 * @param sessionId - The session ID (ses_xxx)
 * @param stepId - The semantic step ID ('empathize', 'define', etc.)
 * @param participantId - Optional participant ID (NULL = facilitator/solo)
 * @returns Array of UIMessage objects in chronological order
 */
export async function loadMessages(
  sessionId: string,
  stepId: string,
  participantId?: string | null,
): Promise<UIMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatMessages.stepId, stepId),
        participantFilter(participantId),
      )
    )
    .orderBy(asc(chatMessages.createdAt));

  // Deduplicate by messageId — race between onFinish and useAutoSave can
  // insert the same message twice (no unique constraint on message_id)
  const seen = new Set<string>();
  const deduped = rows.filter((row) => {
    if (seen.has(row.messageId)) return false;
    seen.add(row.messageId);
    return true;
  });

  return deduped
    // Filter out messages with empty content (e.g. interrupted streams saved mid-flight)
    .filter((row) => row.content.trim().length > 0)
    .map((row) => ({
      id: row.messageId,
      role: row.role as 'user' | 'assistant' | 'system',
      parts: [{ type: 'text' as const, text: row.content }],
      createdAt: row.createdAt,
    }));
}

/**
 * Deterministic placeholder messageId for the greeting singleton DB lock.
 * MUST stay stable — it's the conflict key for the unique index.
 */
export function greetingPlaceholderMessageId(sessionId: string, stepId: string, participantId?: string | null): string {
  return `greeting:${sessionId}:${stepId}:${participantId ?? 'fac'}`;
}

/**
 * Try to claim the greeting slot by inserting an empty assistant placeholder.
 * Wins on insert, loses on conflict.
 * Returns { won: true, placeholderRowId, messageId } if we won (must stream + fill).
 * Returns { won: false, messageId } if we lost (must poll for winner's content).
 */
export async function claimGreetingPlaceholder(
  sessionId: string,
  stepId: string,
  participantId?: string | null,
): Promise<{ won: true; placeholderRowId: string; messageId: string } | { won: false; messageId: string }> {
  const messageId = greetingPlaceholderMessageId(sessionId, stepId, participantId);
  const inserted = await db
    .insert(chatMessages)
    .values({
      sessionId,
      stepId,
      messageId,
      role: 'assistant',
      content: '',
      participantId: participantId ?? null,
    })
    .onConflictDoNothing({
      target: [chatMessages.sessionId, chatMessages.stepId, chatMessages.participantId, chatMessages.messageId],
    })
    .returning({ id: chatMessages.id });

  if (inserted.length > 0) {
    return { won: true, placeholderRowId: inserted[0].id, messageId };
  }
  return { won: false, messageId };
}

/**
 * Winner fills the placeholder row with streamed content + final messageId.
 * Replaces the placeholder messageId so the row matches the streamed UIMessage.
 */
export async function fillGreetingPlaceholder(
  placeholderRowId: string,
  content: string,
  finalMessageId: string,
): Promise<void> {
  await db
    .update(chatMessages)
    .set({ content, messageId: finalMessageId })
    .where(eq(chatMessages.id, placeholderRowId));
}

/**
 * Race loser polls for the placeholder row to be filled (content non-empty).
 * Default budget: 30000ms total, 250ms intervals. Returns filled row or null on timeout.
 * On null, caller should run `deleteEmptyGreetingPlaceholder` then fall through to
 * fresh-generation, otherwise a slow-but-eventually-successful prefetch will fill the
 * placeholder AFTER the loser's fresh-gen finishes, producing a duplicate assistant row.
 *
 * Why 30s (vs the original 3s):
 * - The prefetch path (lib/ai/prefetch-greeting.ts) calls `generateText` which can take
 *   5-15s for a typical stakeholder-mapping greeting. With a 3s budget the loser
 *   reliably timed out (observed: ses_fcrjnajdicsoc1jvg53ikgo7 produced two rows
 *   1.94s apart, the second from the fall-through fresh-gen).
 * - The route has maxDuration=60, so 30s is half the request budget — leaves room for
 *   the fall-through fresh-gen if the prefetch genuinely died.
 */
export async function pollForFilledGreeting(
  sessionId: string,
  stepId: string,
  participantId: string | null | undefined,
  budgetMs: number = 30000,
  intervalMs: number = 250,
): Promise<StoredAssistantMessage | null> {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const rows = await db
      .select({ messageId: chatMessages.messageId, content: chatMessages.content })
      .from(chatMessages)
      .where(and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatMessages.stepId, stepId),
        eq(chatMessages.role, 'assistant'),
        participantFilter(participantId),
      ));
    const filled = rows.find((r) => r.content.trim().length > 0);
    if (filled) return { messageId: filled.messageId, content: filled.content };
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  return null;
}

/**
 * Atomically delete any empty assistant placeholder rows in this scope. Called by the
 * /api/chat fall-through path after `pollForFilledGreeting` times out — without this,
 * a slow prefetch can fill the placeholder AFTER the client's fresh-gen has already
 * written its own row, producing duplicate assistant messages with different message_ids
 * (different ids = the chat_messages unique constraint doesn't drop the second insert).
 *
 * WHERE content='' is atomic on a single row in Postgres, so the delete races safely:
 * - If the placeholder is still empty when delete fires → deleted → prefetch's later
 *   `fillGreetingPlaceholder` UPDATE matches 0 rows. No duplicate.
 * - If the prefetch filled the placeholder between our last poll check and our delete
 *   → content non-empty → delete matches 0 rows. Caller should re-poll once more before
 *   falling through to fresh-gen; if a filled row appears, replay it instead.
 *
 * Returns the count of rows deleted (0 or 1 in practice).
 */
export async function deleteEmptyGreetingPlaceholder(
  sessionId: string,
  stepId: string,
  participantId?: string | null,
): Promise<number> {
  const deleted = await db
    .delete(chatMessages)
    .where(and(
      eq(chatMessages.sessionId, sessionId),
      eq(chatMessages.stepId, stepId),
      eq(chatMessages.role, 'assistant'),
      eq(chatMessages.content, ''),
      participantFilter(participantId),
    ))
    .returning({ id: chatMessages.id });
  return deleted.length;
}

/**
 * Return the earliest non-empty assistant message for a scope, or null if
 * none exists.
 *
 * @deprecated Use claimGreetingPlaceholder + pollForFilledGreeting for
 * the DB-lock greeting singleton pattern (Plan B). This function remains
 * for any legacy callers outside /api/chat.
 */
export async function loadFirstAssistantMessage(
  sessionId: string,
  stepId: string,
  participantId?: string | null,
): Promise<StoredAssistantMessage | null> {
  const rows = await db
    .select({
      messageId: chatMessages.messageId,
      content: chatMessages.content,
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatMessages.stepId, stepId),
        eq(chatMessages.role, 'assistant'),
        participantFilter(participantId),
      )
    )
    .orderBy(asc(chatMessages.createdAt));

  const first = rows.find((r) => r.content.trim().length > 0);
  return first ? { messageId: first.messageId, content: first.content } : null;
}
