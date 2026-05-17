'use server';

import { db } from '@/db/client';
import { chatMessages } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { UIMessage } from 'ai';
import { loadMessages } from '@/lib/ai/message-persistence';

/**
 * Auto-save messages to database for a given session and step
 * Uses deduplication logic to avoid inserting duplicate messages
 * Failures are logged but do not throw (auto-save should be silent)
 *
 * @param sessionId - The session ID (ses_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param messages - Array of UIMessage objects from AI SDK
 * @param participantId - Optional participant ID (NULL = facilitator/solo)
 */
export async function autoSaveMessages(
  sessionId: string,
  stepId: string,
  messages: UIMessage[],
  participantId?: string | null,
): Promise<void> {
  try {
    // Fetch existing messageIds for this session+step+participant
    const participantWhere = participantId
      ? eq(chatMessages.participantId, participantId)
      : isNull(chatMessages.participantId);

    const existingMessages = await db
      .select({ messageId: chatMessages.messageId })
      .from(chatMessages)
      .where(
        and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.stepId, stepId), participantWhere)
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

    // Insert new messages, skipping any with empty content (e.g. mid-stream snapshots)
    const rows = newMessages
      .map((msg) => {
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
      })
      .filter((row) => row.content.trim().length > 0)
      .filter((row) => row.messageId.length > 0);

    if (rows.length === 0) return;

    await db.insert(chatMessages).values(rows).onConflictDoNothing();
  } catch (error) {
    // Auto-save failures should be silent to avoid disrupting user experience
    console.error('Auto-save failed:', error);
  }
}

/**
 * Refetch persisted messages for a scope. Called by the client as a recovery path
 * when the AI SDK stream completes without delivering the assistant message to
 * client state (server logs show onFinish:filled-placeholder with content, but
 * `useChat`'s messages array never gets the assistant row). The greeting IS in
 * the DB at this point — this lets the client pull it without a full page reload.
 *
 * Returns the same shape `loadMessages` returns, deduped + empty-filtered.
 */
export async function refetchStepMessages(
  sessionId: string,
  stepId: string,
  participantId?: string | null,
): Promise<UIMessage[]> {
  return loadMessages(sessionId, stepId, participantId);
}
