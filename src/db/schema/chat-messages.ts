import { pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { sessions } from './sessions';

/**
 * Chat Messages table
 * Stores AI chat conversation history scoped by session and step
 *
 * Note: stepId stores semantic step identifiers ('empathize', 'define', etc.)
 * NOT foreign key references to workshop_steps.id. This simplifies querying
 * and avoids the need to look up workshopStep records for every message.
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('msg')),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    stepId: text('step_id').notNull(), // Semantic IDs like 'empathize', 'define'
    messageId: text('message_id').notNull(), // UIMessage.id from AI SDK for deduplication
    role: text('role', { enum: ['user', 'assistant', 'system'] })
      .notNull()
      .$type<'user' | 'assistant' | 'system'>(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionStepIdx: index('chat_messages_session_step_idx').on(
      table.sessionId,
      table.stepId
    ),
    messageIdUniq: uniqueIndex('chat_messages_session_step_message_uniq').on(
      table.sessionId,
      table.stepId,
      table.messageId
    ),
  })
);
