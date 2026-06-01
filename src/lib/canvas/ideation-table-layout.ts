/**
 * Fixed-geometry table layout for the Ideation step.
 *
 * The ideation canvas is a TABLE, not a set of auto-sizing lanes:
 *   - columns  = participants (one column per owner; a single column in solo mode)
 *   - rows     = activities (Row 1 = mind map, Row 2 = Crazy 8s)
 *   - bottom   = a shared voting/convergence row spanning all columns, centered
 *
 * Every dimension here is FIXED. Cells do NOT grow from their content — moving a
 * node inside a cell must never change the cell's size or shift its neighbours, so
 * adjacent columns stay edge-aligned (the empathy-map feel). Content that overflows
 * a cell simply overflows visually into the surrounding canvas; we never reflow.
 *
 * Coordinates are STORE-relative: a participant's mind-map root sits at (0,0) and the
 * per-column horizontal offset is applied at render time (see `ownerOffsets` in
 * mind-map-canvas.tsx). Vertical values are absolute store Y.
 */

import { CRAZY_8S_NODE_WIDTH } from '@/components/canvas/crazy-8s-group-node';

/** Internal padding between a cell's content and the column (owner-zone) border. */
export const IDEATION_CELL_PADDING = 120;

/**
 * Fixed content width of a column (mind map + Crazy 8s share it).
 * Generous enough to hold the 900-wide Crazy 8s grid and a 1–2 level radial mind map
 * without clipping; deeper maps overflow into the canvas (accepted trade-off).
 */
export const IDEATION_CELL_WIDTH = Math.max(1400, CRAZY_8S_NODE_WIDTH + 2 * IDEATION_CELL_PADDING);

/**
 * Center-to-center distance between adjacent columns. Equals the full column-frame
 * width (content + padding on both sides), so column frames abut edge-to-edge and
 * read as a solid table rather than separate cards.
 */
export const IDEATION_COLUMN_PITCH = IDEATION_CELL_WIDTH + 2 * IDEATION_CELL_PADDING;

/**
 * Mind-map (Row 1) vertical span, store-relative. Matches the historical default
 * phase-1 extents so the visual footprint is unchanged — only now it's fixed.
 */
export const IDEATION_MIND_MAP_TOP = -548;
export const IDEATION_MIND_MAP_HEIGHT = 1400;
export const IDEATION_MIND_MAP_BOTTOM = IDEATION_MIND_MAP_TOP + IDEATION_MIND_MAP_HEIGHT;

/**
 * Horizontal center (store X offset) of each column, symmetric about 0.
 * Single column (solo / one participant) is centered at 0.
 */
export function computeColumnCenters(count: number): number[] {
  if (count <= 1) return [0];
  const total = (count - 1) * IDEATION_COLUMN_PITCH;
  return Array.from({ length: count }, (_, i) => i * IDEATION_COLUMN_PITCH - total / 2);
}

/** Fixed store-relative bounds of a single column's mind-map cell (pre-offset). */
export function mindMapCellBounds() {
  return {
    minX: -IDEATION_CELL_WIDTH / 2,
    maxX: IDEATION_CELL_WIDTH / 2,
    minY: IDEATION_MIND_MAP_TOP,
    maxY: IDEATION_MIND_MAP_BOTTOM,
  };
}
