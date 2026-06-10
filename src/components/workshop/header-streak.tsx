"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Horizontal light streak for the chat header bar, in the hero "light-trails"
 * style ({@link ../marketing/product-demo/light-streak.tsx}): a travelling comet
 * built from three layers that share a leading edge — a blurred outer glow, a
 * mid layer, and a bright sharp core — sweeping left→right along the bar.
 *
 * Unlike the hero version there is NO resting guide line: the streak only shows
 * while `active` (page-load intro window or while Wanda is thinking), fading in
 * and out so it never hard-cuts.
 *
 * The comet has a long, graded fading tail (longest faint layer → bright short
 * core) and bounces back and forth along the bar via a mirrored repeat.
 */
const LAYERS = [
  { len: 42, width: 6, opacity: 0.06, color: "var(--olive-300)", glow: true },
  { len: 28, width: 5, opacity: 0.12, color: "var(--olive-200)", glow: true },
  { len: 17, width: 3.5, opacity: 0.22, color: "var(--olive-300)", glow: false },
  { len: 8, width: 2, opacity: 0.45, color: "var(--olive-200)", glow: false },
  { len: 3, width: 1, opacity: 0.9, color: "var(--olive-200)", glow: false },
];

export function HeaderStreak({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const rawId = useId();
  const glowId = `header-streak-${rawId.replace(/[:]/g, "")}`;

  return (
    <AnimatePresence>
      {active && (
        <motion.svg
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          preserveAspectRatio="none"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-0 h-2 w-full overflow-visible",
            className,
          )}
        >
          <defs>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
          </defs>
          {LAYERS.map((l) => (
            <motion.line
              key={l.len}
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke={l.color}
              strokeWidth={l.width}
              strokeOpacity={l.opacity}
              strokeLinecap="round"
              filter={l.glow ? `url(#${glowId})` : undefined}
              pathLength={100}
              strokeDasharray={`${l.len} ${100 - l.len}`}
              initial={{ strokeDashoffset: l.len }}
              animate={{ strokeDashoffset: l.len - 100 }}
              transition={{
                repeat: Infinity,
                repeatType: "mirror",
                duration: 1.4,
                // easeInOutSine — natural harmonic swing: fastest mid-bar,
                // decelerating smoothly into each turnaround like a pendulum.
                ease: [0.37, 0, 0.63, 1],
              }}
            />
          ))}
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
