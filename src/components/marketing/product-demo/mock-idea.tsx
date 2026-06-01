"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IDEA_TEXT, STICKY_BG, STICKY_TEXT } from "./demo-data";
import { useTypewriter } from "./use-typewriter";

/**
 * Step 1 — "Describe Your Idea". The idea types itself onto a yellow sticky.
 * The 💡 in the (top-left) eyebrow flickers while it "thinks" (types) and
 * settles once done; the Confirm button activates with a green tick on finish.
 */
export function MockIdea({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;
  const { shown, done } = useTypewriter(IDEA_TEXT, animate, 16);
  const flicker = animate && !done;

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
        {/* Eyebrow — the bulb (top-left) flickers while the idea types */}
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest opacity-70">
          <motion.span
            aria-hidden
            className="text-sm leading-none"
            animate={
              flicker
                ? { opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }
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
          The Idea
        </p>

        <p className="mt-3 min-h-[4rem] text-sm font-medium leading-relaxed">
          {shown}
          {flicker && (
            <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-current align-middle" />
          )}
        </p>

        {/* Confirm — inactive while typing, activates (green tick) when done */}
        <motion.div
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: animate ? 0.4 : 0 }}
          className="mt-4 flex justify-end"
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              done
                ? "bg-neutral-olive-200 text-neutral-olive-700 dark:bg-neutral-olive-800 dark:text-neutral-olive-200"
                : "bg-[var(--sticky-note-yellow-text)]/[0.1] text-[var(--sticky-note-yellow-text)]/60",
            )}
          >
            {done && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
            )}
            Confirm
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
