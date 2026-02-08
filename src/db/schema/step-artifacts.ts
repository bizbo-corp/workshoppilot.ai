import { pgTable, text, integer, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshopSteps } from './steps';

/**
 * Step Artifacts table
 * Stores structured JSON outputs per workshop step (persistent memory tier)
 *
 * Each workshop step produces a structured artifact (e.g., challenge statement,
 * stakeholder map, HMW statements) that flows forward as context to subsequent steps.
 * These artifacts are the "persistent memory" layer in the three-tier context system.
 *
 * Schema evolution: schemaVersion tracks artifact structure versions for future migrations.
 * Optimistic locking: version column prevents concurrent update conflicts.
 */
export const stepArtifacts = pgTable(
  'step_artifacts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('art')),
    workshopStepId: text('workshop_step_id')
      .notNull()
      .references(() => workshopSteps.id, { onDelete: 'cascade' }),
    stepId: text('step_id').notNull(), // Semantic IDs like 'challenge', 'stakeholder-mapping'
    artifact: jsonb('artifact')
      .notNull()
      .$type<Record<string, unknown>>(), // Placeholder until Phase 9 adds step-specific Zod schemas
    schemaVersion: text('schema_version')
      .notNull()
      .default('1.0'), // For future schema evolution
    extractedAt: timestamp('extracted_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    version: integer('version')
      .notNull()
      .default(1), // Optimistic locking
  },
  (table) => ({
    workshopStepIdIdx: index('step_artifacts_workshop_step_id_idx').on(table.workshopStepId),
    workshopStepIdUnique: unique('step_artifacts_workshop_step_id_unique').on(table.workshopStepId),
  })
);
