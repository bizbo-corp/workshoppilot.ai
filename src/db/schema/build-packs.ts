import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

/**
 * Build Packs table
 * Generated output artifacts from completed workshops
 * Content is assembled from CURRENT step outputs at generation time (not snapshots)
 */
export const buildPacks = pgTable(
  'build_packs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('bp')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    formatType: text('format_type', {
      enum: ['markdown', 'pdf', 'json'],
    })
      .notNull()
      .default('markdown')
      .$type<'markdown' | 'pdf' | 'json'>(),
    content: text('content'), // Assembled from step outputs at generation time
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    workshopIdIdx: index('build_packs_workshop_id_idx').on(table.workshopId),
  })
);
