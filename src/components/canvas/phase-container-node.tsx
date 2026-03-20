'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

export type PhaseContainerNodeData = {
  stepNumber: number;       // 1-4
  title: string;            // "Mind Mapping" etc
  isActive: boolean;        // true = content present
  width: number;
  height: number;
  showPlaceholder?: boolean; // true = render skeleton decorations (step 1 only)
};

export type PhaseContainerNodeType = Node<PhaseContainerNodeData, 'phaseContainerNode'>;

// Phase accent colors for active containers
const PHASE_ACCENTS: Record<number, string> = {
  1: '#6b7280', // gray — mind mapping
  2: '#f59e0b', // amber — crazy eights
  3: '#3b82f6', // blue — voting
  4: '#8b5cf6', // purple — brain rewriting
};

// Grayscale palette for skeleton decorations
const SKEL_STROKE = '#71717a';   // zinc-500
const SKEL_FILL = '#a1a1aa';     // zinc-400
const SKEL_BG = '#d4d4d8';       // zinc-300

// ── Skeleton decorative content per step (all grayscale) ──────────

/** Step 1: Faint scattered mind-map nodes with connecting lines */
function MindMapPlaceholder({ width, height }: { width: number; height: number }) {
  const contentH = height - 56;
  const nodes = [
    { x: 0.50, y: 0.30, w: 90, h: 30 },
    { x: 0.30, y: 0.18, w: 65, h: 24 },
    { x: 0.70, y: 0.20, w: 72, h: 24 },
    { x: 0.16, y: 0.38, w: 58, h: 22 },
    { x: 0.38, y: 0.48, w: 68, h: 24 },
    { x: 0.64, y: 0.44, w: 62, h: 22 },
    { x: 0.84, y: 0.36, w: 54, h: 22 },
    { x: 0.24, y: 0.64, w: 58, h: 22 },
    { x: 0.52, y: 0.68, w: 66, h: 24 },
    { x: 0.78, y: 0.60, w: 56, h: 22 },
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 4], [0, 5],
    [1, 3], [1, 7], [2, 6], [2, 9],
    [4, 7], [5, 8], [5, 9],
  ];
  const pts = nodes.map(n => ({
    x: n.x * width,
    y: 56 + n.y * contentH,
    w: n.w,
    h: n.h,
  }));

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}
    >
      {edges.map(([f, t], i) => (
        <line
          key={i}
          x1={pts[f].x} y1={pts[f].y}
          x2={pts[t].x} y2={pts[t].y}
          stroke={SKEL_STROKE}
          strokeOpacity={0.18}
          strokeWidth={1.5}
        />
      ))}
      {pts.map((p, i) => (
        <rect
          key={i}
          x={p.x - p.w / 2} y={p.y - p.h / 2}
          width={p.w} height={p.h}
          rx={6}
          fill={SKEL_BG}
          fillOpacity={0.15}
          stroke={SKEL_STROKE}
          strokeOpacity={0.22}
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}

/** Step 2: 4x2 grid of blank boxes */
function CrazyEightsPlaceholder({ width, height }: { width: number; height: number }) {
  const padX = 24;
  const padTop = 56;
  const padBottom = 16;
  const cols = 4;
  const rows = 2;
  const gap = 14;
  const contentW = width - padX * 2;
  const contentH = height - padTop - padBottom;
  const boxW = (contentW - (cols - 1) * gap) / cols;
  const boxH = (contentH - (rows - 1) * gap) / rows;

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={padX + c * (boxW + gap)}
            y={padTop + r * (boxH + gap)}
            width={boxW}
            height={boxH}
            rx={8}
            fill={SKEL_BG}
            fillOpacity={0.12}
            stroke={SKEL_STROKE}
            strokeOpacity={0.28}
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        )),
      )}
    </svg>
  );
}

/** Step 3: Grid of boxes with checkmarks on a few */
function VotingPlaceholder({ width, height }: { width: number; height: number }) {
  const padX = 24;
  const padTop = 56;
  const padBottom = 16;
  const cols = 4;
  const rows = 2;
  const gap = 14;
  const contentW = width - padX * 2;
  const contentH = height - padTop - padBottom;
  const boxW = (contentW - (cols - 1) * gap) / cols;
  const boxH = (contentH - (rows - 1) * gap) / rows;
  const checked = new Set([0, 2, 5, 7]);

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const idx = r * cols + c;
          const bx = padX + c * (boxW + gap);
          const by = padTop + r * (boxH + gap);
          const isChecked = checked.has(idx);
          return (
            <g key={idx}>
              <rect
                x={bx} y={by}
                width={boxW} height={boxH}
                rx={8}
                fill={SKEL_BG}
                fillOpacity={isChecked ? 0.15 : 0.08}
                stroke={SKEL_STROKE}
                strokeOpacity={0.28}
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              {isChecked && (
                <path
                  d={`M ${bx + boxW / 2 - 10} ${by + boxH / 2 + 1} l 6 6 l 12 -12`}
                  fill="none"
                  stroke={SKEL_STROKE}
                  strokeOpacity={0.45}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}

/** Step 4: Grid of small 2x2 sub-matrices (brain rewriting) */
function BrainRewritingPlaceholder({ width, height }: { width: number; height: number }) {
  const padX = 24;
  const padTop = 56;
  const padBottom = 16;
  const cols = 3;
  const rows = 2;
  const gap = 18;
  const contentW = width - padX * 2;
  const contentH = height - padTop - padBottom;
  const boxW = (contentW - (cols - 1) * gap) / cols;
  const boxH = (contentH - (rows - 1) * gap) / rows;
  const subGap = 4;
  const subPad = 5;

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const bx = padX + c * (boxW + gap);
          const by = padTop + r * (boxH + gap);
          const innerW = boxW - subPad * 2;
          const innerH = boxH - subPad * 2;
          const cellW = (innerW - subGap) / 2;
          const cellH = (innerH - subGap) / 2;
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={bx} y={by}
                width={boxW} height={boxH}
                rx={8}
                fill={SKEL_BG}
                fillOpacity={0.10}
                stroke={SKEL_STROKE}
                strokeOpacity={0.25}
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              {[0, 1].map((sr) =>
                [0, 1].map((sc) => (
                  <rect
                    key={`sub-${sr}-${sc}`}
                    x={bx + subPad + sc * (cellW + subGap)}
                    y={by + subPad + sr * (cellH + subGap)}
                    width={cellW}
                    height={cellH}
                    rx={4}
                    fill={SKEL_FILL}
                    fillOpacity={0.10}
                    stroke={SKEL_STROKE}
                    strokeOpacity={0.15}
                    strokeWidth={0.75}
                  />
                )),
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}

// Solid header bar shared by skeleton containers
const HEADER_HEIGHT = 48;

function SkeletonHeader({ stepNumber, title }: { stepNumber: number; title: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: 'color-mix(in srgb, var(--color-muted) 60%, transparent)',
        borderBottom: '1px solid color-mix(in srgb, var(--color-border) 25%, transparent)',
        borderRadius: '14px 14px 0 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: SKEL_STROKE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#ffffff',
            opacity: 0.7,
          }}
        >
          {stepNumber}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: SKEL_STROKE, opacity: 0.8 }}>
          {title}
        </span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.4, fontStyle: 'italic' }}>
        Coming up
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

function PhaseContainerNodeComponent({ data }: NodeProps<PhaseContainerNodeType>) {
  const { stepNumber, title, isActive, width, height, showPlaceholder } = data;
  const accent = PHASE_ACCENTS[stepNumber] ?? '#6b7280';

  if (!isActive) {
    // Skeleton: solid header, semi-opaque background, grayscale content
    return (
      <div
        style={{
          width,
          height,
          border: `1.5px solid color-mix(in srgb, var(--color-border) 35%, transparent)`,
          borderRadius: 16,
          backgroundColor: 'color-mix(in srgb, var(--color-card) 70%, transparent)',
          pointerEvents: 'none',
          position: 'relative',
        }}
      >
        <SkeletonHeader stepNumber={stepNumber} title={title} />
        {stepNumber === 2 && <CrazyEightsPlaceholder width={width} height={height} />}
        {stepNumber === 3 && <VotingPlaceholder width={width} height={height} />}
        {stepNumber === 4 && <BrainRewritingPlaceholder width={width} height={height} />}
      </div>
    );
  }

  // Active: solid border, colored accent, full-opacity
  return (
    <div
      style={{
        width,
        height,
        border: `2px solid color-mix(in srgb, ${accent} 25%, transparent)`,
        borderRadius: 16,
        backgroundColor: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid color-mix(in srgb, var(--color-border) 15%, transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            {stepNumber}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>
            {title}
          </span>
        </div>
      </div>
      {/* Faint mind map scatter for step 1 — hidden once user has nodes */}
      {stepNumber === 1 && showPlaceholder && <MindMapPlaceholder width={width} height={height} />}
    </div>
  );
}

export const PhaseContainerNode = memo(PhaseContainerNodeComponent);
