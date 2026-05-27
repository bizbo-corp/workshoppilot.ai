/**
 * Shared utility to add parsed canvas items to the board.
 * Used by both facilitator (chat-panel) and participant (participant-chat-panel).
 */

import type { CanvasItemParsed } from "@/lib/chat/parse-utils";
import type { StickyNote, StickyNoteColor, GridColumn } from "@/stores/canvas-store";
import type { GridConfig } from "@/lib/canvas/grid-layout";
import {
  computeCanvasPosition,
  computeStickyNoteSize,
  estimateStickyHeight,
  CATEGORY_COLORS,
  ZONE_COLORS,
  isPersonaCardForCluster,
} from "@/lib/canvas/canvas-position";
import { getStepCanvasConfig } from "@/lib/canvas/step-canvas-config";
import {
  layoutEmpathy,
  layoutGrid,
  cellKey,
  EMPATHY_NOTE_WIDTH,
  type PackItem,
} from "@/lib/canvas/pack-layout";
import type { EmpathyZone } from "@/lib/canvas/empathy-zones";

const EMPATHY_ZONE_IDS = new Set<string>([
  "says",
  "thinks",
  "feels",
  "does",
  "pains",
  "gains",
]);

/** Row-based sticky note colors for journey map swimlanes */
export const GRID_ROW_COLORS: Record<string, StickyNoteColor> = {
  actions: "blue",
  goals: "green",
  barriers: "red",
  touchpoints: "pink",
  emotions: "green", // fallback; explicit color attr takes priority
  moments: "yellow",
  opportunities: "orange",
};

const VALID_COLORS = new Set<string>([
  "yellow",
  "pink",
  "blue",
  "green",
  "orange",
  "red",
  "teal",
  "purple",
  "white",
]);

/** Resolve a sticky color from item metadata + step rules (shared by both paths). */
function resolveItemColor(
  item: CanvasItemParsed,
  stepId: string,
  currentStickyNotes: StickyNote[],
  personaColorMap?: Record<string, StickyNoteColor>,
): StickyNoteColor {
  let color: StickyNoteColor =
    (item.color && VALID_COLORS.has(item.color)
      ? (item.color as StickyNoteColor)
      : null) ||
    (item.category && CATEGORY_COLORS[item.category]) ||
    (item.quadrant && ZONE_COLORS[item.quadrant]) ||
    (item.isGridItem ? GRID_ROW_COLORS[item.row || ""] || "green" : "yellow");

  if (stepId === "user-research" && item.cluster) {
    const personaCard = currentStickyNotes.find((p) =>
      isPersonaCardForCluster(p, item.cluster!),
    );
    if (personaCard?.color) color = personaCard.color;
  }

  if (stepId === "sense-making") {
    const key = item.cluster?.trim().toLowerCase();
    color = (key && personaColorMap?.[key]) || "white";
  }

  return color;
}

/**
 * Generation path for bounded cell/grid steps (empathy map zones, journey-map
 * grid cells). Builds new notes with a locked size, then runs the deterministic
 * pack layout over ALL placed notes so nothing overlaps and the containers grow
 * to fit. Container bounds aren't persisted — they're re-derived at render from
 * these same notes (identical sizes + order ⇒ identical layout).
 */
function layoutAndAddCellGridItems(params: {
  stepId: string;
  items: CanvasItemParsed[];
  currentStickyNotes: StickyNote[];
  gridConfig?: GridConfig;
  addStickyNote: (note: Omit<StickyNote, "id"> & { id?: string }) => void;
  updateStickyNote?: (id: string, updates: Partial<StickyNote>) => void;
  owner?: { ownerId: string; ownerName: string; ownerColor: string };
  personaColorMap?: Record<string, StickyNoteColor>;
  hasEmpathyZones: boolean;
  onRequestFitView?: () => void;
}): { addedCount: number } {
  const {
    stepId,
    items,
    gridConfig,
    addStickyNote,
    updateStickyNote,
    owner,
    personaColorMap,
    hasEmpathyZones,
    onRequestFitView,
  } = params;

  const cellPadding = gridConfig?.cellPadding ?? 12;

  type NewSpec = {
    id: string;
    text: string;
    color: StickyNoteColor;
    width: number;
    height: number;
    cellAssignment: { row: string; col: string };
    cluster?: string;
  };
  const newSpecs: NewSpec[] = [];

  // Running view of the board so dedupe + grouping order match what the render
  // pass will see (existing notes first, then newly added in insertion order).
  const working: StickyNote[] = [...params.currentStickyNotes];

  for (const item of items) {
    const text = item.text?.trim();
    if (!text) continue;

    // Resolve container assignment.
    let cellAssignment: { row: string; col: string } | null = null;
    if (hasEmpathyZones) {
      const zone =
        item.quadrant && EMPATHY_ZONE_IDS.has(item.quadrant)
          ? item.quadrant
          : "says";
      cellAssignment = { row: zone, col: "" };
    } else if (gridConfig && item.row && item.col) {
      const rowOk = gridConfig.rows.some((r) => r.id === item.row);
      const colOk = gridConfig.columns.some((c) => c.id === item.col);
      if (rowOk && colOk) cellAssignment = { row: item.row, col: item.col };
    }
    if (!cellAssignment) continue; // unplaceable in this step — skip

    // Grid cell dedupe: update text in place if the target cell is occupied.
    if (!hasEmpathyZones && updateStickyNote) {
      const occupant = working.find(
        (p) =>
          (!p.type || p.type === "stickyNote") &&
          !p.isPreview &&
          p.cellAssignment?.row === cellAssignment!.row &&
          p.cellAssignment?.col === cellAssignment!.col,
      );
      if (occupant) {
        if (occupant.text.trim() !== text) updateStickyNote(occupant.id, { text });
        continue;
      }
    }

    // Text dedupe.
    const normalized = text.toLowerCase();
    if (
      working.some(
        (p) =>
          (!p.type || p.type === "stickyNote") &&
          p.text.trim().toLowerCase() === normalized,
      )
    ) {
      continue;
    }

    const color = resolveItemColor(item, stepId, working, personaColorMap);

    // Size: empathy uses a uniform width (aligned columns); grid notes fit the
    // column width. Height is estimated so the locked node won't grow + overlap.
    let width: number;
    if (hasEmpathyZones) {
      width = EMPATHY_NOTE_WIDTH;
    } else {
      const col = gridConfig!.columns.find((c) => c.id === cellAssignment!.col);
      width = Math.max(120, Math.min(280, (col?.width ?? 240) - cellPadding * 2));
    }
    const hasBadge = hasEmpathyZones && (!!item.cluster || color === "white");
    const height = estimateStickyHeight(text, width, hasBadge);

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sticky_${Math.random().toString(36).slice(2)}`;

    newSpecs.push({
      id,
      text,
      color,
      width,
      height,
      cellAssignment,
      ...(item.cluster ? { cluster: item.cluster } : {}),
    });

    working.push({
      id,
      text,
      position: { x: 0, y: 0 },
      width,
      height,
      color,
      cellAssignment,
      lockSize: true,
      ...(item.cluster ? { cluster: item.cluster } : {}),
    } as StickyNote);
  }

  if (newSpecs.length === 0) return { addedCount: 0 };

  // Pack ALL placed notes (existing + new) into their containers.
  const realNotes = working.filter(
    (p) => (!p.type || p.type === "stickyNote") && !p.isPreview && p.cellAssignment,
  );

  let positions: Map<string, { x: number; y: number }>;
  if (hasEmpathyZones) {
    const byZone: Record<EmpathyZone, PackItem[]> = {
      says: [],
      thinks: [],
      feels: [],
      does: [],
      pains: [],
      gains: [],
    };
    for (const p of realNotes) {
      const zone = p.cellAssignment!.row as EmpathyZone;
      if (byZone[zone]) {
        byZone[zone].push({ id: p.id, width: p.width, height: p.height });
      }
    }
    positions = layoutEmpathy(byZone).positions;
  } else {
    const byCell = new Map<string, PackItem[]>();
    for (const p of realNotes) {
      const key = cellKey(p.cellAssignment!.row, p.cellAssignment!.col);
      if (!byCell.has(key)) byCell.set(key, []);
      byCell.get(key)!.push({ id: p.id, width: p.width, height: p.height });
    }
    positions = layoutGrid(byCell, gridConfig!).positions;
  }

  // Add new notes at their packed positions, locked.
  const newIds = new Set(newSpecs.map((s) => s.id));
  for (const spec of newSpecs) {
    const pos = positions.get(spec.id) ?? { x: 0, y: 0 };
    addStickyNote({
      id: spec.id,
      text: spec.text,
      position: pos,
      width: spec.width,
      height: spec.height,
      color: spec.color,
      cellAssignment: spec.cellAssignment,
      lockSize: true,
      ...(spec.cluster ? { cluster: spec.cluster } : {}),
      ...(owner
        ? {
            ownerId: owner.ownerId,
            ownerName: owner.ownerName,
            ownerColor: owner.ownerColor,
          }
        : {}),
    });
  }

  // Re-tidy + lock pre-existing notes the layout moved (only when we can update).
  if (updateStickyNote) {
    for (const p of realNotes) {
      if (newIds.has(p.id)) continue;
      const pos = positions.get(p.id);
      if (!pos) continue;
      if (pos.x !== p.position.x || pos.y !== p.position.y || !p.lockSize) {
        updateStickyNote(p.id, { position: pos, lockSize: true });
      }
    }
  }

  if (onRequestFitView) onRequestFitView();

  return { addedCount: newSpecs.length };
}

export function addCanvasItemsToBoard(options: {
  stepId: string;
  items: CanvasItemParsed[];
  storeApi: {
    getState(): {
      stickyNotes: StickyNote[];
      gridColumns: GridColumn[];
      personaTemplates?: Array<{ archetype?: string; position: { x: number; y: number } }>;
    };
  };
  addStickyNote: (note: Omit<StickyNote, "id"> & { id?: string }) => void;
  /** Optional — when provided, grid items dedupe by (row, col): if a sticky
   *  already occupies the target cell, its text is updated in place rather
   *  than a duplicate being created. Without this, AI re-emits (streaming
   *  retries, hallucinated dupes, history replay) pile multiple stickies
   *  into the same cell — historically the journey-mapping "pile" footgun. */
  updateStickyNote?: (id: string, updates: Partial<StickyNote>) => void;
  owner?: { ownerId: string; ownerName: string; ownerColor: string };
  /** When provided, items land as preview stickies (faded, with accept/reject
   *  controls on the canvas) awaiting confirmation via confirmAllPreviews(). */
  preview?: { previewReason?: string };
  /** Sense-making (Step 4): maps a source persona name → its Step 3 color, so an
   *  empathy item attributed to a persona inherits that persona's color. Items
   *  with no cluster (synthesized) render white. Keys should be lowercased. */
  personaColorMap?: Record<string, StickyNoteColor>;
  gridConfigOverride?: GridConfig;
  onHighlightCell?: (cell: { row: number; col: number }) => void;
  onRequestFitView?: () => void;
}): { addedCount: number } {
  const {
    stepId,
    items,
    storeApi,
    addStickyNote,
    updateStickyNote,
    owner,
    preview,
    personaColorMap,
    gridConfigOverride,
    onHighlightCell,
    onRequestFitView,
  } = options;

  // Read fresh state
  let currentStickyNotes = [...storeApi.getState().stickyNotes];

  // Resolve grid config if not overridden
  const gridConfig =
    gridConfigOverride ??
    (() => {
      const stepConfig = getStepCanvasConfig(stepId);
      const base = stepConfig.gridConfig;
      if (!base) return undefined;
      const latestCols = storeApi.getState().gridColumns;
      return latestCols.length > 0
        ? { ...base, columns: latestCols }
        : base;
    })();

  // Bounded cell/grid steps (empathy map, journey grid): pack auto-generated
  // items without overlap and grow the containers to fit. Preview items keep
  // the legacy per-item path so they don't disturb committed layout until
  // confirmed.
  const stepConfigForLayout = getStepCanvasConfig(stepId);
  if (
    !preview &&
    (stepConfigForLayout.hasEmpathyZones ||
      (stepConfigForLayout.hasGrid && gridConfig))
  ) {
    return layoutAndAddCellGridItems({
      stepId,
      items,
      currentStickyNotes,
      gridConfig,
      addStickyNote,
      updateStickyNote,
      owner,
      personaColorMap,
      hasEmpathyZones: !!stepConfigForLayout.hasEmpathyZones,
      onRequestFitView,
    });
  }

  let addedCount = 0;

  for (const item of items) {
    // Grid-item (row, col) dedupe: if a sticky already occupies the target
    // cell, update its text in place instead of stacking a new one on top.
    // Only kicks in when updateStickyNote is provided AND the parsed item
    // names both row and col — otherwise we fall through to the legacy
    // text-based duplicate check below.
    if (item.isGridItem && item.row && item.col && updateStickyNote) {
      const existingInCell = currentStickyNotes.find(
        (p) =>
          (!p.type || p.type === "stickyNote") &&
          p.cellAssignment?.row === item.row &&
          p.cellAssignment?.col === item.col,
      );
      if (existingInCell) {
        if (existingInCell.text.trim() !== item.text.trim()) {
          updateStickyNote(existingInCell.id, { text: item.text });
        }
        continue;
      }
    }

    // Duplicate guard: skip if same text already exists
    const normalizedText = item.text.trim().toLowerCase();
    const alreadyExists = currentStickyNotes.some(
      (p) =>
        (!p.type || p.type === "stickyNote") &&
        p.text.trim().toLowerCase() === normalizedText,
    );
    if (alreadyExists) continue;

    const { position, quadrant, cellAssignment } = computeCanvasPosition(
      stepId,
      {
        quadrant: item.quadrant,
        ring: item.ring,
        row: item.row,
        col: item.col,
        category: item.category,
        cluster: item.cluster,
      },
      currentStickyNotes,
      gridConfig,
      storeApi.getState().personaTemplates,
    );

    // Color priority: explicit > category > zone > row-based > grid green > default yellow
    let color: StickyNoteColor =
      (item.color && VALID_COLORS.has(item.color)
        ? (item.color as StickyNoteColor)
        : null) ||
      (item.category && CATEGORY_COLORS[item.category]) ||
      (item.quadrant && ZONE_COLORS[item.quadrant]) ||
      (item.isGridItem
        ? GRID_ROW_COLORS[item.row || ""] || "green"
        : "yellow");

    // For user-research: inherit color from the persona card this insight belongs to
    if (stepId === "user-research" && item.cluster) {
      const personaCard = currentStickyNotes.find((p) =>
        isPersonaCardForCluster(p, item.cluster!),
      );
      if (personaCard?.color) color = personaCard.color;
    }

    // For sense-making: color by the source persona (Step 3 color map); items
    // with no resolvable persona are synthesized → white.
    if (stepId === "sense-making") {
      // Match on first name (the persona color map is keyed the same way), so a
      // cluster of "Anaru" or "Anaru, The Department Heads" both resolve.
      const key = item.cluster?.trim().toLowerCase().split(",")[0].split(/\s+/)[0];
      color = (key && personaColorMap?.[key]) || "white";
    }

    const { width: itemWidth, height: itemHeight } = computeStickyNoteSize(
      item.text,
    );

    const newStickyNote: Omit<StickyNote, "id"> = {
      text: item.text,
      position,
      width: itemWidth,
      height: itemHeight,
      color,
      quadrant,
      cellAssignment,
      cluster: item.cluster,
      ...(owner
        ? {
            ownerId: owner.ownerId,
            ownerName: owner.ownerName,
            ownerColor: owner.ownerColor,
          }
        : {}),
      ...(preview ? { isPreview: true, previewReason: preview.previewReason } : {}),
    };

    addStickyNote(newStickyNote);

    // Highlight target cell for grid items
    if (item.isGridItem && cellAssignment && gridConfig && onHighlightCell) {
      const rowIndex = gridConfig.rows.findIndex(
        (r) => r.id === cellAssignment.row,
      );
      const colIndex = gridConfig.columns.findIndex(
        (c) => c.id === cellAssignment.col,
      );
      if (rowIndex !== -1 && colIndex !== -1) {
        onHighlightCell({ row: rowIndex, col: colIndex });
      }
    }

    // Track for stagger positioning
    currentStickyNotes = [
      ...currentStickyNotes,
      { ...newStickyNote, id: "pending" } as StickyNote,
    ];
    addedCount++;
  }

  // Fit view after adding items (skip for ring-based canvases)
  if (addedCount > 0 && onRequestFitView) {
    const stepConfig = getStepCanvasConfig(stepId);
    if (!stepConfig.hasRings) {
      onRequestFitView();
    }
  }

  return { addedCount };
}
