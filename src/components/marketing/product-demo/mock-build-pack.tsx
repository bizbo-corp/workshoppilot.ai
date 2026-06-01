"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, FileCode, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BUILD_PACK_DECK_TITLE,
  BUILD_PACK_FEATURES,
  BUILD_PACK_FILENAME,
  BUILD_PACK_MD,
  BUILD_PACK_SLIDES,
  HANDOFF_AGENTS,
} from "./demo-data";

/**
 * Step 3 — the payoff. A layered composition of the three Build Pack outputs:
 *   • Stakeholder slide deck ("Concepts" PowerPoint-style window)
 *   • Developer build pack (vetclinic-prd.md markdown file)
 *   • Product feature-prioritisation roadmap (draggable list)
 * Each is static styled markup (no real PPT / markdown renderer); panels fade
 * up in a staggered cascade. `play={false}` renders the final composed state.
 */

function panelMotion(animate: boolean, delay: number) {
  return {
    initial: animate ? { opacity: 0, y: 16 } : false,
    animate: { opacity: 1, y: 0 },
    transition: {
      delay: animate ? delay : 0,
      type: "spring" as const,
      stiffness: 220,
      damping: 26,
    },
  };
}

const PANEL_BASE =
  "absolute overflow-hidden rounded-xl border border-border bg-card";

/** Small floating annotation naming each output's audience. */
function Caption({
  children,
  style,
}: {
  children: ReactNode;
  style: CSSProperties;
}) {
  return (
    <span
      style={style}
      className="pointer-events-none absolute z-40 max-w-[44%] text-[11px] font-semibold uppercase tracking-wide leading-tight text-muted-foreground"
    >
      {children}
    </span>
  );
}

/** Stakeholder presentation deck. */
function SlideDeck({ animate }: { animate: boolean }) {
  return (
    <motion.div
      {...panelMotion(animate, 0.05)}
      style={{ left: "0%", top: "2%", width: "48%", height: "42%" }}
      className={cn(PANEL_BASE, "z-10 shadow-xl shadow-black/10")}
    >
      <div className="h-2 w-full bg-foreground" />
      <div className="p-3">
        <p className="font-serif text-sm text-foreground">
          {BUILD_PACK_DECK_TITLE}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {BUILD_PACK_SLIDES.map((s) => (
            <div
              key={s.n}
              className="rounded-md border border-border bg-background p-1.5"
            >
              <span className="text-[7px] font-medium text-muted-foreground">
                {s.n}
              </span>
              <div className="mt-0.5 h-7 rounded bg-muted" />
              <p className="mt-1 truncate text-[7px] font-semibold text-foreground">
                {s.title}
              </p>
              <p className="truncate text-[6px] text-muted-foreground">
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** Product feature-prioritisation roadmap (draggable). */
function Roadmap({ animate }: { animate: boolean }) {
  // Re-order one item mid-way to read as live re-prioritisation.
  const [order, setOrder] = useState(BUILD_PACK_FEATURES);
  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => {
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(2, 1);
        next.splice(1, 0, moved);
        return next;
      });
    }, 2600);
    return () => clearTimeout(t);
  }, [animate]);

  return (
    <motion.div
      {...panelMotion(animate, 0.12)}
      style={{ left: "0%", top: "52%", width: "52%", height: "44%" }}
      className={cn(PANEL_BASE, "z-20 shadow-xl shadow-black/10")}
    >
      <div className="divide-y divide-border">
        {order.map((f, i) => (
          <motion.div
            key={f.title}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
            className={cn(
              "flex items-start gap-2 p-2.5",
              i === 0 && "bg-muted/50 shadow-sm",
            )}
          >
            <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
            <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[11px] font-semibold text-foreground">
                  {f.title}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1 py-0.5 text-[8px] font-medium",
                    f.priority === "Must-have"
                      ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300"
                      : f.priority === "Should-have"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                        : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
                  )}
                >
                  {f.priority}
                </span>
              </div>
              <p className="truncate text-[9px] text-muted-foreground">
                {f.desc}
              </p>
              <p className="mt-0.5 text-[8px] text-muted-foreground/70">
                › {f.sub} subfeatures
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/** Developer build pack — the markdown file. */
function MdFile({ animate }: { animate: boolean }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  // Reveal the markdown line-by-line as if it's being generated.
  const [count, setCount] = useState(animate ? 0 : BUILD_PACK_MD.length);
  useEffect(() => {
    if (!animate) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= BUILD_PACK_MD.length) clearInterval(id);
    }, 150);
    return () => clearInterval(id);
  }, [animate]);
  // Follow the newest line so the file appears to scroll as it grows.
  useEffect(() => {
    if (!animate) return;
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, animate]);
  const done = count >= BUILD_PACK_MD.length;

  return (
    <motion.div
      {...panelMotion(animate, 0.2)}
      style={{ left: "44%", top: "16%", width: "56%", height: "74%" }}
      className={cn(
        PANEL_BASE,
        "z-30 flex flex-col shadow-2xl shadow-black/15",
      )}
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

      {/* Markdown body — types out + auto-scrolls as it "generates" */}
      <div
        ref={bodyRef}
        className="flex-1 overflow-hidden px-3 py-2 font-mono text-[10px] leading-[1.5]"
      >
        {BUILD_PACK_MD.slice(0, count).map((line, i) =>
          line.kind === "blank" ? (
            <div key={i} className="h-2" />
          ) : (
            <p
              key={i}
              className={cn(
                line.kind === "h1" && "text-[12px] font-semibold text-foreground",
                line.kind === "h2" &&
                  "mt-1 font-semibold text-olive-700 dark:text-olive-300",
                line.kind === "li" && "text-muted-foreground",
                line.kind === "p" && "text-foreground/80",
              )}
            >
              {line.text}
            </p>
          ),
        )}
        {animate && !done && (
          <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-olive-600 align-middle dark:bg-olive-400" />
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
  );
}

export function MockBuildPack({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;

  return (
    <div className="relative h-full w-full">
      <SlideDeck animate={animate} />
      <Roadmap animate={animate} />
      <MdFile animate={animate} />

      <Caption style={{ left: "0%", top: "46%" }}>
        Workshop slide deck for investor buy-in
      </Caption>
      <Caption style={{ right: "0%", top: "92%", textAlign: "right" }}>
        Build pack for development
      </Caption>
      <Caption style={{ left: "0%", top: "98%" }}>
        Feature prioritisation for product teams
      </Caption>
    </div>
  );
}
