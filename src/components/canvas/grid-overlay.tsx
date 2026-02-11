'use client';

/**
 * GridOverlay Component
 * Renders viewport-aware SVG overlay with grid lines, row labels, column headers, and cell highlighting
 * Used for Step 6 (Journey Mapping) 7-row swimlane grid
 */

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { GridConfig, CellCoordinate } from '@/lib/canvas/grid-layout';
import { getCellBounds } from '@/lib/canvas/grid-layout';

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
}

/**
 * GridOverlay renders grid lines, row labels, column headers, and cell highlighting
 * All elements transform with viewport pan/zoom
 */
export function GridOverlay({ config, highlightedCell }: GridOverlayProps) {
  // Subscribe to viewport changes reactively
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

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

  // Calculate column X positions (accumulate widths from origin)
  const colXPositions: number[] = [];
  let accumulatedWidth = config.origin.x;
  config.columns.forEach((col) => {
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
        const bounds = getCellBounds(highlightedCell, config);
        const topLeft = toScreen(bounds.x, bounds.y);
        return (
          <rect
            x={topLeft.x}
            y={topLeft.y}
            width={bounds.width * zoom}
            height={bounds.height * zoom}
            fill="#dbeafe"
            opacity={0.4}
          />
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
              fill="#f9fafb"
              opacity={0.8}
            />
            {/* Label text */}
            <text
              x={midLeft.x}
              y={midLeft.y}
              fontSize={13}
              fontWeight={600}
              fill="#374151"
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
            stroke="#d1d5db"
            strokeWidth={1}
            strokeDasharray="6 3"
          />
        );
      })}

      {/* Column header labels */}
      {config.columns.map((col, index) => {
        const colLeft = colXPositions[index];
        const colRight = colXPositions[index + 1];
        const colWidth = colRight - colLeft;
        const colMidpoint = colLeft + colWidth / 2;

        const headerPos = toScreen(colMidpoint, config.origin.y - 25);

        return (
          <text
            key={col.id}
            x={headerPos.x}
            y={headerPos.y}
            fontSize={12}
            fontWeight={600}
            fill="#6b7280"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {col.label}
          </text>
        );
      })}

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
            stroke="#e5e7eb"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        );
      })}
    </svg>
  );
}
