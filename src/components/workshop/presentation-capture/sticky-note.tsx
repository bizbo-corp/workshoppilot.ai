'use client';

/**
 * Static sticky note component for presentation capture.
 * Renders a positioned sticky note matching canvas styling.
 */

const COLOR_MAP: Record<string, string> = {
  yellow: '#ffe299',
  pink: '#ffa8db',
  blue: '#a8daff',
  green: '#b3efbd',
  orange: '#ffd3a8',
  red: '#ffafa3',
  teal: '#b3f4ef',
  purple: '#d3bdff',
};

const TEXT_COLOR_MAP: Record<string, string> = {
  yellow: '#3d2a00',
  pink: '#5a1438',
  blue: '#0a1f4a',
  green: '#0a3818',
  orange: '#4a2805',
  red: '#4a1408',
  teal: '#0a3a35',
  purple: '#2a1252',
};

interface StickyNoteDivProps {
  text: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Scale factor to fit canvas coordinates into the capture viewport */
  scale?: number;
  /** Offset applied to canvas coordinates */
  offsetX?: number;
  offsetY?: number;
}

export function StickyNoteDiv({
  text,
  color = 'yellow',
  x,
  y,
  width,
  height,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
}: StickyNoteDivProps) {
  const bg = COLOR_MAP[color] || COLOR_MAP.yellow;
  const textCol = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.yellow;

  return (
    <div
      style={{
        position: 'absolute',
        left: (x + offsetX) * scale,
        top: (y + offsetY) * scale,
        width: width * scale,
        height: height * scale,
        backgroundColor: bg,
        borderRadius: 2,
        padding: 6 * scale,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontSize: Math.max(9, 12 * scale),
          lineHeight: 1.3,
          color: textCol,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </span>
    </div>
  );
}
