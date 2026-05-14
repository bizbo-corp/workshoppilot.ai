import { pgTable, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';
import { sessionParticipants } from './session-participants';

/**
 * Challenge Approvals table (v2.1)
 * Tracks per-participant approval of the workshop challenge statement in team-mode workshops.
 * Status transitions:
 *   pending          → participant has not responded yet
 *   approved         → participant is aligned with the challenge; they can enter Step 2+
 *   change_requested → participant submitted a change request to the facilitator; they wait
 *
 * challengeRevision mirrors workshops.challengeRevision. If the facilitator republishes,
 * the workshop's revision is incremented and all approvals.status reset to 'pending',
 * forcing participants back to the review screen.
 */
export const challengeApprovals = pgTable(
  'challenge_approvals',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('chap')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    sessionParticipantId: text('session_participant_id')
      .notNull()
      .references(() => sessionParticipants.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['pending', 'approved', 'change_requested'],
    })
      .notNull()
      .default('pending')
      .$type<'pending' | 'approved' | 'change_requested'>(),
    changeRequestNote: text('change_request_note'),
    challengeRevision: integer('challenge_revision').notNull().default(1),
    respondedAt: timestamp('responded_at', { mode: 'date', precision: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    workshopIdIdx: index('challenge_approvals_workshop_id_idx').on(table.workshopId),
    uniqPerParticipant: uniqueIndex('challenge_approvals_workshop_participant_unique').on(
      table.workshopId,
      table.sessionParticipantId
    ),
  })
);
