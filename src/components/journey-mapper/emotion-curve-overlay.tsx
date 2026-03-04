'use client';

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { JourneyStageColumn } from '@/lib/journey-mapper/types';

const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

const COLUMN_WIDTH = 280;
const COLUMN_GAP = 40;

const EMOTION_Y: Record<string, number> = {
  positive: -60,
  neutral: 0,
  negative: 60,
};

interface EmotionCurveOverlayProps {
  stages: JourneyStageColumn[];
}

/**
 * SVG overlay that draws a bezier emotion curve across journey stages.
 * Maps positive/neutral/negative emotions to y-coordinates.
 * Highlights dip points with a pulsing dot.
 */
export function EmotionCurveOverlay({ stages }: EmotionCurveOverlayProps) {
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  if (stages.length < 2) return null;

  // Calculate points in canvas space, then convert to screen space
  const points = stages.map((stage, i) => {
    const canvasX = i * (COLUMN_WIDTH + COLUMN_GAP) + COLUMN_WIDTH / 2;
    const canvasY = EMOTION_Y[stage.emotion];
    return {
      screenX: canvasX * zoom + x,
      screenY: canvasY * zoom + y,
      emotion: stage.emotion,
      isDip: stage.isDip,
      name: stage.name,
    };
  });

  // Build smooth bezier path through points
  const pathParts: string[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      pathParts.push(`M ${points[i].screenX} ${points[i].screenY}`);
    } else {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.screenX + curr.screenX) / 2;
      pathParts.push(
        `C ${cpx} ${prev.screenY}, ${cpx} ${curr.screenY}, ${curr.screenX} ${curr.screenY}`
      );
    }
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[1]"
      width="100%"
      height="100%"
    >
      {/* Curve path */}
      <path
        d={pathParts.join(' ')}
        fill="none"
        stroke="var(--canvas-crosshair, hsl(var(--muted-foreground) / 0.3))"
        strokeWidth={2}
        strokeDasharray="6 3"
        opacity={0.6}
      />

      {/* Points */}
      {points.map((pt, i) => (
        <g key={i}>
          {/* Regular point */}
          <circle
            cx={pt.screenX}
            cy={pt.screenY}
            r={pt.isDip ? 6 : 4}
            fill={
              pt.emotion === 'positive'
                ? 'hsl(142 76% 36%)'
                : pt.emotion === 'negative'
                ? 'hsl(0 84% 60%)'
                : 'hsl(45 93% 47%)'
            }
            opacity={0.8}
          />

          {/* Pulsing ring on dip points */}
          {pt.isDip && (
            <circle
              cx={pt.screenX}
              cy={pt.screenY}
              r={10}
              fill="none"
              stroke="hsl(0 84% 60%)"
              strokeWidth={1.5}
              opacity={0.5}
            >
              <animate
                attributeName="r"
                values="6;12;6"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0.1;0.6"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </g>
      ))}
    </svg>
  );
}
