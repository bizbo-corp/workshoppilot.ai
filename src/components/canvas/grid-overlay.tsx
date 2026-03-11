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

import { useState, useCallback, useRef } from "react";
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
  PlusCircle,
  X,
  GripVertical,
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

/** Per-row tint colors for swimlane visual identity — matches sticky note palette */
const ROW_TINT_COLORS: Record<string, string> = {
  actions: '#b8c8d0',      // blue  (--canvas-blue-pastel)
  goals: '#c0d8c0',        // green (--canvas-green-pastel)
  barriers: '#d8b8a8',     // red   (--canvas-red-pastel)
  touchpoints: '#e8c8c0',  // pink  (--canvas-pink-pastel)
  emotions: '#e8c8c0',     // pink  (--canvas-pink-pastel) — matches emotion stickies
  moments: '#ede0c0',      // yellow(--canvas-yellow-pastel)
  opportunities: '#e0d0b8', // orange(--canvas-orange-pastel)
};

/** Dark accent colors for row label icons + text (light theme / dark theme) */
const ROW_LABEL_COLORS: Record<string, { light: string; dark: string }> = {
  actions:       { light: '#1a6d9e', dark: '#7cc8e8' },
  goals:         { light: '#1a7a4a', dark: '#6dcea0' },
  barriers:      { light: '#b03028', dark: '#f09088' },
  touchpoints:   { light: '#a03068', dark: '#f0a0c0' },
  emotions:      { light: '#58594e', dark: '#c0c2b8' },
  moments:       { light: '#8a6a10', dark: '#e8d070' },
  opportunities: { light: '#a05a18', dark: '#f0b878' },
};

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

  // Use gridColumns from store if available, otherwise fall back to config.columns
  const effectiveColumns =
    gridColumns.length > 0 ? gridColumns : config.columns;

  // --- Drag state for column reorder ---
  const [dragState, setDragState] = useState<{
    columnId: string;
    startIndex: number;
    dropIndex: number;
  } | null>(null);
  // Ref mirrors dragState so pointerup always reads the latest value
  // (avoids stale-closure race where React hasn't re-rendered yet)
  const dragRef = useRef<typeof dragState>(null);

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
  const tableBg = isDark ? '#1c2416' : '#ffffff';

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

  const handleGripPointerDown = useCallback(
    (e: React.PointerEvent, columnId: string, colIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      const state = { columnId, startIndex: colIndex, dropIndex: colIndex };
      dragRef.current = state;
      setDragState(state);
    },
    [],
  );

  const handleGripPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const newDropIndex = computeDropIndex(e.clientX);
      if (newDropIndex !== drag.dropIndex) {
        drag.dropIndex = newDropIndex;
        setDragState({ ...drag });
      }
    },
    [computeDropIndex],
  );

  const handleGripPointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Always release capture first — prevents stuck capture if state is stale
      const target = e.currentTarget as HTMLElement;
      try { target.releasePointerCapture(e.pointerId); } catch { /* not captured */ }

      const drag = dragRef.current;
      if (!drag) return;

      // Convert gap-based dropIndex to array insertion index accounting for removal
      let insertIndex = drag.dropIndex;
      // If dropping after the original position, subtract 1 because the source is removed first
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

  const MAX_COLUMNS = 12;

  return (
    <>
      {/* ===== LAYER 1: Visual SVG — z-[3], below renderer (z-4) ===== */}
      <svg
        className="absolute inset-0 pointer-events-none z-[3]"
        width="100%"
        height="100%"
      >
        {/* Clip path for rounded table corners */}
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
                    stroke="#c49820"
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

          {/* Per-row color tints — extends across label area + grid cells */}
          {config.rows.map((row, index) => {
            const rowTop = rowYPositions[index];
            const rowHeight = rowYPositions[index + 1] - rowTop;
            const topLeft = toScreen(labelAreaX, rowTop);
            const fullWidth = colXPositions[colXPositions.length - 1] - labelAreaX;
            const tintColor = ROW_TINT_COLORS[row.id] || '#a8aaa3';
            return (
              <rect
                key={`row-tint-${row.id}`}
                x={topLeft.x}
                y={topLeft.y}
                width={fullWidth * zoom}
                height={rowHeight * zoom}
                fill={tintColor}
                opacity={0.3}
              />
            );
          })}

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

          {/* Row labels with icons */}
          {config.rows.map((row, index) => {
            const rowTop = rowYPositions[index];
            const rowBottom = rowYPositions[index + 1];
            const rowHeight = rowBottom - rowTop;
            const rowMidpoint = rowTop + rowHeight / 2;

            const midLeft = toScreen(labelAreaX + labelAreaWidth / 2, rowMidpoint);
            const labelWidth = labelAreaWidth * zoom;
            const Icon = ROW_ICONS[row.id];
            const labelColors = ROW_LABEL_COLORS[row.id];
            const labelColor = labelColors ? (isDark ? labelColors.dark : labelColors.light) : undefined;

            return (
              <foreignObject
                key={row.id}
                x={midLeft.x - labelWidth / 2}
                y={midLeft.y - 30}
                width={labelWidth}
                height={60}
                className="pointer-events-none"
              >
                <div className="flex flex-col items-center justify-center h-full gap-1" style={labelColor ? { color: labelColor } : undefined}>
                  {Icon && <Icon className="h-7 w-7" />}
                  <span className="text-xs font-bold leading-tight text-center">
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
                stroke="#a8aaa3"
                strokeWidth={0.5}
                strokeOpacity={0.5}
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
                stroke="#a8aaa3"
                strokeWidth={0.5}
                strokeOpacity={0.5}
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
                stroke="#a8aaa3"
                strokeWidth={0.5}
                strokeOpacity={0.5}
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
                stroke="#6888a0"
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })()}
        </g>
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
          const headerWidth = Math.max(160, colWidth * zoom);

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
                top: headerPos.y - 14,
                width: headerWidth,
                height: 32,
                opacity: isDragging ? 0.5 : 1,
              }}
            >
              <div className="flex items-center justify-center gap-0.5 group h-full">
                {canEditStructure && (
                  <button
                    onPointerDown={(e) => handleGripPointerDown(e, col.id, index)}
                    onPointerMove={handleGripPointerMove}
                    onPointerUp={handleGripPointerUp}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded transition-opacity touch-none"
                    style={{ cursor: dragState ? 'grabbing' : 'grab' }}
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                <EditableColumnHeader
                  label={col.label}
                  onSave={(newLabel) =>
                    updateGridColumn(col.id, { label: newLabel })
                  }
                />
                {effectiveColumns.length > 1 && (
                  <button
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
                top: addButtonPos.y - 10,
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
      </div>
    </>
  );
}
