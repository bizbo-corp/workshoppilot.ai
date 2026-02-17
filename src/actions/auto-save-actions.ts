'use server';

import { db } from '@/db/client';
import { chatMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { UIMessage } from 'ai';

/**
 * Auto-save messages to database for a given session and step
 * Uses deduplication logic to avoid inserting duplicate messages
 * Failures are logged but do not throw (auto-save should be silent)
 *
 * @param sessionId - The session ID (ses_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param messages - Array of UIMessage objects from AI SDK
 */
export async function autoSaveMessages(
  sessionId: string,
  stepId: string,
  messages: UIMessage[]
): Promise<void> {
  try {
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
        };
      })
      .filter((row) => row.content.trim().length > 0);

    await db.insert(chatMessages).values(rows).onConflictDoNothing();
  } catch (error) {
    // Auto-save failures should be silent to avoid disrupting user experience
    console.error('Auto-save failed:', error);
  }
}
