import { pgTable, text, real, integer, timestamp } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

/**
 * Step Canvas Settings table
 * Stores default viewport (zoom + pan) per step so all users see the same initial view.
 */
export const stepCanvasSettings = pgTable('step_canvas_settings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createPrefixedId('scs')),
  stepId: text('step_id').notNull().unique(),
  defaultZoom: real('default_zoom').notNull().default(1),
  defaultX: integer('default_x').notNull().default(0),
  defaultY: integer('default_y').notNull().default(0),
  viewportMode: text('viewport_mode', {
    enum: ['absolute', 'center-offset'],
  })
    .notNull()
    .default('center-offset')
    .$type<'absolute' | 'center-offset'>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
