'use client';

/**
 * IdeationTableOverlay
 *
 * Viewport-aware SVG overlay that frames the multiplayer ideation canvas as a TABLE:
 * a rounded outer border around the whole grid plus left-margin row labels
 * ("Mind Map", "Crazy 8s", "Voting"). The participant columns themselves are drawn by
 * the per-owner OwnerZone nodes; this overlay supplies the row labelling and the unifying
 * frame so the fixed grid reads as one solid table.
 *
 * Rendered as an SVG at z-[3] (below the React Flow renderer at z-4), so it never blocks
 * interaction. It only draws at the table's outer edges + the empty left margin, which are
 * not covered by nodes, so occlusion isn't an issue. All coordinates transform with pan/zoom.
 */

import {
  useStore as useReactFlowStore,
  type ReactFlowState,
} from '@xyflow/react';
import { useTheme } from 'next-themes';
import { Icon, type IconName } from '@/components/ui/icon';

const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

export interface IdeationTableRow {
  key: string;
  label: string;
  /** Store-space top Y of the row band. */
  top: number;
  /** Store-space height of the row band. */
  height: number;
}

interface IdeationTableOverlayProps {
  /** Store-space left edge of the table. */
  leftX: number;
  /** Store-space right edge of the table. */
  rightX: number;
  /** Visible rows, top-to-bottom. */
  rows: IdeationTableRow[];
}

const ROW_ICONS: Record<string, IconName> = {
  'mind-map': 'network',
  'crazy-8s': 'zap',
  voting: 'vote',
};

/** Width of the left label gutter, in store units. */
const LABEL_GUTTER = 220;
/** Gap between the label gutter and the table's left edge, in store units. */
const LABEL_GAP = 40;

export function IdeationTableOverlay({ leftX, rightX, rows }: IdeationTableOverlayProps) {
  const { x, y, zoom } = useReactFlowStore(viewportSelector);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (rows.length === 0) return null;

  const toScreen = (canvasX: number, canvasY: number) => ({
    x: canvasX * zoom + x,
    y: canvasY * zoom + y,
  });

  const top = rows[0].top;
  const lastRow = rows[rows.length - 1];
  const bottom = lastRow.top + lastRow.height;

  const frame = toScreen(leftX, top);
  const frameW = (rightX - leftX) * zoom;
  const frameH = (bottom - top) * zoom;
  const radius = 18 * zoom;

  const lineColor = isDark ? '#5a6b3f' : '#c4cbb4';
  const labelColor = isDark ? '#9fb37a' : '#6b7a4a';

  return (
    <svg className="absolute inset-0 pointer-events-none z-[3]" width="100%" height="100%">
      {/* Outer table frame */}
      <rect
        x={frame.x}
        y={frame.y}
        width={frameW}
        height={frameH}
        rx={radius}
        ry={radius}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeOpacity={0.8}
      />

      {/* Row boundary lines (drawn in the left margin only, where nothing occludes them,
          extending a short way under the frame edge as a tick) */}
      {rows.slice(1).map((row) => {
        const edge = toScreen(leftX, row.top);
        return (
          <line
            key={`rowline-${row.key}`}
            x1={edge.x - (LABEL_GAP + LABEL_GUTTER) * zoom}
            y1={edge.y}
            x2={edge.x}
            y2={edge.y}
            stroke={lineColor}
            strokeWidth={1.5}
            strokeOpacity={0.7}
          />
        );
      })}

      {/* Left-margin row labels */}
      {rows.map((row) => {
        const mid = toScreen(leftX - LABEL_GAP - LABEL_GUTTER / 2, row.top + row.height / 2);
        const w = LABEL_GUTTER * zoom;
        const iconName = ROW_ICONS[row.key];
        return (
          <foreignObject
            key={`rowlabel-${row.key}`}
            x={mid.x - w / 2}
            y={mid.y - 28}
            width={w}
            height={56}
            className="pointer-events-none"
          >
            <div
              className="flex flex-col items-center justify-center h-full gap-1"
              style={{ color: labelColor }}
            >
              {iconName && <Icon name={iconName} style={{ width: 26 * zoom, height: 26 * zoom }} />}
              <span
                className="font-semibold text-center leading-tight"
                style={{ fontSize: Math.max(11, 15 * zoom) }}
              >
                {row.label}
              </span>
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}
