import { pgTable, text, timestamp, jsonb, index, boolean } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { sessions } from './sessions';

/**
 * Chat Request Logs table
 * Captures the verbatim rendered system prompt + model messages for every
 * /api/chat fresh-generation request. Enables admin diagnosis of "the AI said
 * something weird" reports without manually reconstructing prompts in dev.
 *
 * Scope: fresh-generation only. Replay logging (greeting singleton race-losers)
 * is owned exclusively by Plan B's new race-loser polling path.
 *
 * TTL cleanup: deferred to a follow-up cron job. Data accumulation at current
 * usage rates is benign for weeks-to-months.
 */
export const chatRequestLogs = pgTable(
  'chat_request_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => createPrefixedId('crl')),
    sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    stepId: text('step_id').notNull(),
    participantId: text('participant_id'), // NULL = facilitator
    workshopId: text('workshop_id').notNull(),
    requestId: text('request_id').notNull(),                  // crypto.randomUUID() per request
    systemPromptSha: text('system_prompt_sha').notNull(),     // sha256 hex digest
    systemPrompt: text('system_prompt').notNull(),            // verbatim
    modelMessagesJson: jsonb('model_messages_json').notNull(), // convertToModelMessages output
    responseMessageId: text('response_message_id'),            // null if request errored before response
    isReplay: boolean('is_replay').notNull().default(false),   // true for greeting-singleton replay (set by Plan B's race-loser path)
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    scopeIdx: index('chat_request_logs_scope_idx').on(table.sessionId, table.stepId, table.participantId, table.createdAt),
    requestIdIdx: index('chat_request_logs_request_id_idx').on(table.requestId),
    createdAtIdx: index('chat_request_logs_created_at_idx').on(table.createdAt),
  })
);
