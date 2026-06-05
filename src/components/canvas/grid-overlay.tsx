"use client";

/**
 * GridOverlay Component
 * Renders viewport-aware SVG overlay with grid lines, row labels, column headers, and cell highlighting
 * Used for Step 6 (Journey Mapping) 7-row swimlane grid
 *
 * Two-layer architecture:
 *   1. SVG at z-[3] — visual grid (lines, backgrounds, skeletons, row labels). Below React Flow renderer (z-4).
 *   2. HTML div at z-[5] — interactive controls (column headers, drag handles, delete, Add Stage). Above renderer.
 *
 * This split is necessary because React Flow's ZoomPane (.react-flow__renderer) sits at z-index: 4,
 * which blocks pointer events on anything below it.
 */

import { useState, useCallback, useMemo, useRef } from "react";
import {
  useStore as useReactFlowStore,
  type ReactFlowState,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import type { GridConfig, CellCoordinate } from "@/lib/canvas/grid-layout";
import { getCellBounds } from "@/lib/canvas/grid-layout";
import { useCanvasStore } from "@/providers/canvas-store-provider";
import { EditableColumnHeader } from "./editable-column-header";
import {
  emitGridAutocomplete,
  type GridAutocompleteRequest,
} from "@/lib/canvas/grid-autocomplete-bus";
import {
  PlusCircle,
  X,
  GripVertical,
  Sparkles,
  Footprints,
  Target,
  Construction,
  Pointer,
  Smile,
  Zap,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

/** Row icon mapping for journey map swimlanes */
const ROW_ICONS: Record<string, LucideIcon> = {
  actions: Footprints,
  goals: Target,
  barriers: Construction,
  touchpoints: Pointer,
  emotions: Smile,
  moments: Zap,
  opportunities: Lightbulb,
};

/**
 * Single faint-olive fill for the whole journey-map body (no per-row colour
 * variation — rows are separated by strokes instead). Sits under the watercolour
 * wash so the map reads as one calm olive paper.
 */
const JOURNEY_BODY_TINT = '#8a9a5b';
const ROW_TINT_OPACITY_LIGHT = 0.14;
const ROW_TINT_OPACITY_DARK = 0.22;

/**
 * Selector for viewport transformation
 * Subscribes to ReactFlow viewport changes for reactive rendering
 */
const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

interface GridOverlayProps {
  config: GridConfig;
  highlightedCell?: CellCoordinate | null;
  onDeleteColumn?: (
    columnId: string,
    columnLabel: string,
    affectedCardCount: number,
    migrationTarget: string | null,
  ) => void;
  onMoveColumn?: (columnId: string, toIndex: number) => void;
  canEditStructure?: boolean;
}

/**
 * GridOverlay renders grid lines, row labels, column headers, and cell highlighting
 * All elements transform with viewport pan/zoom
 */
export function GridOverlay({
  config,
  highlightedCell,
  onDeleteColumn,
  onMoveColumn,
  canEditStructure = true,
}: GridOverlayProps) {
  // Subscribe to viewport changes reactively
  const { x, y, zoom } = useReactFlowStore(viewportSelector);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Subscribe to store state for dynamic columns
  const gridColumns = useCanvasStore((s) => s.gridColumns);
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);
  const updateGridColumn = useCanvasStore((s) => s.updateGridColumn);
  const addGridColumn = useCanvasStore((s) => s.addGridColumn);

  // Use gridColumns from store if available, otherwise fall back to config.columns.
  // Render-time dedupe by id: stores dedupe on write but live Liveblocks Storage
  // already in the wild may contain duplicate IDs from before that fix, plus
  // SSR hydration could deliver duplicates on first paint. Dedupe here so the
  // <rect key={...}> + <div key={col.id}> children never collide.
  const effectiveColumns = useMemo(() => {
    const source = gridColumns.length > 0 ? gridColumns : config.columns;
    const seen = new Set<string>();
    return source.filter((col) => {
      if (seen.has(col.id)) return false;
      seen.add(col.id);
      return true;
    });
  }, [gridColumns, config.columns]);

  // --- Drag state for column reorder ---
  const [dragState, setDragState] = useState<{
    columnId: string;
    startIndex: number;
    dropIndex: number;
  } | null>(null);
  // Ref mirrors dragState so pointerup always reads the latest value
  // (avoids stale-closure race where React hasn't re-rendered yet)
  const dragRef = useRef<typeof dragState>(null);
  // A press that hasn't yet crossed the drag threshold. We don't enter a drag
  // (or capture the pointer) until the pointer moves > DRAG_THRESHOLD px, so a
  // plain click still reaches the header for rename / the X for delete.
  const pendingPressRef = useRef<{
    columnId: string;
    startIndex: number;
    startX: number;
    startY: number;
    pointerId: number;
  } | null>(null);
  // True once a press became a drag — used to swallow the trailing click so the
  // label editor doesn't pop open at the end of a reorder.
  const dragMovedRef = useRef(false);
  const DRAG_THRESHOLD = 4;

  // Helper to transform canvas coordinates to screen coordinates
  const toScreen = (canvasX: number, canvasY: number) => ({
    x: canvasX * zoom + x,
    y: canvasY * zoom + y,
  });

  // Calculate row Y positions (accumulate heights from origin)
  const rowYPositions: number[] = [];
  let accumulatedHeight = config.origin.y;
  config.rows.forEach((row) => {
    rowYPositions.push(accumulatedHeight);
    accumulatedHeight += row.height;
  });
  // Add final bottom edge
  rowYPositions.push(accumulatedHeight);

  // Calculate column X positions (accumulate widths from origin) - use effectiveColumns
  const colXPositions: number[] = [];
  let accumulatedWidth = config.origin.x;
  effectiveColumns.forEach((col) => {
    colXPositions.push(accumulatedWidth);
    accumulatedWidth += col.width;
  });
  // Add final right edge
  colXPositions.push(accumulatedWidth);

  // Calculate label area (left of grid)
  const labelAreaX = 0; // Left edge of canvas
  const labelAreaWidth = config.origin.x - 10; // 10px margin before grid starts

  // Calculate header area (top of grid)
  const headerAreaY = 0; // Top edge of canvas

  // Table bounds in screen coordinates
  const tableTopLeft = toScreen(labelAreaX, headerAreaY);
  const tableW = (colXPositions[colXPositions.length - 1] - labelAreaX) * zoom;
  const tableH = (rowYPositions[rowYPositions.length - 1] - headerAreaY) * zoom;
  const cornerRadius = 16 * zoom;
  const tableBg = isDark ? '#1c2416' : '#f9f9f8'; // dark olive / neutral-olive-50 paper
  // Watercolour wash painted over the row bands — olive pigment, soft mottle.
  // Light mode uses a deep olive that pools darker; dark mode a light olive so
  // the texture stays visible on the dark paper. Tune the opacity to taste.
  const watercolourInk = isDark ? '#aeb89a' : '#5b6b41';
  const watercolourOpacity = isDark ? 0.15 : 0.12;

  // --- Drag handlers ---
  const computeDropIndex = useCallback(
    (clientX: number) => {
      // Convert screen X positions of column gaps to find closest drop target
      const screenGapXs = colXPositions.map((cx) => cx * zoom + x);
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < screenGapXs.length; i++) {
        const dist = Math.abs(clientX - screenGapXs[i]);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      // Clamp: drop index is between 0 and effectiveColumns.length
      return Math.max(0, Math.min(closest, effectiveColumns.length));
    },
    [colXPositions, zoom, x, effectiveColumns.length],
  );

  // Press starts on the whole header. We only arm a pending press here — the
  // drag itself begins in pointermove once the threshold is crossed, leaving a
  // click free to reach the editable label / delete button.
  const handleHeaderPointerDown = useCallback(
    (e: React.PointerEvent, columnId: string, colIndex: number) => {
      if (!canEditStructure) return;
      pendingPressRef.current = {
        columnId,
        startIndex: colIndex,
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
      };
      dragMovedRef.current = false;
    },
    [canEditStructure],
  );

  const handleHeaderPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (drag) {
        // Already dragging — track the nearest gap for the drop indicator.
        const newDropIndex = computeDropIndex(e.clientX);
        if (newDropIndex !== drag.dropIndex) {
          drag.dropIndex = newDropIndex;
          setDragState({ ...drag });
        }
        return;
      }

      const pending = pendingPressRef.current;
      if (!pending || pending.pointerId !== e.pointerId) return;
      const dist = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
      if (dist < DRAG_THRESHOLD) return;

      // Threshold crossed → promote to a real drag and capture the pointer so
      // moves continue to land here even when the cursor leaves the header.
      dragMovedRef.current = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(pending.pointerId);
      } catch {
        /* capture may be unavailable mid-gesture; drag still works while over the header */
      }
      const state = {
        columnId: pending.columnId,
        startIndex: pending.startIndex,
        dropIndex: computeDropIndex(e.clientX),
      };
      dragRef.current = state;
      setDragState(state);
    },
    [computeDropIndex],
  );

  const handleHeaderPointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Always release capture first — prevents stuck capture if state is stale.
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* not captured */
      }

      pendingPressRef.current = null;
      const drag = dragRef.current;
      if (!drag) return; // never crossed the threshold — treat as a click

      // Convert gap-based dropIndex to array insertion index accounting for removal.
      let insertIndex = drag.dropIndex;
      // If dropping after the original position, subtract 1 because the source is removed first.
      if (insertIndex > drag.startIndex) {
        insertIndex -= 1;
      }

      if (insertIndex !== drag.startIndex) {
        onMoveColumn?.(drag.columnId, insertIndex);
      }
      dragRef.current = null;
      setDragState(null);
    },
    [onMoveColumn],
  );

  // Swallow the click that the browser fires after a drag gesture so the label
  // editor doesn't open when the user was only reordering.
  const handleHeaderClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      dragMovedRef.current = false;
    }
  }, []);

  const MAX_COLUMNS = 12;

  return (
    <>
      {/* ===== LAYER 1: Visual SVG — z-[3], below renderer (z-4) ===== */}
      <svg
        className="absolute inset-0 pointer-events-none z-[3]"
        width="100%"
        height="100%"
      >
        {/* Clip path for rounded table corners + watercolour wash filter */}
        <defs>
          <clipPath id="table-clip">
            <rect
              x={tableTopLeft.x}
              y={tableTopLeft.y}
              width={tableW}
              height={tableH}
              rx={cornerRadius}
              ry={cornerRadius}
            />
          </clipPath>

          {/* Watercolour texture: fractal-noise turbulence shaped into soft,
              irregular blotches and filled with olive pigment. Applied to a
              screen-fixed full-svg rect (constant attrs → the browser computes
              it once and caches it, so panning the grid stays smooth). */}
          <filter
            id="journey-watercolour"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            primitiveUnits="userSpaceOnUse"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.006 0.009"
              numOctaves={3}
              seed={14}
              stitchTiles="stitch"
              result="noise"
            />
            {/* Map the noise alpha into a mottled mask (clamps to patches). */}
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1.1 -0.28"
              result="mask"
            />
            <feComponentTransfer in="mask" result="softMask">
              <feFuncA type="gamma" amplitude="1" exponent="1.6" offset="0" />
            </feComponentTransfer>
            <feFlood floodColor={watercolourInk} floodOpacity={1} result="ink" />
            <feComposite in="ink" in2="softMask" operator="in" />
          </filter>
        </defs>

        {/* All table content clipped to rounded rect */}
        <g clipPath="url(#table-clip)">
          {/* Cell highlight (render first so it's behind grid lines) */}
          {highlightedCell &&
            (() => {
              const bounds = getCellBounds(highlightedCell, {
                ...config,
                columns: effectiveColumns,
              });
              const topLeft = toScreen(bounds.x, bounds.y);
              return (
                <g className="animate-pulse">
                  <rect
                    x={topLeft.x}
                    y={topLeft.y}
                    width={bounds.width * zoom}
                    height={bounds.height * zoom}
                    fill="var(--canvas-highlight-fill)"
                    opacity={0.9}
                  />
                  <rect
                    x={topLeft.x}
                    y={topLeft.y}
                    width={bounds.width * zoom}
                    height={bounds.height * zoom}
                    fill="none"
                    stroke="var(--canvas-yellow)"
                    strokeWidth={3}
                  />
                </g>
              );
            })()}

          {/* Table background */}
          <rect
            x={tableTopLeft.x}
            y={tableTopLeft.y}
            width={tableW}
            height={tableH}
            fill={tableBg}
          />

          {/* Uniform faint-olive body fill (single band across the gutter +
              cells, below the header). Rows are distinguished by strokes, not
              colour. Height spans origin.y → bottom, so it grows with the rows. */}
          {(() => {
            const bodyTop = rowYPositions[0];
            const bodyBottom = rowYPositions[rowYPositions.length - 1];
            const topLeft = toScreen(labelAreaX, bodyTop);
            const fullWidth = colXPositions[colXPositions.length - 1] - labelAreaX;
            return (
              <rect
                x={topLeft.x}
                y={topLeft.y}
                width={fullWidth * zoom}
                height={(bodyBottom - bodyTop) * zoom}
                fill={JOURNEY_BODY_TINT}
                opacity={isDark ? ROW_TINT_OPACITY_DARK : ROW_TINT_OPACITY_LIGHT}
              />
            );
          })()}

          {/* Watercolour wash over the whole table body. Screen-fixed (width/
              height = 100%) so the turbulence is computed once and cached; the
              parent table-clip keeps it inside the rounded table, and the opaque
              header rect below paints over the top strip. */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            filter="url(#journey-watercolour)"
            opacity={watercolourOpacity}
          />

          {/* Solid olive header bar across the top (stage labels sit on it). */}
          <rect
            x={tableTopLeft.x}
            y={tableTopLeft.y}
            width={tableW}
            height={config.origin.y * zoom}
            fill={isDark ? '#3d4b29' : '#505d3d'}
          />

          {/* Skeleton sticky note placeholders in empty cells */}
          {config.rows.map((row, rowIdx) =>
            effectiveColumns.map((col, colIdx) => {
              const hasContent = stickyNotes.some(
                (p) =>
                  p.cellAssignment?.row === row.id &&
                  p.cellAssignment?.col === col.id,
              );
              if (hasContent) return null;

              const bounds = getCellBounds(
                { row: rowIdx, col: colIdx },
                { ...config, columns: effectiveColumns },
              );
              const pad = config.cellPadding + 4;
              const topLeft = toScreen(bounds.x + pad, bounds.y + pad);
              const isEmotionRow = row.id === "emotions";

              if (isEmotionRow) {
                return (
                  <circle
                    key={`skel-${row.id}-${col.id}`}
                    cx={topLeft.x + 18 * zoom}
                    cy={topLeft.y + 18 * zoom}
                    r={18 * zoom}
                    fill="var(--foreground)"
                    opacity={0.06}
                  />
                );
              }

              return (
                <rect
                  key={`skel-${row.id}-${col.id}`}
                  x={topLeft.x}
                  y={topLeft.y}
                  width={Math.min(120, bounds.width - pad * 2) * zoom}
                  height={Math.min(72, bounds.height - pad * 2) * zoom}
                  rx={8 * zoom}
                  ry={8 * zoom}
                  fill="#000000"
                  opacity={0.06}
                />
              );
            }),
          )}

          {/* Row labels — just the icon + name in neutral olive (no badge, no
              colour-coding). Sized in viewport units so they scale with zoom. */}
          {config.rows.map((row, index) => {
            const rowTop = rowYPositions[index];
            const rowBottom = rowYPositions[index + 1];
            const rowHeight = rowBottom - rowTop;
            const rowMidpoint = rowTop + rowHeight / 2;

            const midLeft = toScreen(labelAreaX + labelAreaWidth / 2, rowMidpoint);
            const labelWidth = labelAreaWidth * zoom;
            const Icon = ROW_ICONS[row.id];
            // Sizes scale with the viewport so the label zooms with the grid
            // instead of staying a fixed screen size.
            const iconPx = 22 * zoom;
            const fontPx = 13 * zoom;
            const boxH = 56 * zoom;

            return (
              <foreignObject
                key={row.id}
                x={midLeft.x - labelWidth / 2}
                y={midLeft.y - boxH / 2}
                width={labelWidth}
                height={boxH}
                className="pointer-events-none"
              >
                <div
                  className="flex flex-col items-center justify-center h-full text-neutral-olive-700 dark:text-neutral-olive-200"
                  style={{ gap: 3 * zoom }}
                >
                  {Icon && <Icon style={{ width: iconPx, height: iconPx }} className="shrink-0" />}
                  <span
                    className="font-semibold leading-tight text-center"
                    style={{ fontSize: fontPx }}
                  >
                    {row.label}
                  </span>
                </div>
              </foreignObject>
            );
          })}

          {/* Horizontal row separator lines */}
          {rowYPositions.map((rowY, index) => {
            const leftEdge = toScreen(labelAreaX, rowY);
            const rightEdge = toScreen(
              colXPositions[colXPositions.length - 1],
              rowY,
            );
            return (
              <line
                key={`row-line-${index}`}
                x1={leftEdge.x}
                y1={leftEdge.y}
                x2={rightEdge.x}
                y2={rightEdge.y}
                stroke={isDark ? '#62675c' : '#bfc1ba'}
                strokeWidth={1}
                strokeOpacity={0.85}
              />
            );
          })}

          {/* Column header bottom border */}
          {(() => {
            const leftEdge = toScreen(labelAreaX, config.origin.y);
            const rightEdge = toScreen(
              colXPositions[colXPositions.length - 1],
              config.origin.y,
            );
            return (
              <line
                x1={leftEdge.x}
                y1={leftEdge.y}
                x2={rightEdge.x}
                y2={rightEdge.y}
                stroke={isDark ? '#91948b' : '#62675c'} /* neutral-olive: darker header underline */
                strokeWidth={1}
                strokeOpacity={0.7}
              />
            );
          })()}

          {/* Vertical column separator lines */}
          {colXPositions.slice(0, -1).map((colX, index) => {
            const topEdge = toScreen(colX, config.origin.y);
            const bottomEdge = toScreen(
              colX,
              rowYPositions[rowYPositions.length - 1],
            );
            return (
              <line
                key={`col-line-${index}`}
                x1={topEdge.x}
                y1={topEdge.y}
                x2={bottomEdge.x}
                y2={bottomEdge.y}
                stroke={isDark ? '#62675c' : '#bfc1ba'}
                strokeWidth={1}
                strokeOpacity={0.85}
              />
            );
          })}

          {/* Drop indicator line during column drag */}
          {dragState && (() => {
            const dropX = colXPositions[dragState.dropIndex];
            if (dropX === undefined) return null;
            const topEdge = toScreen(dropX, config.origin.y - 40);
            const bottomEdge = toScreen(dropX, rowYPositions[rowYPositions.length - 1]);
            return (
              <line
                x1={topEdge.x}
                y1={topEdge.y}
                x2={bottomEdge.x}
                y2={bottomEdge.y}
                stroke="var(--canvas-blue)"
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })()}
        </g>

        {/* Outer border around the whole journey map. Drawn outside the clip so
            the full stroke shows (a stroke on the clip edge would be half-cut)
            and it sits on top of the grid lines. */}
        <rect
          x={tableTopLeft.x}
          y={tableTopLeft.y}
          width={tableW}
          height={tableH}
          rx={cornerRadius}
          ry={cornerRadius}
          fill="none"
          stroke={isDark ? '#62675c' : '#aeb3a6'}
          strokeWidth={1.5}
        />
      </svg>

      {/* ===== LAYER 2: Interactive HTML — z-[5], above renderer (z-4) ===== */}
      <div className="absolute inset-0 pointer-events-none z-[5]">
        {/* Column headers with inline editing, drag handle, and delete */}
        {effectiveColumns.map((col, index) => {
          const colLeft = colXPositions[index];
          const colRight = colXPositions[index + 1];
          const colWidth = colRight - colLeft;
          const colMidpoint = colLeft + colWidth / 2;
          const headerPos = toScreen(colMidpoint, config.origin.y - 30);
          // Header box matches the column width at every zoom; the inner content
          // is laid out at base size and scaled by `zoom` (below) so the label
          // shrinks/grows with the grid instead of overlapping when zoomed out.
          const headerWidth = colWidth * zoom;

          // Count cards in this column for delete confirmation
          const cardsInColumn = stickyNotes.filter(
            (p) => p.cellAssignment?.col === col.id,
          ).length;

          // Find adjacent column for migration target
          const leftAdjacentLabel = effectiveColumns[index - 1]?.label || null;
          const rightAdjacentLabel = effectiveColumns[index + 1]?.label || null;
          const migrationTarget = leftAdjacentLabel || rightAdjacentLabel;

          const isDragging = dragState?.columnId === col.id;

          return (
            <div
              key={col.id}
              className="absolute pointer-events-auto"
              style={{
                left: headerPos.x - headerWidth / 2,
                top: headerPos.y - 14 * zoom,
                width: headerWidth,
                height: 32 * zoom,
                opacity: isDragging ? 0.5 : 1,
              }}
            >
              {/* Base-size content scaled by zoom so the label tracks the grid. */}
              <div
                style={{
                  width: colWidth,
                  height: 32,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
              {/* The whole header is the drag surface (with a click-vs-drag
                  threshold), so reordering a stage no longer depends on hitting
                  the tiny grip. Plain clicks still fall through to rename / X. */}
              <div
                className="flex items-center justify-center gap-0.5 group h-full touch-none"
                onPointerDown={
                  canEditStructure
                    ? (e) => handleHeaderPointerDown(e, col.id, index)
                    : undefined
                }
                onPointerMove={canEditStructure ? handleHeaderPointerMove : undefined}
                onPointerUp={canEditStructure ? handleHeaderPointerUp : undefined}
                onPointerCancel={canEditStructure ? handleHeaderPointerUp : undefined}
                onClickCapture={canEditStructure ? handleHeaderClickCapture : undefined}
                style={
                  canEditStructure
                    ? { cursor: dragState ? 'grabbing' : 'grab' }
                    : undefined
                }
                title={canEditStructure ? 'Drag to reorder this stage' : undefined}
              >
                {canEditStructure && (
                  <span className="opacity-50 group-hover:opacity-100 p-0.5 transition-opacity">
                    <GripVertical className="h-3 w-3 text-neutral-olive-100" />
                  </span>
                )}
                <EditableColumnHeader
                  label={col.label}
                  onSave={(newLabel) =>
                    updateGridColumn(col.id, { label: newLabel })
                  }
                />
                {effectiveColumns.length > 1 && (
                  <button
                    // Stop the press from arming a drag so X stays a pure click.
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() =>
                      onDeleteColumn?.(
                        col.id,
                        col.label,
                        cardsInColumn,
                        migrationTarget,
                      )
                    }
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                    title="Delete column"
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </button>
                )}
              </div>
              </div>
            </div>
          );
        })}

        {/* +Add Stage button */}
        {(() => {
          const lastColRight = colXPositions[colXPositions.length - 1];
          const addButtonPos = toScreen(lastColRight + 30, config.origin.y - 30);
          return (
            <div
              className="absolute pointer-events-auto"
              style={{
                left: addButtonPos.x,
                top: addButtonPos.y - 10 * zoom,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              <button
                onClick={() => {
                  if (effectiveColumns.length < MAX_COLUMNS) {
                    addGridColumn(`Stage ${effectiveColumns.length + 1}`);
                  }
                }}
                disabled={effectiveColumns.length >= MAX_COLUMNS}
                className="flex items-center gap-1 text-xs text-[#a8aaa3] hover:text-[#4a5a32] hover:bg-[#8a9a5b]/10 dark:hover:bg-neutral-olive-700/80 rounded px-2 py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={
                  effectiveColumns.length >= MAX_COLUMNS
                    ? "Maximum 12 stages"
                    : "Add a new stage column"
                }
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add Stage
              </button>
            </div>
          );
        })()}

        {/* Per-row "Auto-fill" buttons — sit under each row label. Always
            visible so the autocomplete affordance is discoverable. Asks the AI
            to fill that whole row across all stages (user edits after). */}
        {canEditStructure &&
          config.rows.map((row, index) => {
            const rowTop = rowYPositions[index];
            const rowMid = rowTop + (rowYPositions[index + 1] - rowTop) / 2;
            const pos = toScreen(labelAreaX + labelAreaWidth / 2, rowMid);
            const req: GridAutocompleteRequest = {
              scope: "row",
              rowId: row.id,
              rowLabel: row.label,
              columns: effectiveColumns.map((c) => ({ id: c.id, label: c.label })),
            };
            return (
              <div
                key={`rowfill-${row.id}`}
                className="absolute pointer-events-auto"
                style={{
                  left: pos.x,
                  top: pos.y + 32 * zoom,
                  transform: `translateX(-50%) scale(${zoom})`,
                  transformOrigin: "center top",
                }}
              >
                <button
                  type="button"
                  onClick={() => emitGridAutocomplete(req)}
                  className="flex items-center gap-1 rounded-full border border-olive-300 bg-card/90 px-2 py-0.5 text-[10px] font-medium text-[#4a5a32] shadow-sm transition-colors hover:bg-olive-100 dark:border-neutral-olive-700 dark:text-neutral-olive-200 dark:hover:bg-neutral-olive-700"
                  title={`Auto-fill the ${row.label} row with AI — you can edit after`}
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-fill
                </button>
              </div>
            );
          })}

        {/* Per-cell autocomplete — a small wand in each cell's top-left corner,
            revealed on hover. Fills just that one cell. */}
        {canEditStructure &&
          config.rows.map((row, rowIdx) =>
            effectiveColumns.map((col, colIdx) => {
              const bounds = getCellBounds(
                { row: rowIdx, col: colIdx },
                { ...config, columns: effectiveColumns },
              );
              const tl = toScreen(bounds.x + 2, bounds.y + 2);
              const req: GridAutocompleteRequest = {
                scope: "cell",
                rowId: row.id,
                rowLabel: row.label,
                columns: [{ id: col.id, label: col.label }],
              };
              return (
                <button
                  key={`cellfill-${row.id}-${col.id}`}
                  type="button"
                  onClick={() => emitGridAutocomplete(req)}
                  className="absolute pointer-events-auto flex h-[18px] w-[18px] items-center justify-center rounded-full border border-olive-300 bg-card/95 text-[#4a5a32] opacity-0 shadow-sm transition-opacity hover:bg-olive-100 hover:opacity-100 focus-visible:opacity-100 dark:border-neutral-olive-700 dark:bg-card dark:text-neutral-olive-200 dark:hover:bg-neutral-olive-700"
                  style={{
                    left: tl.x,
                    top: tl.y,
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                  title={`Auto-fill the ${row.label} cell for "${col.label}" — you can edit after`}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                </button>
              );
            }),
          )}
      </div>
    </>
  );
}
