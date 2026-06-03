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
import { LightStreak } from "./light-streak";
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
      <div className="relative isolate w-full max-w-sm">
        {/* The problem card — sits behind the idea sticky, peeking out top-right.
            Decorative only (not interactive); `-z-10` keeps it below the light
            streak so the streak passes in front of it. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 translate-x-[18%] translate-y-[calc(-10%-20px)] rounded-2xl p-5 shadow-xl shadow-black/10",
            // Semi-opaque neutral-olive so the dotted background shows through;
            // blends over the page in both light and dark mode.
            "bg-neutral-olive-200/30 text-foreground dark:bg-neutral-olive-700/40",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
            The Problem
          </p>
        </div>

        {/* Light guide line + travelling comet streak, concentric 8px outside
            the card's rounded-2xl (16px) corners. */}
        {animate && <LightStreak radius={16} />}

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
                  ? "border-[var(--sticky-note-yellow-text)]/30 bg-[var(--sticky-note-yellow-text)]/[0.06] text-[var(--sticky-note-yellow-text)]"
                  : "border-[var(--sticky-note-yellow-text)]/20 text-[var(--sticky-note-yellow-text)]/40",
              )}
            >
              {done && (
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--sticky-note-yellow-text)]" />
              )}
              Confirm
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
