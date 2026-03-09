'use client';

/**
 * Static sticky note component for presentation capture.
 * Renders a positioned sticky note matching canvas styling.
 */

const COLOR_MAP: Record<string, string> = {
  yellow: '#fdf0a0',
  pink: '#fcc0d8',
  blue: '#a0d8f0',
  green: '#a0e8c0',
  orange: '#fdd0a0',
  red: '#f5b0a8',
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
          color: '#1a1a1a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </span>
    </div>
  );
}
