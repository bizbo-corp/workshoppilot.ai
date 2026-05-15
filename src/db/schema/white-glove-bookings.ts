import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

/**
 * White Glove Bookings table
 * Captures post-purchase scheduling intent for the White Glove tier ($1,499).
 * MVP: simple intake form that emails support; real Cal.com/Calendly integration deferred.
 */
export const whiteGloveBookings = pgTable(
  'white_glove_bookings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('wgb')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    clerkUserId: text('clerk_user_id').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    preferredTimes: text('preferred_times').notNull(),
    timezone: text('timezone').notNull(),
    notes: text('notes'),
    status: text('status', {
      enum: ['requested', 'scheduled', 'completed', 'cancelled'],
    })
      .notNull()
      .default('requested')
      .$type<'requested' | 'scheduled' | 'completed' | 'cancelled'>(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workshopIdIdx: index('white_glove_bookings_workshop_id_idx').on(table.workshopId),
    clerkUserIdIdx: index('white_glove_bookings_clerk_user_id_idx').on(table.clerkUserId),
    statusIdx: index('white_glove_bookings_status_idx').on(table.status),
  })
);
