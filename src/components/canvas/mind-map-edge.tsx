'use client';

import { memo } from 'react';
import { getBezierPath, useInternalNode, type EdgeProps, type Edge, Position } from '@xyflow/react';

export type MindMapEdgeData = {
  themeColor?: string; // hex color string
};

export type MindMapEdgeType = Edge<MindMapEdgeData>;

/**
 * Given source and target node centers + measured dimensions,
 * determine which handle pair (T/B/L/R) gives the shortest connection
 * and return the connection points.
 */
function getSmartEdgeParams(
  source: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number }
) {
  const sCenterX = source.x + source.width / 2;
  const sCenterY = source.y + source.height / 2;
  const tCenterX = target.x + target.width / 2;
  const tCenterY = target.y + target.height / 2;

  const dx = tCenterX - sCenterX;
  const dy = tCenterY - sCenterY;

  // Determine primary direction based on which axis has larger delta
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let sourcePosition: Position;
  let targetPosition: Position;
  let sourceX: number;
  let sourceY: number;
  let targetX: number;
  let targetY: number;

  if (absDx > absDy) {
    // Horizontal: left/right
    if (dx > 0) {
      // Target is to the right
      sourcePosition = Position.Right;
      targetPosition = Position.Left;
      sourceX = source.x + source.width;
      sourceY = sCenterY;
      targetX = target.x;
      targetY = tCenterY;
    } else {
      // Target is to the left
      sourcePosition = Position.Left;
      targetPosition = Position.Right;
      sourceX = source.x;
      sourceY = sCenterY;
      targetX = target.x + target.width;
      targetY = tCenterY;
    }
  } else {
    // Vertical: top/bottom
    if (dy > 0) {
      // Target is below
      sourcePosition = Position.Bottom;
      targetPosition = Position.Top;
      sourceX = sCenterX;
      sourceY = source.y + source.height;
      targetX = tCenterX;
      targetY = target.y;
    } else {
      // Target is above
      sourcePosition = Position.Top;
      targetPosition = Position.Bottom;
      sourceX = sCenterX;
      sourceY = source.y;
      targetX = tCenterX;
      targetY = target.y + target.height;
    }
  }

  return { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
}

const MindMapEdgeComponent = memo(({
  source,
  target,
  data = {},
}: EdgeProps<MindMapEdgeType>) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const sourcePos = sourceNode.internals.positionAbsolute;
  const targetPos = targetNode.internals.positionAbsolute;
  const sourceWidth = sourceNode.measured?.width || 200;
  const sourceHeight = sourceNode.measured?.height || 60;
  const targetWidth = targetNode.measured?.width || 200;
  const targetHeight = targetNode.measured?.height || 60;

  const params = getSmartEdgeParams(
    { x: sourcePos.x, y: sourcePos.y, width: sourceWidth, height: sourceHeight },
    { x: targetPos.x, y: targetPos.y, width: targetWidth, height: targetHeight }
  );

  const [edgePath] = getBezierPath({
    sourceX: params.sourceX,
    sourceY: params.sourceY,
    sourcePosition: params.sourcePosition,
    targetX: params.targetX,
    targetY: params.targetY,
    targetPosition: params.targetPosition,
  });

  const strokeColor = data?.themeColor || '#94a3b8';

  return (
    <g>
      <path
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={2}
        fill="none"
        className="transition-colors"
      />
      <circle
        cx={params.targetX}
        cy={params.targetY}
        r={4}
        fill={strokeColor}
        className="transition-colors"
      />
    </g>
  );
});

MindMapEdgeComponent.displayName = 'MindMapEdge';

export { MindMapEdgeComponent as MindMapEdge };
