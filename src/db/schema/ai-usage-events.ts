import { pgTable, text, integer, real, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

/**
 * AI Usage Events table
 * Tracks token usage and cost for every AI call across all routes.
 *
 * Each row represents a single AI invocation (chat, extraction, image generation, etc.)
 * with token counts and computed cost in US cents.
 */
export const aiUsageEvents = pgTable(
  'ai_usage_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('aiu')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    stepId: text('step_id'), // nullable (image gen may lack step context)
    operation: text('operation').notNull(), // 'chat' | 'extract' | 'generate-concept' | etc.
    model: text('model').notNull(), // 'gemini-2.0-flash' | 'imagen-4.0-fast-generate-001'
    inputTokens: integer('input_tokens'), // nullable (null for image gen)
    outputTokens: integer('output_tokens'), // nullable (null for image gen)
    imageCount: integer('image_count'), // nullable (for image gen only)
    costCents: real('cost_cents').notNull(), // cost in US cents
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workshopIdIdx: index('ai_usage_events_workshop_id_idx').on(table.workshopId),
    createdAtIdx: index('ai_usage_events_created_at_idx').on(table.createdAt),
  })
);
