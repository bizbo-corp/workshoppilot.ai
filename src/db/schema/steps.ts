import { pgTable, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

/**
 * Step Definitions table
 * Reference data for the 10 design thinking steps
 * Uses semantic string IDs (e.g., 'empathize', 'define'), not generated cuid2
 */
export const stepDefinitions = pgTable('step_definitions', {
  id: text('id').primaryKey(), // Semantic IDs like 'empathize', 'define'
  order: integer('order').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  promptTemplate: text('prompt_template'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Workshop Steps table
 * Tracks per-workshop progress through the 10 design thinking steps
 */
export const workshopSteps = pgTable(
  'workshop_steps',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('wst')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    stepId: text('step_id')
      .notNull()
      .references(() => stepDefinitions.id),
    status: text('status', {
      enum: ['not_started', 'in_progress', 'complete'],
    })
      .notNull()
      .default('not_started')
      .$type<'not_started' | 'in_progress' | 'complete'>(),
    output: jsonb('output').$type<Record<string, unknown>>(),
    startedAt: timestamp('started_at', { mode: 'date', precision: 3 }),
    completedAt: timestamp('completed_at', { mode: 'date', precision: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    workshopIdIdx: index('workshop_steps_workshop_id_idx').on(table.workshopId),
    stepIdIdx: index('workshop_steps_step_id_idx').on(table.stepId),
    statusIdx: index('workshop_steps_status_idx').on(table.status),
  })
);
