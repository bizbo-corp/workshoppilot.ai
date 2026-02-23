'use client';

/**
 * EmpathyMapOverlay Component
 * Renders viewport-aware SVG overlay with 6 color-coded empathy zones
 * Used for Step 4 (Sense Making) - classic empathy map layout with sage palette
 */

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import { MessageSquare, Brain, Heart, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
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

/** Zone icon mapping — lucide-react icons for each empathy zone */
const ZONE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  says: MessageSquare,
  thinks: Brain,
  feels: Heart,
  does: Activity,
  pains: AlertTriangle,
  gains: TrendingUp,
};

interface EmpathyMapOverlayProps {
  config: EmpathyZoneConfig;
}

/**
 * EmpathyMapOverlay renders 6 rectangular zones with backgrounds, header labels, and icons
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
      className="absolute inset-0 pointer-events-none z-[1]"
      width="100%"
      height="100%"
    >
      {/* Zone backgrounds and boundaries */}
      {Object.entries(config.zones).map(([zoneKey, zone]) => {
        const screenPos = toScreen(zone.bounds.x, zone.bounds.y);

        return (
          <g key={zoneKey}>
            {/* Background tint */}
            <rect
              x={screenPos.x}
              y={screenPos.y}
              width={zone.bounds.width * zoom}
              height={zone.bounds.height * zoom}
              fill={zone.color}
              style={{ opacity: 'var(--canvas-zone-opacity)' }}
              rx={10}
            />
            {/* Boundary line */}
            <rect
              x={screenPos.x}
              y={screenPos.y}
              width={zone.bounds.width * zoom}
              height={zone.bounds.height * zoom}
              fill="none"
              stroke={zone.color}
              strokeWidth={1}
              strokeOpacity={0.3}
              rx={10}
            />
          </g>
        );
      })}

      {/* Zone header labels with icons */}
      {Object.entries(config.zones).map(([zoneKey, zone]) => {
        const screenPos = toScreen(zone.bounds.x, zone.bounds.y);
        const isPains = zoneKey === 'pains';
        const isGains = zoneKey === 'gains';
        const Icon = ZONE_ICONS[zoneKey];

        // Sage-palette text colors — dark for light mode, light for dark mode
        let textColorClass = 'text-[#4a5a32] dark:text-[#d4e0b8]'; // sage
        if (isPains) textColorClass = 'text-[#8b4f3b] dark:text-[#e8b4a0]'; // terracotta
        if (isGains) textColorClass = 'text-[#3d6b4f] dark:text-[#a8d4b8]'; // sage-teal

        return (
          <foreignObject
            key={`label-${zoneKey}`}
            x={screenPos.x + 12}
            y={screenPos.y + 10}
            width={zone.bounds.width * zoom - 24}
            height={32}
          >
            <div className={`flex items-center gap-1.5 h-full ${textColorClass}`}>
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
              <span className="text-sm font-semibold">
                {zone.label}
              </span>
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}
