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
  CATEGORY_COLORS,
  ZONE_COLORS,
  isPersonaCardForCluster,
} from "@/lib/canvas/canvas-position";
import { getStepCanvasConfig } from "@/lib/canvas/step-canvas-config";

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
]);

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
  addStickyNote: (note: Omit<StickyNote, "id">) => void;
  owner?: { ownerId: string; ownerName: string; ownerColor: string };
  gridConfigOverride?: GridConfig;
  onHighlightCell?: (cell: { row: number; col: number }) => void;
  onRequestFitView?: () => void;
}): { addedCount: number } {
  const {
    stepId,
    items,
    storeApi,
    addStickyNote,
    owner,
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

  let addedCount = 0;

  for (const item of items) {
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
