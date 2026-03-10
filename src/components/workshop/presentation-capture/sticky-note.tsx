'use client';

/**
 * Static sticky note component for presentation capture.
 * Renders a positioned sticky note matching canvas styling.
 */

const COLOR_MAP: Record<string, string> = {
  yellow: '#ede0c0',
  pink: '#e8c8c0',
  blue: '#b8c8d0',
  green: '#c0d8c0',
  orange: '#e0d0b8',
  red: '#d8b8a8',
};

const TEXT_COLOR_MAP: Record<string, string> = {
  yellow: '#6b5020',
  pink: '#784040',
  blue: '#344858',
  green: '#344a2c',
  orange: '#6b4420',
  red: '#684038',
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
