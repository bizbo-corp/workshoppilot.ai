'use client';

/**
 * GridOverlay Component
 * Renders viewport-aware SVG overlay with grid lines, row labels, column headers, and cell highlighting
 * Used for Step 6 (Journey Mapping) 7-row swimlane grid
 */

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { GridConfig, CellCoordinate } from '@/lib/canvas/grid-layout';
import { getCellBounds } from '@/lib/canvas/grid-layout';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { EditableColumnHeader } from './editable-column-header';
import { PlusCircle, X, Footprints, Target, Construction, Pointer, Smile, Zap, Lightbulb, type LucideIcon } from 'lucide-react';

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
  onDeleteColumn?: (columnId: string, columnLabel: string, affectedCardCount: number, migrationTarget: string | null) => void;
}

/**
 * GridOverlay renders grid lines, row labels, column headers, and cell highlighting
 * All elements transform with viewport pan/zoom
 */
export function GridOverlay({ config, highlightedCell, onDeleteColumn }: GridOverlayProps) {
  // Subscribe to viewport changes reactively
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  // Subscribe to store state for dynamic columns
  const gridColumns = useCanvasStore((s) => s.gridColumns);
  const postIts = useCanvasStore((s) => s.postIts);
  const updateGridColumn = useCanvasStore((s) => s.updateGridColumn);
  const addGridColumn = useCanvasStore((s) => s.addGridColumn);

  // Use gridColumns from store if available, otherwise fall back to config.columns
  const effectiveColumns = gridColumns.length > 0 ? gridColumns : config.columns;

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
  const headerAreaHeight = config.origin.y - 10; // 10px margin before grid starts

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      width="100%"
      height="100%"
    >
      {/* Cell highlight (render first so it's behind grid lines) */}
      {highlightedCell && (() => {
        const bounds = getCellBounds(highlightedCell, { ...config, columns: effectiveColumns });
        const topLeft = toScreen(bounds.x, bounds.y);
        return (
          <g className="animate-pulse">
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={bounds.width * zoom}
              height={bounds.height * zoom}
              fill="var(--canvas-highlight-fill)"
              opacity={0.3}
            />
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={bounds.width * zoom}
              height={bounds.height * zoom}
              fill="none"
              stroke="#eab308"
              strokeWidth={3}
            />
          </g>
        );
      })()}

      {/* Alternating row tints — extends across label area + grid cells */}
      {config.rows.map((row, index) => {
        if (index % 2 !== 1) return null;
        const rowTop = rowYPositions[index];
        const rowHeight = rowYPositions[index + 1] - rowTop;
        const topLeft = toScreen(labelAreaX, rowTop);
        const fullWidth = colXPositions[colXPositions.length - 1] - labelAreaX;
        return (
          <rect
            key={`row-tint-${row.id}`}
            x={topLeft.x}
            y={topLeft.y}
            width={fullWidth * zoom}
            height={rowHeight * zoom}
            fill="#8a9a5b"
            opacity={0.04}
          />
        );
      })}

      {/* Skeleton post-it placeholders in empty cells — disappear when real post-its arrive */}
      {config.rows.map((row, rowIdx) =>
        effectiveColumns.map((col, colIdx) => {
          const hasContent = postIts.some(
            p => p.cellAssignment?.row === row.id && p.cellAssignment?.col === col.id
          );
          if (hasContent) return null;

          const bounds = getCellBounds(
            { row: rowIdx, col: colIdx },
            { ...config, columns: effectiveColumns }
          );
          const pad = config.cellPadding + 4;
          const topLeft = toScreen(bounds.x + pad, bounds.y + pad);
          const isEmotionRow = row.id === 'emotions';

          if (isEmotionRow) {
            return (
              <circle
                key={`skel-${row.id}-${col.id}`}
                cx={topLeft.x + 18 * zoom}
                cy={topLeft.y + 18 * zoom}
                r={18 * zoom}
                fill="#a8aaa3"
                opacity={0.12}
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
              fill="#a8aaa3"
              opacity={0.12}
            />
          );
        })
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

        return (
          <foreignObject
            key={row.id}
            x={midLeft.x - labelWidth / 2}
            y={midLeft.y - 20}
            width={labelWidth}
            height={40}
            className="pointer-events-none"
          >
            <div className="flex flex-col items-center justify-center h-full gap-0.5">
              {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="text-[11px] font-semibold text-foreground leading-tight text-center">
                {row.label}
              </span>
            </div>
          </foreignObject>
        );
      })}

      {/* Horizontal row separator lines — solid, spanning label area + grid */}
      {rowYPositions.map((rowY, index) => {
        const leftEdge = toScreen(labelAreaX, rowY);
        const rightEdge = toScreen(colXPositions[colXPositions.length - 1], rowY);
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

      {/* Column headers with inline editing and delete */}
      {effectiveColumns.map((col, index) => {
        const colLeft = colXPositions[index];
        const colRight = colXPositions[index + 1];
        const colWidth = colRight - colLeft;
        const colMidpoint = colLeft + colWidth / 2;
        const headerPos = toScreen(colMidpoint, config.origin.y - 30);
        const headerWidth = Math.max(160, colWidth * zoom);

        // Count cards in this column for delete confirmation
        const cardsInColumn = postIts.filter(p => p.cellAssignment?.col === col.id).length;

        // Find adjacent column for migration target
        const leftAdjacentLabel = effectiveColumns[index - 1]?.label || null;
        const rightAdjacentLabel = effectiveColumns[index + 1]?.label || null;
        const migrationTarget = leftAdjacentLabel || rightAdjacentLabel;

        return (
          <foreignObject
            key={col.id}
            x={headerPos.x - headerWidth / 2}
            y={headerPos.y - 14}
            width={headerWidth}
            height={32}
            className="pointer-events-auto overflow-visible"
          >
            <div className="flex items-center justify-center gap-0.5 group">
              <EditableColumnHeader
                label={col.label}
                onSave={(newLabel) => updateGridColumn(col.id, { label: newLabel })}
              />
              {effectiveColumns.length > 1 && (
                <button
                  onClick={() => onDeleteColumn?.(col.id, col.label, cardsInColumn, migrationTarget)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                  title="Delete column"
                >
                  <X className="h-3 w-3 text-red-500" />
                </button>
              )}
            </div>
          </foreignObject>
        );
      })}

      {/* Column header bottom border — spans full width including label area */}
      {(() => {
        const leftEdge = toScreen(labelAreaX, config.origin.y);
        const rightEdge = toScreen(colXPositions[colXPositions.length - 1], config.origin.y);
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

      {/* +Add Stage button after last column */}
      {(() => {
        const lastColRight = colXPositions[colXPositions.length - 1];
        const addButtonPos = toScreen(lastColRight + 30, config.origin.y - 30);
        const MAX_COLUMNS = 12;
        return (
          <foreignObject
            x={addButtonPos.x}
            y={addButtonPos.y - 10}
            width={120}
            height={28}
            className="pointer-events-auto overflow-visible"
          >
            <button
              onClick={() => {
                if (effectiveColumns.length < MAX_COLUMNS) {
                  addGridColumn(`Stage ${effectiveColumns.length + 1}`);
                }
              }}
              disabled={effectiveColumns.length >= MAX_COLUMNS}
              className="flex items-center gap-1 text-xs text-[#a8aaa3] hover:text-[#4a5a32] hover:bg-[#8a9a5b]/10 dark:hover:bg-zinc-700/80 rounded px-2 py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={effectiveColumns.length >= MAX_COLUMNS ? 'Maximum 12 stages' : 'Add a new stage column'}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Stage
            </button>
          </foreignObject>
        );
      })()}

      {/* Vertical column separator lines — solid thin lines */}
      {colXPositions.slice(0, -1).map((colX, index) => {
        const topEdge = toScreen(colX, config.origin.y);
        const bottomEdge = toScreen(colX, rowYPositions[rowYPositions.length - 1]);
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
    </svg>
  );
}
