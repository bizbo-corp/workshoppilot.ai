/**
 * Pack Layout Module
 *
 * Pure, deterministic layout for auto-generated sticky notes in bounded
 * container steps (empathy map zones, journey-map grid cells).
 *
 * Goals (see the "clean placement once" decision):
 *   1. Generated notes never overlap — packed using their REAL (locked) sizes.
 *   2. Containers grow horizontally + vertically to fit their content.
 *   3. Containers in the same row/column stay aligned (shared edges) when one
 *      cell gets more notes than its neighbours.
 *
 * The same functions run at two moments and MUST agree:
 *   - generation time: compute note positions (then the notes are persisted with
 *     those positions + locked sizes).
 *   - render time: re-derive container bounds from the persisted notes (sizes +
 *     grouping + array order are identical, so the layout reproduces exactly).
 *
 * Everything here operates on items that already carry width/height — size
 * estimation lives in canvas-position.ts, so this module has no dependency on
 * it (avoids an import cycle).
 */

import type { EmpathyZone } from './empathy-zones';
import { getCellBounds, type GridConfig } from './grid-layout';

export type PackItem = { id: string; width: number; height: number };
type PackedPos = { id: string; x: number; y: number };
type Box = { width: number; height: number };

/** Minimal sticky-note shape needed to derive container bounds at render time. */
export type LayoutNote = {
  id: string;
  width: number;
  height: number;
  type?: string;
  isPreview?: boolean;
  cellAssignment?: { row: string; col: string };
};

/** Real (placeable) notes only — skip group containers and transient previews. */
function placeableNotes(notes: LayoutNote[]): LayoutNote[] {
  return notes.filter(
    (p) => (!p.type || p.type === 'stickyNote') && !p.isPreview,
  );
}

/** Uniform width for empathy-zone notes — uniform width keeps columns aligned. */
export const EMPATHY_NOTE_WIDTH = 200;

// --- Empathy zone grid topology (matches the static config visual layout) ---
const EMPATHY_GRID: EmpathyZone[][] = [
  ['says', 'thinks', 'pains'],
  ['feels', 'does', 'gains'],
];
/** Top-left anchor of the zone grid (says top-left), kept stable as it grows. */
const EMPATHY_ORIGIN = { x: -560, y: -860 };
const EMPATHY_GAP = 20; // gap between zones
const ZONE_PADDING = 16; // inner padding inside a zone
const ZONE_HEADER = 40; // reserved for the zone label header
const ZONE_NOTE_GAP = 12; // gap between notes inside a zone
/** Minimum (default) zone box sizes per grid column / row. */
const MIN_COL_WIDTH = [520, 520, 340];
const MIN_ROW_HEIGHT = [420, 420];

/** Gap between stacked notes inside a journey-map grid cell. */
const GRID_NOTE_GAP = 10;

/**
 * Pack items into `columns` columns at origin (0,0), top-left aligned.
 * Items are assigned round-robin by index; each column is as wide as its widest
 * item and notes stack vertically within it. Returns positions relative to the
 * container's top-left plus the resulting content box (incl. padding + header).
 */
function measurePack(
  items: PackItem[],
  opts: { columns: number; gap: number; padding: number; headerHeight: number },
): { positions: PackedPos[]; box: Box } {
  const { gap, padding, headerHeight } = opts;
  const columns = Math.max(1, opts.columns);

  if (items.length === 0) {
    return { positions: [], box: { width: 0, height: 0 } };
  }

  // Assign items to columns round-robin.
  const colItems: PackItem[][] = Array.from({ length: columns }, () => []);
  items.forEach((it, i) => colItems[i % columns].push(it));

  // Column widths = widest item in the column.
  const colWidth = colItems.map((col) =>
    col.reduce((m, it) => Math.max(m, it.width), 0),
  );

  // Column x offsets (skip width contribution of empty columns).
  const colX: number[] = [];
  let cx = padding;
  for (let c = 0; c < columns; c++) {
    colX.push(cx);
    if (colWidth[c] > 0) cx += colWidth[c] + gap;
  }

  const startY = padding + headerHeight;
  const positions: PackedPos[] = [];
  const colHeight: number[] = new Array(columns).fill(0);

  for (let c = 0; c < columns; c++) {
    let y = startY;
    for (const it of colItems[c]) {
      positions.push({ id: it.id, x: colX[c], y });
      y += it.height + gap;
    }
    colHeight[c] = colItems[c].length > 0 ? y - startY - gap : 0;
  }

  const usedCols = colWidth.filter((w) => w > 0).length;
  const contentW =
    colWidth.reduce((s, w) => s + w, 0) + Math.max(0, usedCols - 1) * gap;
  const contentH = colHeight.reduce((m, h) => Math.max(m, h), 0);

  return {
    positions,
    box: {
      width: padding * 2 + contentW,
      height: padding * 2 + headerHeight + contentH,
    },
  };
}

/** Column count for a zone given how many notes it holds. */
function zoneColumns(zone: EmpathyZone, count: number): number {
  if (count <= 1) return 1;
  if (zone === 'pains' || zone === 'gains') return count > 6 ? 2 : 1;
  return count > 8 ? 3 : 2;
}

export type EmpathyZoneBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EmpathyLayout = {
  /** Final bounds per zone (aligned grid). */
  bounds: Record<EmpathyZone, EmpathyZoneBounds>;
  /** Absolute canvas position per note id. */
  positions: Map<string, { x: number; y: number }>;
};

/**
 * Lay out all six empathy zones: pack each zone, then size the 2×3 zone grid so
 * every column shares a width and every row shares a height (alignment), and
 * place notes within their final boxes.
 */
export function layoutEmpathy(
  notesByZone: Record<EmpathyZone, PackItem[]>,
): EmpathyLayout {
  // 1. Measure each zone's packed content.
  const measured = {} as Record<
    EmpathyZone,
    { positions: PackedPos[]; box: Box }
  >;
  (Object.keys(notesByZone) as EmpathyZone[]).forEach((zone) => {
    const items = notesByZone[zone] ?? [];
    measured[zone] = measurePack(items, {
      columns: zoneColumns(zone, items.length),
      gap: ZONE_NOTE_GAP,
      padding: ZONE_PADDING,
      headerHeight: ZONE_HEADER,
    });
  });

  // 2. Column widths (max across the two zones in each column) and row heights.
  const colWidth = [0, 1, 2].map((c) =>
    Math.max(
      MIN_COL_WIDTH[c],
      ...EMPATHY_GRID.map((row) => measured[row[c]].box.width),
    ),
  );
  const rowHeight = [0, 1].map((r) =>
    Math.max(
      MIN_ROW_HEIGHT[r],
      ...EMPATHY_GRID[r].map((zone) => measured[zone].box.height),
    ),
  );

  // 3. Grid origins (cumulative widths/heights + gaps).
  const colX = [EMPATHY_ORIGIN.x, 0, 0];
  for (let c = 1; c < 3; c++) colX[c] = colX[c - 1] + colWidth[c - 1] + EMPATHY_GAP;
  const rowY = [EMPATHY_ORIGIN.y, 0];
  for (let r = 1; r < 2; r++) rowY[r] = rowY[r - 1] + rowHeight[r - 1] + EMPATHY_GAP;

  // 4. Assemble bounds + absolute note positions.
  const bounds = {} as Record<EmpathyZone, EmpathyZoneBounds>;
  const positions = new Map<string, { x: number; y: number }>();
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const zone = EMPATHY_GRID[r][c];
      bounds[zone] = {
        x: colX[c],
        y: rowY[r],
        width: colWidth[c],
        height: rowHeight[r],
      };
      for (const p of measured[zone].positions) {
        positions.set(p.id, { x: colX[c] + p.x, y: rowY[r] + p.y });
      }
    }
  }

  return { bounds, positions };
}

export type GridLayout = {
  /** Grown height per row id (>= the configured minimum). */
  rowHeights: Record<string, number>;
  /** Absolute canvas position per note id. */
  positions: Map<string, { x: number; y: number }>;
};

/** Build the `${rowId}::${colId}` key used to group notes into grid cells. */
export function cellKey(rowId: string, colId: string): string {
  return `${rowId}::${colId}`;
}

/**
 * Lay out journey-map grid cells: within each cell notes stack in a single
 * column; each row grows to fit its tallest cell (row alignment); columns keep
 * their (user-managed) widths.
 */
export function layoutGrid(
  notesByCell: Map<string, PackItem[]>,
  gridConfig: GridConfig,
): GridLayout {
  const { rows, columns, cellPadding } = gridConfig;

  // Row height = max packed content across the columns in that row, floored at
  // the configured row height.
  const rowHeights: Record<string, number> = {};
  for (const row of rows) {
    let maxH = row.height;
    for (const col of columns) {
      const items = notesByCell.get(cellKey(row.id, col.id)) ?? [];
      if (items.length === 0) continue;
      const contentH =
        items.reduce((s, it) => s + it.height + GRID_NOTE_GAP, 0) -
        GRID_NOTE_GAP;
      maxH = Math.max(maxH, contentH + cellPadding * 2);
    }
    rowHeights[row.id] = maxH;
  }

  // Config with grown rows, so getCellBounds yields correct y offsets.
  const dynConfig: GridConfig = {
    ...gridConfig,
    rows: rows.map((r) => ({ ...r, height: rowHeights[r.id] })),
  };

  const positions = new Map<string, { x: number; y: number }>();
  rows.forEach((row, rIdx) => {
    columns.forEach((col, cIdx) => {
      const items = notesByCell.get(cellKey(row.id, col.id)) ?? [];
      if (items.length === 0) return;
      const bounds = getCellBounds({ row: rIdx, col: cIdx }, dynConfig);
      let y = bounds.y + cellPadding;
      for (const it of items) {
        positions.set(it.id, { x: bounds.x + cellPadding, y });
        y += it.height + GRID_NOTE_GAP;
      }
    });
  });

  return { rowHeights, positions };
}

/** Apply layoutGrid's grown row heights to a grid config (for overlay + placement). */
export function withDynamicRowHeights(
  gridConfig: GridConfig,
  notesByCell: Map<string, PackItem[]>,
): GridConfig {
  const { rowHeights } = layoutGrid(notesByCell, gridConfig);
  return {
    ...gridConfig,
    rows: gridConfig.rows.map((r) => ({
      ...r,
      height: rowHeights[r.id] ?? r.height,
    })),
  };
}

// --- Render-time bounds derivation (re-pack persisted notes) ---

/**
 * Derive empathy zone bounds from the current notes. Reproduces the generation
 * layout exactly (same sizes + order ⇒ same bounds), so the SVG overlay matches
 * where the notes actually sit. Always returns all six zones (empty ⇒ minimum).
 */
export function empathyBoundsFromNotes(
  notes: LayoutNote[],
): Record<EmpathyZone, EmpathyZoneBounds> {
  const byZone: Record<EmpathyZone, PackItem[]> = {
    says: [],
    thinks: [],
    feels: [],
    does: [],
    pains: [],
    gains: [],
  };
  for (const p of placeableNotes(notes)) {
    const zone = p.cellAssignment?.row as EmpathyZone | undefined;
    if (zone && byZone[zone]) {
      byZone[zone].push({ id: p.id, width: p.width, height: p.height });
    }
  }
  return layoutEmpathy(byZone).bounds;
}

/** Build a grid config whose rows are grown to fit the current notes. */
export function withDynamicRowHeightsFromNotes(
  gridConfig: GridConfig,
  notes: LayoutNote[],
): GridConfig {
  const byCell = new Map<string, PackItem[]>();
  for (const p of placeableNotes(notes)) {
    const row = p.cellAssignment?.row;
    const col = p.cellAssignment?.col;
    if (!row || !col) continue;
    const key = cellKey(row, col);
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key)!.push({ id: p.id, width: p.width, height: p.height });
  }
  return withDynamicRowHeights(gridConfig, byCell);
}
