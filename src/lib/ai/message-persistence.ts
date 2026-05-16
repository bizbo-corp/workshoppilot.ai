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

  // Insert new messages. Filter rows with empty messageId — AI SDK v5 generates
  // assistant message ids client-side, so the server's onFinish often sees msg.id===''
  // for new assistant messages. The client's autoSaveMessages writes those with the
  // proper id once the stream completes. Without this filter, the chat_messages
  // CHECK constraint (length(message_id) > 0) rejects the insert and onFinish throws,
  // surfacing as a 500 / ERR_INCOMPLETE_CHUNKED_ENCODING on the client.
  const rows = newMessages
    .map((msg) => {
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
    })
    .filter((row) => row.messageId.length > 0);

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
 * Default budget: 3000ms total, 100ms intervals. Returns filled row or null on timeout.
 * On null, caller should fall through to fresh-generation path.
 */
export async function pollForFilledGreeting(
  sessionId: string,
  stepId: string,
  participantId: string | null | undefined,
  budgetMs: number = 3000,
  intervalMs: number = 100,
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
