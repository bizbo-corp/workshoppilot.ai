import { pgTable, text, integer, real, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

/**
 * Canvas Guides table
 * Stores instructional guide objects (stickers, notes, hints) that appear on step canvases.
 * Replaces the hardcoded STEP_CANVAS_GUIDES config with a DB-backed, admin-editable system.
 */
export const canvasGuides = pgTable(
  'canvas_guides',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('cg')),
    stepId: text('step_id').notNull(),
    title: text('title'),
    body: text('body').notNull(),
    variant: text('variant', {
      enum: ['sticker', 'note', 'hint', 'image', 'template-sticky-note', 'frame', 'arrow'],
    })
      .notNull()
      .default('sticker')
      .$type<'sticker' | 'note' | 'hint' | 'image' | 'template-sticky-note' | 'frame' | 'arrow'>(),
    color: text('color'),
    layer: text('layer', {
      enum: ['background', 'foreground'],
    })
      .notNull()
      .default('foreground')
      .$type<'background' | 'foreground'>(),
    placementMode: text('placement_mode', {
      enum: ['pinned', 'on-canvas'],
    })
      .notNull()
      .default('pinned')
      .$type<'pinned' | 'on-canvas'>(),
    pinnedPosition: text('pinned_position'),
    canvasX: integer('canvas_x'),
    canvasY: integer('canvas_y'),
    dismissBehavior: text('dismiss_behavior', {
      enum: ['auto-dismiss', 'hover-x', 'persistent'],
    })
      .notNull()
      .default('hover-x')
      .$type<'auto-dismiss' | 'hover-x' | 'persistent'>(),
    showOnlyWhenEmpty: boolean('show_only_when_empty').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    imageUrl: text('image_url'),
    imageSvg: text('image_svg'),
    width: integer('width'),
    height: integer('height'),
    rotation: integer('rotation'),
    imagePosition: text('image_position', {
      enum: ['before', 'above', 'below', 'after'],
    }).$type<'before' | 'above' | 'below' | 'after'>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('canvas_guides_step_id_idx').on(table.stepId),
    index('canvas_guides_step_sort_idx').on(table.stepId, table.sortOrder),
  ]
);
