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
import { PlusCircle, X } from 'lucide-react';

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

      {/* Row label backgrounds and labels */}
      {config.rows.map((row, index) => {
        const rowTop = rowYPositions[index];
        const rowBottom = rowYPositions[index + 1];
        const rowHeight = rowBottom - rowTop;
        const rowMidpoint = rowTop + rowHeight / 2;

        const topLeft = toScreen(labelAreaX, rowTop);
        const midLeft = toScreen(labelAreaX + labelAreaWidth / 2, rowMidpoint);

        return (
          <g key={row.id}>
            {/* Label background */}
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={labelAreaWidth * zoom}
              height={rowHeight * zoom}
              fill="var(--canvas-label-bg)"
              opacity={0.8}
            />
            {/* Label text */}
            <text
              x={midLeft.x}
              y={midLeft.y}
              fontSize={13}
              fontWeight={600}
              fill="var(--canvas-label-text)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {row.label}
            </text>
          </g>
        );
      })}

      {/* Horizontal row separator lines */}
      {rowYPositions.map((rowY, index) => {
        const leftEdge = toScreen(config.origin.x, rowY);
        const rightEdge = toScreen(colXPositions[colXPositions.length - 1], rowY);
        return (
          <line
            key={`row-line-${index}`}
            x1={leftEdge.x}
            y1={leftEdge.y}
            x2={rightEdge.x}
            y2={rightEdge.y}
            stroke="var(--canvas-grid-line)"
            strokeWidth={1}
            strokeDasharray="6 3"
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
            y={headerPos.y - 12}
            width={headerWidth}
            height={28}
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
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-zinc-700/80 rounded px-2 py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={effectiveColumns.length >= MAX_COLUMNS ? 'Maximum 12 stages' : 'Add a new stage column'}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Stage
            </button>
          </foreignObject>
        );
      })()}

      {/* Vertical column separator lines */}
      {colXPositions.map((colX, index) => {
        const topEdge = toScreen(colX, config.origin.y);
        const bottomEdge = toScreen(colX, rowYPositions[rowYPositions.length - 1]);
        return (
          <line
            key={`col-line-${index}`}
            x1={topEdge.x}
            y1={topEdge.y}
            x2={bottomEdge.x}
            y2={bottomEdge.y}
            stroke="var(--canvas-grid-line-light)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        );
      })}
    </svg>
  );
}
