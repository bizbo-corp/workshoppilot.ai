"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BUILD_PACK_ITEMS } from "./demo-data";

/**
 * Step 3 — the payoff. A preview of the Build Pack: titled artifact cards
 * (PRD, Tech Specs, Journey Map, Feature Priorities) that slide up in.
 * Static styled cards — not the real prd-viewer-dialog.
 */
export function MockBuildPack({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;

  return (
    <div className="flex h-full w-full flex-col justify-center p-2">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-olive-600 dark:text-olive-400">
        Your Build Pack
      </p>
      <div className="grid grid-cols-2 gap-3">
        {BUILD_PACK_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={animate ? { opacity: 0, y: 14 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: animate ? i * 0.1 : 0,
                type: "spring",
                stiffness: 240,
                damping: 22,
              }}
              className="rounded-xl border border-border bg-card/95 p-3 shadow-sm"
            >
              <Icon className="h-5 w-5 text-olive-600 dark:text-olive-400" />
              <p className="mt-2 text-xs font-semibold leading-tight text-foreground">
                {item.title}
              </p>
              <span className="mt-1 inline-block font-mono text-[10px] text-muted-foreground">
                {item.format}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
