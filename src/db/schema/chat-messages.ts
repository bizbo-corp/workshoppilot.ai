import { pgTable, text, timestamp, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
    participantId: text('participant_id'), // NULL = facilitator/solo (backward compatible)
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionStepIdx: index('chat_messages_session_step_idx').on(
      table.sessionId,
      table.stepId
    ),
    sessionStepParticipantIdx: index('chat_messages_session_step_participant_idx').on(
      table.sessionId,
      table.stepId,
      table.participantId
    ),
    messageIdUniq: uniqueIndex('chat_messages_session_step_participant_message_uniq').on(
      table.sessionId,
      table.stepId,
      table.participantId,
      table.messageId
    ),
    messageIdNonempty: check(
      'chat_messages_message_id_nonempty_chk',
      sql`length(${table.messageId}) > 0`
    ),
  })
);
