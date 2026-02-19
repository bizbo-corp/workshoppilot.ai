'use client';

/**
 * QuadrantOverlay Component
 * Renders viewport-aware SVG overlay with crosshair lines and quadrant labels
 * Used for step-specific quadrant layouts (Power-Interest, Empathy Map)
 */

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { QuadrantConfig } from '@/lib/canvas/step-canvas-config';

/**
 * Selector for viewport transformation
 * Subscribes to ReactFlow viewport changes for reactive rendering
 */
const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

interface QuadrantOverlayProps {
  config: QuadrantConfig;
}

/**
 * QuadrantOverlay renders crosshair lines and quadrant labels
 * Lines and labels transform with viewport pan/zoom
 */
export function QuadrantOverlay({ config }: QuadrantOverlayProps) {
  // Subscribe to viewport changes reactively
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  // Calculate screen coordinates for center crosshair (canvas origin 0,0)
  const screenCenterX = 0 * zoom + x;
  const screenCenterY = 0 * zoom + y;

  // Fixed offset for quadrant labels (80px from center)
  const labelOffset = 80;

  // Axis label offset (closer to center than quadrant labels)
  const axisLabelOffset = 40;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[1]"
      width="100%"
      height="100%"
    >
      {/* Vertical crosshair line */}
      <line
        x1={screenCenterX}
        y1={0}
        x2={screenCenterX}
        y2="100%"
        stroke="var(--canvas-crosshair)"
        strokeWidth={1.5}
        strokeDasharray="8 4"
      />

      {/* Horizontal crosshair line */}
      <line
        x1={0}
        y1={screenCenterY}
        x2="100%"
        y2={screenCenterY}
        stroke="var(--canvas-crosshair)"
        strokeWidth={1.5}
        strokeDasharray="8 4"
      />

      {/* Quadrant labels */}
      {/* Top-left quadrant */}
      <text
        x={screenCenterX - labelOffset}
        y={screenCenterY - labelOffset}
        fontSize={14}
        fontWeight={500}
        fill="var(--canvas-label-muted)"
        textAnchor="end"
        dominantBaseline="auto"
      >
        {config.labels.topLeft}
      </text>

      {/* Top-right quadrant */}
      <text
        x={screenCenterX + labelOffset}
        y={screenCenterY - labelOffset}
        fontSize={14}
        fontWeight={500}
        fill="var(--canvas-label-muted)"
        textAnchor="start"
        dominantBaseline="auto"
      >
        {config.labels.topRight}
      </text>

      {/* Bottom-left quadrant */}
      <text
        x={screenCenterX - labelOffset}
        y={screenCenterY + labelOffset}
        fontSize={14}
        fontWeight={500}
        fill="var(--canvas-label-muted)"
        textAnchor="end"
        dominantBaseline="hanging"
      >
        {config.labels.bottomLeft}
      </text>

      {/* Bottom-right quadrant */}
      <text
        x={screenCenterX + labelOffset}
        y={screenCenterY + labelOffset}
        fontSize={14}
        fontWeight={500}
        fill="var(--canvas-label-muted)"
        textAnchor="start"
        dominantBaseline="hanging"
      >
        {config.labels.bottomRight}
      </text>

      {/* Axis labels (if provided) */}
      {config.axisLabels && (
        <>
          {/* Horizontal axis labels */}
          <text
            x={screenCenterX - axisLabelOffset}
            y={screenCenterY - 10}
            fontSize={12}
            fill="var(--canvas-label-subtle)"
            textAnchor="end"
            dominantBaseline="auto"
          >
            {config.axisLabels.horizontal.left}
          </text>
          <text
            x={screenCenterX + axisLabelOffset}
            y={screenCenterY - 10}
            fontSize={12}
            fill="var(--canvas-label-subtle)"
            textAnchor="start"
            dominantBaseline="auto"
          >
            {config.axisLabels.horizontal.right}
          </text>

          {/* Vertical axis labels */}
          <text
            x={screenCenterX + 10}
            y={screenCenterY - axisLabelOffset}
            fontSize={12}
            fill="var(--canvas-label-subtle)"
            textAnchor="start"
            dominantBaseline="middle"
          >
            {config.axisLabels.vertical.top}
          </text>
          <text
            x={screenCenterX + 10}
            y={screenCenterY + axisLabelOffset}
            fontSize={12}
            fill="var(--canvas-label-subtle)"
            textAnchor="start"
            dominantBaseline="middle"
          >
            {config.axisLabels.vertical.bottom}
          </text>
        </>
      )}
    </svg>
  );
}
