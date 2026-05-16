import { pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';
import { sessionParticipants } from './session-participants';

/**
 * Workshop Invitations table (v2.1)
 * Records each email invitation the facilitator sends for a team workshop.
 * The inviteToken is the per-invitee URL secret (separate from workshop_sessions.shareToken,
 * which is the team-wide guest-join link). Once the invitee opens the link and joins,
 * the invitation is marked 'accepted' and linked to their sessionParticipants row.
 */
export const workshopInvitations = pgTable(
  'workshop_invitations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('inv')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    inviteToken: text('invite_token').notNull(),
    status: text('status', {
      enum: ['pending', 'accepted', 'declined', 'expired', 'revoked'],
    })
      .notNull()
      .default('pending')
      .$type<'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'>(),
    invitedByClerkUserId: text('invited_by_clerk_user_id').notNull(),
    invitedAt: timestamp('invited_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp('accepted_at', { mode: 'date', precision: 3 }),
    sessionParticipantId: text('session_participant_id').references(
      () => sessionParticipants.id,
      { onDelete: 'set null' }
    ),
    // Resend send observability (added after a silent failure: an invite row was
    // created but the email never arrived, with no DB trace of the rejection).
    // resendMessageId is populated when Resend accepts the send; lastSendError
    // captures the Resend error message when it doesn't. lastSendAt always stamps
    // the most recent attempt regardless of outcome.
    resendMessageId: text('resend_message_id'),
    lastSendError: text('last_send_error'),
    lastSendAt: timestamp('last_send_at', { mode: 'date', precision: 3 }),
  },
  (table) => ({
    workshopIdIdx: index('workshop_invitations_workshop_id_idx').on(table.workshopId),
    tokenIdx: uniqueIndex('workshop_invitations_token_idx').on(table.inviteToken),
    // Prevent duplicate pending invites for the same workshop+email (case-insensitive)
    workshopEmailUnique: uniqueIndex('workshop_invitations_workshop_email_unique').on(
      table.workshopId,
      sql`lower(${table.email})`
    ),
  })
);
