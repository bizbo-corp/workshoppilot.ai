'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { PhaseContainerShell, PHASE_ACCENTS, SHELL_HEADER_HEIGHT } from './phase-container-shell';

// Re-export for consumers
export { PHASE_ACCENTS };

export type PhaseContainerNodeData = {
  stepNumber: number;       // 1-4
  title: string;            // "Mind Mapping" etc
  isActive: boolean;        // true = content present
  width: number;
  height: number;
  showPlaceholder?: boolean; // true = render skeleton decorations (step 1 only)
};

export type PhaseContainerNodeType = Node<PhaseContainerNodeData, 'phaseContainerNode'>;

const HEADER_HEIGHT = SHELL_HEADER_HEIGHT;

// ── Theme-aware CSS color expressions ─────────────────────────────
const C = {
  cardBg:    'color-mix(in srgb, var(--color-card) 60%, transparent)',
  cardBorder:'color-mix(in srgb, var(--color-border) 40%, transparent)',
  imgBg:     'color-mix(in srgb, var(--color-muted-foreground) 15%, transparent)',
  textBar:   'color-mix(in srgb, var(--color-muted-foreground) 18%, transparent)',
  textBar2:  'color-mix(in srgb, var(--color-muted-foreground) 12%, transparent)',
  checkStroke:'var(--color-muted-foreground)',
  nodeFill:  'color-mix(in srgb, var(--color-muted) 40%, transparent)',
  nodeStroke: 'color-mix(in srgb, var(--color-muted-foreground) 20%, transparent)',
  lineStroke: 'color-mix(in srgb, var(--color-muted-foreground) 15%, transparent)',
  miniCardBg:'color-mix(in srgb, var(--color-card) 50%, transparent)',
  miniCardBorder:'color-mix(in srgb, var(--color-border) 35%, transparent)',
  miniImgBg: 'color-mix(in srgb, var(--color-muted-foreground) 12%, transparent)',
  miniText:  'color-mix(in srgb, var(--color-muted-foreground) 14%, transparent)',
  miniText2: 'color-mix(in srgb, var(--color-muted-foreground) 10%, transparent)',
};

// ── Skeleton decorative content per step ──────────────────────────

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
          style={{ stroke: C.lineStroke }}
          strokeWidth={1.5}
        />
      ))}
      {pts.map((p, i) => (
        <rect
          key={i}
          x={p.x - p.w / 2} y={p.y - p.h / 2}
          width={p.w} height={p.h}
          rx={6}
          style={{ fill: C.nodeFill, stroke: C.nodeStroke }}
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}

/**
 * Skeleton card: image header area (~55% height) + two text lines below.
 */
function SkeletonCard({
  x, y, w, h,
  showCheck,
}: {
  x: number; y: number; w: number; h: number;
  showCheck?: boolean;
}) {
  const pad = 14;
  const imgH = (h - pad * 2 - 36) * 0.65;
  const textTop = y + pad + imgH + 12;
  const lineH = 7;
  const lineGap = 7;
  const line1W = (w - pad * 2) * 0.80;
  const line2W = (w - pad * 2) * 0.52;

  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        rx={8}
        style={{ fill: C.cardBg, stroke: C.cardBorder }}
        strokeWidth={1}
      />
      <rect
        x={x + pad} y={y + pad}
        width={w - pad * 2} height={imgH}
        rx={5}
        style={{ fill: C.imgBg }}
      />
      {showCheck && (
        <path
          d={`M ${x + w / 2 - 12} ${y + pad + imgH / 2 + 1} l 8 8 l 14 -14`}
          fill="none"
          style={{ stroke: C.checkStroke }}
          strokeOpacity={0.55}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <rect
        x={x + pad} y={textTop}
        width={line1W} height={lineH}
        rx={3}
        style={{ fill: C.textBar }}
      />
      <rect
        x={x + pad} y={textTop + lineH + lineGap}
        width={line2W} height={lineH}
        rx={3}
        style={{ fill: C.textBar2 }}
      />
    </g>
  );
}

/**
 * Brain rewriting skeleton card: 2x2 grid of mini cards,
 * each mini card has its own image header + two text lines.
 */
function BrainRewritingCard({
  x, y, w, h,
}: {
  x: number; y: number; w: number; h: number;
}) {
  const outerPad = 10;
  const gridGap = 8;
  const cellW = (w - outerPad * 2 - gridGap) / 2;
  const cellH = (h - outerPad * 2 - gridGap) / 2;
  const cellPad = 7;
  const miniImgH = (cellH - cellPad * 2 - 18) * 0.6;
  const miniLineH = 5;
  const miniLineGap = 4;

  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        rx={8}
        style={{ fill: C.cardBg, stroke: C.cardBorder }}
        strokeWidth={1}
      />
      {[0, 1, 2, 3].map((i) => {
        const cr = Math.floor(i / 2);
        const cc = i % 2;
        const cx = x + outerPad + cc * (cellW + gridGap);
        const cy = y + outerPad + cr * (cellH + gridGap);
        const miniTextTop = cy + cellPad + miniImgH + 5;
        const miniLine1W = (cellW - cellPad * 2) * 0.78;
        const miniLine2W = (cellW - cellPad * 2) * 0.50;

        return (
          <g key={`cell-${i}`}>
            <rect
              x={cx} y={cy} width={cellW} height={cellH}
              rx={4}
              style={{ fill: C.miniCardBg, stroke: C.miniCardBorder }}
              strokeWidth={0.75}
            />
            <rect
              x={cx + cellPad} y={cy + cellPad}
              width={cellW - cellPad * 2} height={Math.max(miniImgH, 12)}
              rx={3}
              style={{ fill: C.miniImgBg }}
            />
            <rect
              x={cx + cellPad} y={miniTextTop}
              width={miniLine1W} height={miniLineH}
              rx={2}
              style={{ fill: C.miniText }}
            />
            <rect
              x={cx + cellPad} y={miniTextTop + miniLineH + miniLineGap}
              width={miniLine2W} height={miniLineH}
              rx={2}
              style={{ fill: C.miniText2 }}
            />
          </g>
        );
      })}
    </g>
  );
}

/** Step 2: 4x2 grid of skeleton cards */
function CrazyEightsPlaceholder({ width, height }: { width: number; height: number }) {
  const padX = 24;
  const padTop = HEADER_HEIGHT + 16;
  const padBottom = 20;
  const cols = 4;
  const rows = 2;
  const gap = 16;
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
          <SkeletonCard
            key={`${r}-${c}`}
            x={padX + c * (boxW + gap)}
            y={padTop + r * (boxH + gap)}
            w={boxW}
            h={boxH}
          />
        )),
      )}
    </svg>
  );
}

/** Step 3: 4x2 grid of skeleton cards, some with checkmarks */
function VotingPlaceholder({ width, height }: { width: number; height: number }) {
  const padX = 24;
  const padTop = HEADER_HEIGHT + 16;
  const padBottom = 20;
  const cols = 4;
  const rows = 2;
  const gap = 16;
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
          return (
            <SkeletonCard
              key={idx}
              x={padX + c * (boxW + gap)}
              y={padTop + r * (boxH + gap)}
              w={boxW}
              h={boxH}
              showCheck={checked.has(idx)}
            />
          );
        }),
      )}
    </svg>
  );
}

/** Step 4: 3x2 grid of brain rewriting cards (each with 2x2 mini-card grid) */
function BrainRewritingPlaceholder({ width, height }: { width: number; height: number }) {
  const padX = 24;
  const padTop = HEADER_HEIGHT + 16;
  const padBottom = 20;
  const cols = 3;
  const rows = 2;
  const gap = 18;
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
          <BrainRewritingCard
            key={`${r}-${c}`}
            x={padX + c * (boxW + gap)}
            y={padTop + r * (boxH + gap)}
            w={boxW}
            h={boxH}
          />
        )),
      )}
    </svg>
  );
}

// ── Skeleton placeholder map ─────────────────────────────────────
const SKELETON_MAP: Record<number, (w: number, h: number) => React.ReactNode> = {
  1: (w, h) => <MindMapPlaceholder width={w} height={h} />,
  2: (w, h) => <CrazyEightsPlaceholder width={w} height={h} />,
  3: (w, h) => <VotingPlaceholder width={w} height={h} />,
  4: (w, h) => <BrainRewritingPlaceholder width={w} height={h} />,
};

// ── Main component ────────────────────────────────────────────────

function PhaseContainerNodeComponent({ data }: NodeProps<PhaseContainerNodeType>) {
  const { stepNumber, title, isActive, width, height, showPlaceholder } = data;

  const skeletonContent = !isActive
    ? SKELETON_MAP[stepNumber]?.(width, height)
    : (stepNumber === 1 && showPlaceholder)
      ? SKELETON_MAP[1]?.(width, height)
      : undefined;

  return (
    <PhaseContainerShell
      stepNumber={stepNumber}
      title={title}
      isActive={isActive}
      width={width}
      height={height}
      showPlaceholder={stepNumber === 1 && showPlaceholder}
      placeholderContent={skeletonContent}
    />
  );
}

export const PhaseContainerNode = memo(PhaseContainerNodeComponent);
