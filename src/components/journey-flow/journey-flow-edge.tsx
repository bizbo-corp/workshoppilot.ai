'use client';

import { memo } from 'react';
import { getBezierPath, type EdgeProps, type Edge } from '@xyflow/react';

export type JourneyFlowEdgeData = {
  [key: string]: unknown;
};

export type JourneyFlowEdgeType = Edge<JourneyFlowEdgeData, 'flowEdge'>;

const ENDPOINT_RADIUS = 5;

const JourneyFlowEdgeComponent = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    style,
    animated,
    interactionWidth,
  }: EdgeProps<JourneyFlowEdgeType>) => {
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const stroke = style?.stroke ?? 'var(--primary)';
    const strokeWidth = (style?.strokeWidth as number) ?? 1.5;
    const selectedColor = 'var(--selection)';

    return (
      <g>
        {/* Invisible fat interaction zone for easy clicking */}
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={interactionWidth ?? 20}
          style={{ pointerEvents: 'all' }}
          className="react-flow__edge-interaction"
        />

        {/* Visible edge path */}
        <path
          d={edgePath}
          fill="none"
          stroke={selected ? selectedColor : stroke}
          strokeWidth={selected ? 3 : strokeWidth}
          className="react-flow__edge-path"
          strokeDasharray={animated ? '5 5' : undefined}
          style={{
            pointerEvents: 'visibleStroke',
            ...(animated ? { animation: 'dashdraw 0.5s linear infinite' } : {}),
          }}
        />

        {/* Endpoint circles — only visible when selected */}
        {selected && (
          <>
            <circle
              cx={sourceX}
              cy={sourceY}
              r={ENDPOINT_RADIUS}
              fill="var(--background)"
              stroke={selectedColor}
              strokeWidth={2}
            />
            <circle
              cx={targetX}
              cy={targetY}
              r={ENDPOINT_RADIUS}
              fill="var(--background)"
              stroke={selectedColor}
              strokeWidth={2}
            />
          </>
        )}
      </g>
    );
  }
);

JourneyFlowEdgeComponent.displayName = 'JourneyFlowEdge';

export { JourneyFlowEdgeComponent as JourneyFlowEdge };
