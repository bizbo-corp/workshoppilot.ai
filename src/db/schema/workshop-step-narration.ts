import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

/**
 * Workshop Step Narration
 *
 * One row per facilitator-driven AI message that participants need to be
 * aware of (journey-mapping row populated, persona generated, dip identified,
 * etc.). Drives the "workshop pulse" card in each participant's chat panel.
 *
 * Append-only. Latest row per (workshopId, stepId) is what participants see.
 * Wiped on step reset alongside chatMessages + stepArtifacts.
 *
 * Separate from chat_messages because:
 * - One narration row may summarize multiple chat exchanges
 * - Indexed query "latest narration for step X" is cheap
 * - Doesn't bloat the per-participant chat history
 */
export const workshopStepNarration = pgTable(
  'workshop_step_narration',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('narr')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    stepId: text('step_id').notNull(),
    /** Links to source chat_messages.id for dedupe — if the same AI message
     *  somehow triggers extraction twice, the upsert path can detect it. */
    messageId: text('message_id').notNull(),
    /** Cleaned narrative text shown to participants. Markup stripped server-side
     *  before insert; clients render as plain text / markdown. */
    content: text('content').notNull(),
    /** Extracted next-step prompt — e.g. "Move on to Goals", "Find the dip".
     *  Null when the AI message doesn't fit a known CTA pattern; pulse card
     *  falls back to a neutral default in that case. */
    cta: text('cta'),
    /** Step-specific position marker — for journey-mapping this is the current
     *  row id ('actions', 'goals', etc.). Used by the pulse card to render
     *  "Row 3/7 (Barriers)" style progress labels. */
    rowId: text('row_id'),
    /** Pre-formatted progress label like "Row 3/7 (Barriers)" — derived
     *  server-side from canvas state at extraction time. Stored rather than
     *  re-derived so the participant view doesn't need access to canvas. */
    progressLabel: text('progress_label'),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workshopStepCreatedIdx: index('workshop_step_narration_workshop_step_created_idx').on(
      table.workshopId,
      table.stepId,
      table.createdAt
    ),
  })
);
