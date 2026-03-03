import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

/**
 * Dialogue Feedback table
 * Stores admin critiques of specific dialogue points in the AI facilitation flow.
 * Each entry captures the exact location in code (technical marker) and the
 * application state at the time of feedback (context snapshot), enabling
 * targeted dialogue optimization in future sessions.
 */
export const dialogueFeedback = pgTable(
  'dialogue_feedback',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('df')),

    /** The admin's critique of the dialogue */
    feedbackText: text('feedback_text').notNull(),

    /** Semantic step ID where the dialogue occurred (e.g. 'challenge', 'stakeholder-mapping') */
    dialogueStepId: text('dialogue_step_id').notNull(),

    /** Arc phase at the time of feedback (orient, gather, synthesize, refine, validate, complete) */
    arcPhase: text('arc_phase'),

    /** File path where the dialogue is rendered or the prompt is defined */
    filePath: text('file_path').notNull(),

    /** Component or function name responsible for rendering the dialogue */
    componentName: text('component_name').notNull(),

    /**
     * Snapshot of the application context at the time of feedback.
     * Includes: stepId, arcPhase, workshopId, systemPromptExcerpt,
     * canvasContext, persistentContext, summaries, and any other
     * local state active when the admin triggered the feedback.
     */
    contextSnapshot: jsonb('context_snapshot')
      .notNull()
      .$type<Record<string, unknown>>(),

    /** pending = needs attention, resolved = addressed in a code change */
    status: text('status', {
      enum: ['pending', 'resolved'],
    })
      .notNull()
      .default('pending')
      .$type<'pending' | 'resolved'>(),

    /** Optional note added when resolving (e.g. commit hash or description of fix) */
    resolutionNote: text('resolution_note'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('dialogue_feedback_status_idx').on(table.status),
    index('dialogue_feedback_step_idx').on(table.dialogueStepId),
  ]
);
