"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IDEA_SUGGESTIONS,
  IDEA_TEXT,
  STICKY_BG,
  STICKY_TEXT,
} from "./demo-data";
import { useTypewriter } from "./use-typewriter";

/**
 * Step 1 — "Describe Your Idea". A yellow sticky note where the idea types
 * itself in, with starter suggestions and a Confirm affordance.
 */
export function MockIdea({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;
  const { shown, done } = useTypewriter(IDEA_TEXT, play, 16);

  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <motion.div
        initial={animate ? { scale: 0.92, opacity: 0, y: 10 } : false}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className={cn(
          "w-full max-w-sm rounded-2xl p-5 shadow-xl shadow-black/10",
          STICKY_BG.yellow,
          STICKY_TEXT.yellow,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
          The Idea
        </p>

        <p className="mt-3 min-h-[4rem] text-sm font-medium leading-relaxed">
          {shown}
          {animate && !done && (
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
              transition={{ delay: animate ? 0.25 + i * 0.1 : 0 }}
              className="rounded-md bg-[var(--sticky-note-yellow-text)]/[0.07] px-2.5 py-1.5 text-xs"
            >
              {s}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: animate ? 0.7 : 0 }}
          className="mt-4 flex justify-end"
        >
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--sticky-note-yellow-text)]/[0.12] px-3 py-1.5 text-xs font-semibold">
            <Check className="h-3.5 w-3.5" />
            Confirm
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
