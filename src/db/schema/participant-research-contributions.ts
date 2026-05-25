import { pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

/**
 * Participant Research Contributions
 *
 * Server-readable record of which participants have submitted their research for
 * a given step (Step 3 Fieldwork). The live roster lives in Liveblocks Storage
 * (in-room only); this table is what the dashboard and reminder emails read from
 * OUTSIDE the room. One row per (workshop, participant, step).
 */
export const participantResearchContributions = pgTable(
  'participant_research_contributions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('prc')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    /** sessionParticipant identity (matches sticky-note ownerId). */
    participantId: text('participant_id').notNull(),
    /** Semantic step id, e.g. 'user-research'. */
    stepId: text('step_id').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workshopStepIdx: index('prc_workshop_step_idx').on(table.workshopId, table.stepId),
    uniq: uniqueIndex('prc_workshop_participant_step_unique').on(
      table.workshopId,
      table.participantId,
      table.stepId,
    ),
  }),
);
