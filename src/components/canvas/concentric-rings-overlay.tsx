'use client';

/**
 * ConcentricRingsOverlay Component
 * Renders viewport-aware SVG overlay with concentric ring boundaries, color tints, and center label
 * Used for Step 2 (Stakeholder Mapping) - ring-based importance layout
 */

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { RingConfig } from '@/lib/canvas/ring-layout';

/**
 * Selector for viewport transformation
 * Subscribes to ReactFlow viewport changes for reactive rendering
 */
const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

interface ConcentricRingsOverlayProps {
  config: RingConfig;
}

/**
 * ConcentricRingsOverlay renders concentric ring boundaries with background tints
 * Rings and labels transform with viewport pan/zoom
 */
export function ConcentricRingsOverlay({ config }: ConcentricRingsOverlayProps) {
  // Subscribe to viewport changes reactively
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  // Helper to convert canvas coordinates to screen coordinates
  const toScreen = (canvasX: number, canvasY: number) => ({
    x: canvasX * zoom + x,
    y: canvasY * zoom + y,
  });

  // Calculate screen coordinates for ring center
  const centerScreen = toScreen(config.center.x, config.center.y);

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      width="100%"
      height="100%"
    >
      {/* Ring backgrounds and boundaries - render outer to inner for correct layering */}
      {[...config.rings].reverse().map((ring) => (
        <g key={ring.id}>
          {/* Background tint */}
          <circle
            cx={centerScreen.x}
            cy={centerScreen.y}
            r={ring.radius * zoom}
            fill={ring.color}
            opacity={0.06}
          />
          {/* Boundary line */}
          <circle
            cx={centerScreen.x}
            cy={centerScreen.y}
            r={ring.radius * zoom}
            fill="none"
            stroke="#d1d5db"
            strokeWidth={1}
            strokeDasharray={ring.id === 'inner' ? 'none' : '6 3'}
          />
        </g>
      ))}

      {/* Center label "Most Important" */}
      <foreignObject
        x={centerScreen.x - 60}
        y={centerScreen.y - 16}
        width={120}
        height={32}
      >
        <div className="flex items-center justify-center h-full">
          <span className="text-xs font-semibold text-gray-500 bg-white/80 px-2 py-0.5 rounded">
            Most Important
          </span>
        </div>
      </foreignObject>
    </svg>
  );
}
