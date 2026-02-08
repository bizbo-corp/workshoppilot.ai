import { pgTable, text, integer, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshopSteps } from './steps';

/**
 * Step Summaries table
 * Stores AI-generated conversation summaries per workshop step (long-term memory tier)
 *
 * After each step completes, the AI generates a concise summary of the conversation
 * that flows forward as context to subsequent steps. This is the "long-term memory"
 * layer in the three-tier context system (short-term = verbatim messages, long-term =
 * summaries, persistent = structured artifacts).
 *
 * Token count is tracked for context budget monitoring and compression decisions.
 */
export const stepSummaries = pgTable(
  'step_summaries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('sum')),
    workshopStepId: text('workshop_step_id')
      .notNull()
      .references(() => workshopSteps.id, { onDelete: 'cascade' }),
    stepId: text('step_id').notNull(), // Semantic IDs like 'challenge', 'stakeholder-mapping'
    summary: text('summary').notNull(),
    tokenCount: integer('token_count'), // Nullable, for monitoring context budget
    generatedAt: timestamp('generated_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workshopStepIdIdx: index('step_summaries_workshop_step_id_idx').on(table.workshopStepId),
    workshopStepIdUnique: unique('step_summaries_workshop_step_id_unique').on(table.workshopStepId),
  })
);
