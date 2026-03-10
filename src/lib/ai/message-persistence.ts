import { db } from '@/db/client';
import { chatMessages } from '@/db/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';
import type { UIMessage } from 'ai';

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

  // Insert new messages
  const rows = newMessages.map((msg) => {
    // Extract text content from parts
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
