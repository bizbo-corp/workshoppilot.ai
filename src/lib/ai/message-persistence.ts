import { db } from '@/db/client';
import { chatMessages } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { UIMessage } from 'ai';

/**
 * Save messages to database for a given session and step
 * Uses a transaction to avoid duplicates by comparing with existing messageIds
 *
 * @param sessionId - The session ID (ses_xxx)
 * @param stepId - The semantic step ID ('empathize', 'define', etc.)
 * @param messages - Array of UIMessage objects from AI SDK
 */
export async function saveMessages(
  sessionId: string,
  stepId: string,
  messages: UIMessage[]
): Promise<void> {
  // Fetch existing messageIds for this session+step
  const existingMessages = await db
    .select({ messageId: chatMessages.messageId })
    .from(chatMessages)
    .where(
      and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.stepId, stepId))
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
    };
  });

  await db.insert(chatMessages).values(rows).onConflictDoNothing();
}

/**
 * Load messages from database for a given session and step
 *
 * @param sessionId - The session ID (ses_xxx)
 * @param stepId - The semantic step ID ('empathize', 'define', etc.)
 * @returns Array of UIMessage objects in chronological order
 */
export async function loadMessages(
  sessionId: string,
  stepId: string
): Promise<UIMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.stepId, stepId))
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

  return deduped.map((row) => ({
    id: row.messageId,
    role: row.role as 'user' | 'assistant' | 'system',
    parts: [{ type: 'text' as const, text: row.content }],
    createdAt: row.createdAt,
  }));
}
