'use client';

import { memo } from 'react';
import { getBezierPath, type EdgeProps, type Edge } from '@xyflow/react';

export type ClusterEdgeData = Record<string, never>;

export type ClusterEdgeType = Edge<ClusterEdgeData>;

const ClusterEdgeComponent = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps<ClusterEdgeType>) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <g>
      <path
        d={edgePath}
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        fill="none"
      />
      <circle
        cx={targetX}
        cy={targetY}
        r={3}
        fill="#94a3b8"
      />
    </g>
  );
});

ClusterEdgeComponent.displayName = 'ClusterEdge';

export { ClusterEdgeComponent as ClusterEdge };
