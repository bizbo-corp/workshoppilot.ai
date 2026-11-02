import { text, integer, real, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { v2 } from './pg-schema';
import { createPrefixedId } from '@/lib/ids';

/**
 * One row per model call, whatever the job. This is the usage ledger the
 * admin margin view and the cost gates read from: cost in US cents next to
 * the credits charged for it.
 */
export const aiCalls = v2.table(
  'ai_calls',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('aic')),
    workshopId: text('workshop_id'),
    userId: text('user_id'),
    /** Job name from src/lib/ai/jobs.ts, e.g. 'facilitate', 'verdict'. */
    job: text('job').notNull(),
    /** Gateway model id actually used, e.g. 'google/gemini-2.5-flash-lite'. */
    model: text('model').notNull(),
    inputTokens: integer('input_tokens'),
    cachedInputTokens: integer('cached_input_tokens'),
    outputTokens: integer('output_tokens'),
    imageCount: integer('image_count'),
    costCents: real('cost_cents').notNull().default(0),
    creditsCharged: integer('credits_charged').notNull().default(0),
    durationMs: integer('duration_ms'),
    ok: boolean('ok').notNull().default(true),
    error: text('error'),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    index('ai_calls_workshop_idx').on(t.workshopId),
    index('ai_calls_user_idx').on(t.userId, t.createdAt),
    index('ai_calls_job_idx').on(t.job, t.createdAt),
  ],
);

export type AiCall = typeof aiCalls.$inferSelect;
