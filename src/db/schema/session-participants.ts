import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshopSessions } from './workshop-sessions';

/**
 * Session Participants table
 * Tracks each participant in a multiplayer workshop session.
 * All participants are Clerk-authenticated; `clerkUserId` is nullable only for
 * legacy rows created before auth was required. Identity is keyed on
 * (sessionId, clerkUserId) — see the partial unique index below.
 */
export const sessionParticipants = pgTable(
  'session_participants',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('spar')),
    sessionId: text('session_id')
      .notNull()
      .references(() => workshopSessions.id, { onDelete: 'cascade' }),
    // Nullable only for legacy guest rows; new participants always set it.
    clerkUserId: text('clerk_user_id'),
    // ID used in Liveblocks prepareSession: the Clerk userId for all current
    // participants. Legacy rows may carry a prefixed `guest_` CUID2.
    liveblocksUserId: text('liveblocks_user_id').notNull(),
    displayName: text('display_name').notNull(),
    // Assigned deterministically per session slot (hex)
    color: text('color').notNull(),
    role: text('role', {
      enum: ['owner', 'participant'],
    })
      .notNull()
      .default('participant')
      .$type<'owner' | 'participant'>(),
    status: text('status', {
      enum: ['active', 'away', 'removed'],
    })
      .notNull()
      .default('active')
      .$type<'active' | 'away' | 'removed'>(),
    joinedAt: timestamp('joined_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    // Updated on Liveblocks presence events; 'away' triggered after ~30-60s of inactivity
    lastSeenAt: timestamp('last_seen_at', { mode: 'date', precision: 3 }),
    // Per-participant token for cross-device/browser rejoin via URL param (?r=TOKEN)
    rejoinToken: text('rejoin_token'),
  },
  (table) => ({
    sessionIdIdx: index('session_participants_session_id_idx').on(table.sessionId),
    clerkUserIdIdx: index('session_participants_clerk_user_id_idx').on(table.clerkUserId),
    liveblocksUserIdIdx: index('session_participants_liveblocks_user_id_idx').on(
      table.liveblocksUserId
    ),
    rejoinTokenIdx: uniqueIndex('session_participants_rejoin_token_idx').on(table.rejoinToken),
    // One participant row per Clerk identity per session. Partial so legacy
    // guest rows (clerkUserId NULL) are excluded and never collide.
    sessionClerkUnique: uniqueIndex('session_participants_session_clerk_unique')
      .on(table.sessionId, table.clerkUserId)
      .where(sql`${table.clerkUserId} IS NOT NULL`),
  })
);
