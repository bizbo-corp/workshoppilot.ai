'use client';

import { memo } from 'react';
import { getBezierPath, type EdgeProps, type Edge } from '@xyflow/react';

export type MindMapEdgeData = {
  themeColor?: string; // hex color string
};

export type MindMapEdgeType = Edge<MindMapEdgeData>;

const MindMapEdgeComponent = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data = {},
}: EdgeProps<MindMapEdgeType>) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeColor = data?.themeColor || '#94a3b8'; // fallback to gray

  return (
    <g>
      {/* Main bezier path */}
      <path
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={2}
        fill="none"
        className="transition-colors"
      />

      {/* Animated marker at target end */}
      <circle
        cx={targetX}
        cy={targetY}
        r={4}
        fill={strokeColor}
        className="transition-colors"
      />
    </g>
  );
});

MindMapEdgeComponent.displayName = 'MindMapEdge';

export { MindMapEdgeComponent as MindMapEdge };
