import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

/**
 * Sessions table
 * Lean timestamp-only session data linked to workshops
 * Write-once, close-once pattern - no updated_at needed
 */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('ses')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { mode: 'date', precision: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workshopIdIdx: index('sessions_workshop_id_idx').on(table.workshopId),
  })
);
