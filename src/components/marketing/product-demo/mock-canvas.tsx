"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STAKEHOLDERS, STICKY_BG, STICKY_TEXT } from "./demo-data";

/**
 * Step 2 (base) — a faux canvas that fills with stakeholder sticky notes.
 * Absolutely-positioned divs + a staggered scale/opacity entrance read as
 * "a board filling up" without mounting a real canvas engine.
 */
export function MockCanvas({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-muted/30"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--border) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      {STAKEHOLDERS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={animate ? { scale: 0.6, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: animate ? i * 0.12 : 0,
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            rotate: `${s.rotate}deg`,
          }}
          className={cn(
            "absolute w-28 rounded-md px-2.5 py-2 text-[11px] font-medium shadow-md shadow-black/10",
            STICKY_BG[s.color],
            STICKY_TEXT[s.color],
          )}
        >
          {s.label}
        </motion.div>
      ))}
    </div>
  );
}
