'use client';

/**
 * EmpathyMapOverlay Component
 * Renders viewport-aware SVG overlay with 6 color-coded empathy zones
 * Used for Step 4 (Sense Making) - classic empathy map layout
 */

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { EmpathyZoneConfig } from '@/lib/canvas/empathy-zones';

/**
 * Selector for viewport transformation
 * Subscribes to ReactFlow viewport changes for reactive rendering
 */
const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

interface EmpathyMapOverlayProps {
  config: EmpathyZoneConfig;
}

/**
 * EmpathyMapOverlay renders 6 rectangular zones with backgrounds and header labels
 * Zones transform with viewport pan/zoom
 */
export function EmpathyMapOverlay({ config }: EmpathyMapOverlayProps) {
  // Subscribe to viewport changes reactively
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  // Helper to convert canvas coordinates to screen coordinates
  const toScreen = (canvasX: number, canvasY: number) => ({
    x: canvasX * zoom + x,
    y: canvasY * zoom + y,
  });

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      width="100%"
      height="100%"
    >
      {/* Zone backgrounds and boundaries */}
      {Object.entries(config.zones).map(([zoneKey, zone]) => {
        const screenPos = toScreen(zone.bounds.x, zone.bounds.y);
        const isPains = zoneKey === 'pains';
        const isGains = zoneKey === 'gains';
        const isImportantStrip = isPains || isGains;

        return (
          <g key={zoneKey}>
            {/* Background tint */}
            <rect
              x={screenPos.x}
              y={screenPos.y}
              width={zone.bounds.width * zoom}
              height={zone.bounds.height * zoom}
              fill={zone.color}
              opacity={0.08}
              rx={8}
            />
            {/* Boundary line - thicker for pains/gains strips */}
            <rect
              x={screenPos.x}
              y={screenPos.y}
              width={zone.bounds.width * zoom}
              height={zone.bounds.height * zoom}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={isImportantStrip ? 1.5 : 1}
              strokeDasharray="4 4"
              rx={8}
            />
          </g>
        );
      })}

      {/* Zone header labels */}
      {Object.entries(config.zones).map(([zoneKey, zone]) => {
        const screenPos = toScreen(zone.bounds.x, zone.bounds.y);
        const isPains = zoneKey === 'pains';
        const isGains = zoneKey === 'gains';

        // Determine text color based on zone type
        let textColorClass = 'text-gray-600';
        if (isPains) textColorClass = 'text-red-600';
        if (isGains) textColorClass = 'text-emerald-600';

        return (
          <foreignObject
            key={`label-${zoneKey}`}
            x={screenPos.x + 12}
            y={screenPos.y + 12}
            width={zone.bounds.width * zoom - 24}
            height={28}
          >
            <div className="flex items-center h-full">
              <span className={`text-sm font-semibold ${textColorClass}`}>
                {zone.label}
              </span>
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}
