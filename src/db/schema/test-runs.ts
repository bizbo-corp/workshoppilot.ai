import { text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { v2 } from './pg-schema';
import { createPrefixedId } from '@/lib/ids';

export const TEST_RUN_STATUSES = ['queued', 'running', 'passed', 'failed', 'error'] as const;
export type TestRunStatus = (typeof TEST_RUN_STATUSES)[number];

/**
 * Random dummy workshops. `seed` makes the scenario reproducible; `scenario`
 * is the generated idea, idea type, persona and behaviour; `report` holds
 * per-stage checks, AI relevance scores and cost once the run ends.
 */
export const testRuns = v2.table(
  'test_runs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('trn')),
    seed: text('seed').notNull(),
    status: text('status', { enum: TEST_RUN_STATUSES }).notNull().default('queued'),
    scenario: jsonb('scenario').$type<Record<string, unknown>>().notNull().default({}),
    report: jsonb('report').$type<Record<string, unknown>>().notNull().default({}),
    workshopId: text('workshop_id'),
    triggeredBy: text('triggered_by').notNull().default('nightly'),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { mode: 'date', precision: 3 }),
  },
  (t) => [index('test_runs_created_idx').on(t.createdAt)],
);

export type TestRun = typeof testRuns.$inferSelect;
