"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Copy, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BUILD_PACK_FILENAME,
  BUILD_PACK_MD,
  HANDOFF_AGENTS,
} from "./demo-data";

/**
 * Step 3 — the payoff. A markdown Build Pack file (`vetclinic-prd.md`) styled
 * like an editor preview: title bar, syntax-tinted markdown body that reveals
 * line by line, and a "Ready for <coding agents>" handoff footer. Static styled
 * markup — not a real markdown renderer.
 */
export function MockBuildPack({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;

  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <motion.div
        initial={animate ? { opacity: 0, scale: 0.94, y: 12 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="flex h-full max-h-[360px] w-full max-w-[460px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/10"
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <FileCode className="h-3.5 w-3.5 text-olive-600 dark:text-olive-400" />
          <span className="font-mono text-[11px] text-foreground">
            {BUILD_PACK_FILENAME}
          </span>
          <span className="ml-auto rounded bg-olive-100 px-1.5 py-0.5 text-[9px] font-medium text-olive-700 dark:bg-olive-900/60 dark:text-olive-300">
            Build Pack
          </span>
        </div>

        {/* Markdown body */}
        <div className="flex-1 overflow-hidden px-3 py-2 font-mono text-[10px] leading-[1.5]">
          {BUILD_PACK_MD.map((line, i) =>
            line.kind === "blank" ? (
              <div key={i} className="h-2" />
            ) : (
              <motion.p
                key={i}
                initial={animate ? { opacity: 0, y: 4 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: animate ? 0.15 + i * 0.05 : 0 }}
                className={cn(
                  line.kind === "h1" && "text-[12px] font-semibold text-foreground",
                  line.kind === "h2" &&
                    "mt-1 font-semibold text-olive-700 dark:text-olive-300",
                  line.kind === "li" && "text-muted-foreground",
                  line.kind === "p" && "text-foreground/80",
                )}
              >
                {line.text}
              </motion.p>
            ),
          )}
        </div>

        {/* Handoff footer */}
        <div className="flex items-center gap-1.5 border-t border-border bg-muted/40 px-3 py-1.5">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
            Ready for
          </span>
          {HANDOFF_AGENTS.map((a) => (
            <span
              key={a}
              className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium text-foreground/80"
            >
              {a}
            </span>
          ))}
          <Copy className="ml-auto h-3 w-3 text-muted-foreground" />
        </div>
      </motion.div>
    </div>
  );
}
