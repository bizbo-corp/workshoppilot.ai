"use client";

import { useId } from "react";
import { motion } from "framer-motion";

/**
 * Light guide line + travelling comet streak in the hero "light-trails" style
 * (`light-trails.tsx`): a faint resting outline plus three layers that share a
 * leading edge — a blurred outer glow, a mid layer, and a bright sharp core.
 *
 * Renders an absolutely-positioned SVG sized to the parent box + 16px and
 * centered, so the stroke sits concentric 8px OUTSIDE a rounded element. Place
 * it as a sibling BEHIND the element (give the foreground a higher z-index) so
 * only the offset halo shows around the edge.
 *
 * `radius` = the element's own corner radius in px; the streak adds the 8px
 * offset (e.g. rounded-2xl/16 → 24, rounded-xl/12 → 20).
 */
const LAYERS = [
  { len: 42, width: 7, opacity: 0.2, color: "var(--olive-200)", glow: true },
  { len: 22, width: 3.5, opacity: 0.4, color: "var(--olive-300)", glow: false },
  { len: 8, width: 1.5, opacity: 0.9, color: "var(--olive-200)", glow: false },
];

export function LightStreak({ radius = 16 }: { radius?: number }) {
  const rawId = useId();
  const glowId = `streak-glow-${rawId.replace(/[:]/g, "")}`;
  const rx = radius + 8;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 overflow-visible"
      style={{ width: "calc(100% + 16px)", height: "calc(100% + 16px)" }}
    >
      <defs>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Faint resting guide line the streak rides along */}
      <rect
        width="100%"
        height="100%"
        rx={rx}
        ry={rx}
        fill="none"
        stroke="var(--olive-300)"
        strokeWidth="0.5"
        opacity={0.5}
      />

      {/* Comet streak — three layers sharing a leading edge */}
      {LAYERS.map((l) => (
        <motion.rect
          key={l.len}
          width="100%"
          height="100%"
          rx={rx}
          ry={rx}
          fill="none"
          stroke={l.color}
          strokeWidth={l.width}
          strokeOpacity={l.opacity}
          strokeLinecap="round"
          filter={l.glow ? `url(#${glowId})` : undefined}
          pathLength={100}
          strokeDasharray={`${l.len} ${100 - l.len}`}
          animate={{ strokeDashoffset: [l.len, l.len - 100] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        />
      ))}
    </svg>
  );
}
