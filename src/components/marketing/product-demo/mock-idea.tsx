"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IDEA_SUGGESTIONS,
  IDEA_TEXT,
  STICKY_BG,
  STICKY_TEXT,
} from "./demo-data";
import { useTypewriter } from "./use-typewriter";

/**
 * Step 1 — "Describe Your Idea". The idea types onto a yellow sticky. While it
 * types, a glowing light-streak traces around the sticky (passing behind the
 * lightbulb that sits centered above it). Confirm is a faint button on the
 * sticky that becomes a green outline button once the idea is written.
 */
export function MockIdea({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;
  const { shown, done } = useTypewriter(IDEA_TEXT, animate, 16);
  const flicker = animate && !done;

  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <div className="relative w-full max-w-sm">
        {/* Light guide line + travelling comet streak (hero-style), concentric
            8px outside the card's rounded-2xl (16px) corners → rx = 16 + 8. */}
        {animate && (
          <svg
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 overflow-visible"
            style={{ width: "calc(100% + 16px)", height: "calc(100% + 16px)" }}
          >
            <defs>
              <filter id="ideaStreakGlow">
                <feGaussianBlur stdDeviation="2.5" />
              </filter>
            </defs>

            {/* Faint resting guide line the streak rides along */}
            <rect
              width="100%"
              height="100%"
              rx="24"
              ry="24"
              fill="none"
              stroke="var(--olive-300)"
              strokeWidth="0.5"
              opacity={0.5}
            />

            {/* Comet streak — three layers sharing a leading edge: blurred glow,
                mid, and a bright sharp core (graduated dash lengths). */}
            {[
              { len: 42, width: 7, opacity: 0.2, color: "var(--olive-200)", glow: true },
              { len: 22, width: 3.5, opacity: 0.4, color: "var(--olive-300)" },
              { len: 8, width: 1.5, opacity: 0.9, color: "var(--olive-200)" },
            ].map((l) => (
              <motion.rect
                key={l.len}
                width="100%"
                height="100%"
                rx="24"
                ry="24"
                fill="none"
                stroke={l.color}
                strokeWidth={l.width}
                strokeOpacity={l.opacity}
                strokeLinecap="round"
                filter={l.glow ? "url(#ideaStreakGlow)" : undefined}
                pathLength={100}
                strokeDasharray={`${l.len} ${100 - l.len}`}
                animate={{ strokeDashoffset: [l.len, l.len - 100] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              />
            ))}
          </svg>
        )}

        {/* Lightbulb — centered above the card; the streak passes behind it */}
        <motion.span
          aria-hidden
          className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[70%] text-4xl leading-none drop-shadow-[0_3px_8px_rgba(0,0,0,0.18)]"
          animate={
            flicker
              ? { opacity: [1, 0.35, 1], scale: [1, 1.12, 1] }
              : { opacity: 1, scale: 1 }
          }
          transition={
            flicker
              ? { repeat: Infinity, duration: 0.7, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        >
          💡
        </motion.span>

        {/* The sticky card */}
        <motion.div
          initial={animate ? { scale: 0.92, opacity: 0, y: 10 } : false}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className={cn(
            "relative z-10 w-full rounded-2xl p-5 shadow-xl shadow-black/10",
            STICKY_BG.yellow,
            STICKY_TEXT.yellow,
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
            The Idea
          </p>

          <p className="mt-3 min-h-[4rem] text-sm font-medium leading-relaxed">
            {shown}
            {flicker && (
              <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-current align-middle" />
            )}
          </p>

          <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest opacity-60">
            Need a starting point?
          </p>
          <div className="mt-2 space-y-1.5">
            {IDEA_SUGGESTIONS.map((s, i) => (
              <motion.div
                key={s}
                initial={animate ? { opacity: 0, x: -6 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: animate ? 0.3 + i * 0.1 : 0 }}
                className="rounded-md bg-[var(--sticky-note-yellow-text)]/[0.07] px-2.5 py-1.5 text-xs"
              >
                {s}
              </motion.div>
            ))}
          </div>

          {/* Confirm — faint on the sticky, green outline once confirmed */}
          <div className="mt-4 flex justify-end">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
                done
                  ? "border-green-500 text-green-700 dark:border-green-500/70 dark:text-green-400"
                  : "border-[var(--sticky-note-yellow-text)]/20 text-[var(--sticky-note-yellow-text)]/40",
              )}
            >
              {done && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
              )}
              Confirm
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
