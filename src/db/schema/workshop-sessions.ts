import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

/**
 * Workshop Sessions table
 * Tracks the multiplayer collaboration lifecycle per workshop.
 * One session per workshop (status: waiting → active → ended).
 * Created when owner initiates a multiplayer workshop.
 */
export const workshopSessions = pgTable(
  'workshop_sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('wses')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    liveblocksRoomId: text('liveblocks_room_id').notNull(),
    shareToken: text('share_token').notNull().unique(),
    status: text('status', {
      enum: ['waiting', 'active', 'ended'],
    })
      .notNull()
      .default('waiting')
      .$type<'waiting' | 'active' | 'ended'>(),
    maxParticipants: integer('max_participants').notNull().default(5),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    startedAt: timestamp('started_at', { mode: 'date', precision: 3 }),
    endedAt: timestamp('ended_at', { mode: 'date', precision: 3 }),
  },
  (table) => ({
    workshopIdIdx: index('workshop_sessions_workshop_id_idx').on(table.workshopId),
    statusIdx: index('workshop_sessions_status_idx').on(table.status),
  })
);
