'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

export type FlowBandNodeData = {
  variant: 'convergence' | 'continuation';
  width: number;
  height: number;
  // Convergence: per-user curved ribbons from their crazy 8s center → voting container center
  bands?: Array<{
    color: string;         // accent color (CSS variable)
    sourceCenterX: number; // center X of source (relative to this node)
    sourceWidth: number;   // width of source ribbon at top
  }>;
  targetCenterX?: number;  // center X of voting container (relative to this node)
  targetWidth?: number;    // width at the target end
  // Continuation: single curved ribbon from voting → brain rewriting
  sourceCenterX?: number;  // center X of voting container (relative)
  sourceWidth?: number;    // width at top
  targetCenterXCont?: number;  // center X of BR container (relative)
  targetWidthCont?: number;    // width at bottom
  bandColor?: string;
};

export type FlowBandNode = Node<FlowBandNodeData, 'flowBandNode'>;

/**
 * Build a smooth S-curve ribbon path from (srcCx, 0) → (dstCx, height).
 * Uses cubic bezier with control points at 40%/60% of height for the S-curve.
 * Returns a closed path with left edge + right edge.
 */
function curvedRibbonPath(
  srcCx: number,
  srcHalfW: number,
  dstCx: number,
  dstHalfW: number,
  height: number,
): string {
  // Control point Y positions for the S-curve
  const cp1y = height * 0.35;
  const cp2y = height * 0.65;

  // Left edge: top-left → bottom-left (cubic bezier curving inward)
  const tlx = srcCx - srcHalfW;
  const blx = dstCx - dstHalfW;
  // Right edge: top-right → bottom-right
  const trx = srcCx + srcHalfW;
  const brx = dstCx + dstHalfW;

  // Forward path (left edge, top → bottom)
  // Reverse path (right edge, bottom → top)
  return [
    `M ${tlx} 0`,
    `C ${tlx} ${cp1y}, ${blx} ${cp2y}, ${blx} ${height}`,
    `L ${brx} ${height}`,
    `C ${brx} ${cp2y}, ${trx} ${cp1y}, ${trx} 0`,
    'Z',
  ].join(' ');
}

/** Build a smooth center-line stroke path (for a thin stroke down the middle). */
function curvedCenterPath(
  srcCx: number,
  dstCx: number,
  height: number,
): string {
  const cp1y = height * 0.35;
  const cp2y = height * 0.65;
  return `M ${srcCx} 0 C ${srcCx} ${cp1y}, ${dstCx} ${cp2y}, ${dstCx} ${height}`;
}

export const FlowBandNode = memo(({ data }: NodeProps<FlowBandNode>) => {
  const { variant, width, height } = data;

  if (variant === 'convergence' && data.bands && data.bands.length > 0) {
    const targetCx = data.targetCenterX ?? width / 2;
    const targetHalfW = (data.targetWidth ?? 200) / 2;
    // Each band gets an equal slice of the target width
    const bandCount = data.bands.length;
    const sliceWidth = (data.targetWidth ?? 200) / bandCount;

    return (
      <div style={{ width, height, pointerEvents: 'none' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            {data.bands.map((band, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`conv-grad-${i}`}
                x1="0" y1="0" x2="0" y2="1"
              >
                <stop offset="0%" stopColor={band.color} stopOpacity={0.12} />
                <stop offset="100%" stopColor={band.color} stopOpacity={0.06} />
              </linearGradient>
            ))}
          </defs>
          {data.bands.map((band, i) => {
            const srcCx = band.sourceCenterX;
            const srcHalfW = band.sourceWidth / 2;
            // Destination: this band's slice within the target
            const dstCx = targetCx - targetHalfW + sliceWidth * (i + 0.5);
            const dstHalfW = sliceWidth / 2;

            const ribbonPath = curvedRibbonPath(srcCx, srcHalfW, dstCx, dstHalfW, height);
            const centerPath = curvedCenterPath(srcCx, dstCx, height);

            return (
              <g key={i}>
                <path
                  d={ribbonPath}
                  fill={`url(#conv-grad-${i})`}
                />
                <path
                  d={centerPath}
                  fill="none"
                  stroke={band.color}
                  strokeOpacity={0.2}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'continuation') {
    const color = data.bandColor ?? '#6b7280';
    const srcCx = data.sourceCenterX ?? width / 2;
    const srcHalfW = (data.sourceWidth ?? 200) / 2;
    const dstCx = data.targetCenterXCont ?? width / 2;
    const dstHalfW = (data.targetWidthCont ?? 200) / 2;

    const ribbonPath = curvedRibbonPath(srcCx, srcHalfW, dstCx, dstHalfW, height);
    const centerPath = curvedCenterPath(srcCx, dstCx, height);

    return (
      <div style={{ width, height, pointerEvents: 'none' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="cont-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={color} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <path d={ribbonPath} fill="url(#cont-grad)" />
          <path
            d={centerPath}
            fill="none"
            stroke={color}
            strokeOpacity={0.15}
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        </svg>
      </div>
    );
  }

  return null;
});

FlowBandNode.displayName = 'FlowBandNode';
