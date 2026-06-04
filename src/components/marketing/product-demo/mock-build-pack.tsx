"use client";

import type { CSSProperties, ReactNode, SVGProps } from "react";
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

/** Shared props for the tiny per-slide thumbnail graphics. */
const GRAPHIC_PROPS: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-6 w-6",
};

/** Sticky-note colour assigned to each slide thumbnail's icon. */
const SLIDE_COLOR: Record<string, string> = {
  Problem: "yellow",
  Personas: "blue",
  "Journey Map": "green",
  Solution: "orange",
  Concepts: "purple",
  Roadmap: "red",
};

/**
 * Icon stroke colour per sticky-note hue — a mid tint of each sticky colour
 * (between the pale pastel and the dark text variant). Fixed across light and
 * dark mode so the thumbnails read the same either way.
 */
const SLIDE_ICON_COLOR: Record<string, string> = {
  yellow: "#d9a521",
  blue: "#3f86c9",
  green: "#3aa55c",
  orange: "#db8334",
  purple: "#8259cf",
  red: "#db5240",
};

/**
 * Super-simple, PowerPoint-thumbnail-style line graphic for each deck slide.
 * Monochrome (currentColor) so it themes cleanly in light/dark.
 */
function SlideGraphic({ title }: { title: string }) {
  switch (title) {
    // Problem — a light bulb (the spark of the idea).
    case "Problem":
      return (
        <svg {...GRAPHIC_PROPS}>
          <path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6v.5h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z" />
          <line x1="9.5" y1="18" x2="14.5" y2="18" />
          <line x1="10.5" y1="20.5" x2="13.5" y2="20.5" />
        </svg>
      );
    // Personas — a profile card: avatar + a couple of detail lines.
    case "Personas":
      return (
        <svg {...GRAPHIC_PROPS}>
          <circle cx="8" cy="8.5" r="3" />
          <path d="M3.5 18c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
          <line x1="16" y1="8" x2="21" y2="8" />
          <line x1="16" y1="12" x2="20" y2="12" />
        </svg>
      );
    // Journey Map — three connected steps in a flow diagram.
    case "Journey Map":
      return (
        <svg {...GRAPHIC_PROPS}>
          <rect x="2.5" y="9.5" width="5" height="5" rx="1" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
          <rect x="16.5" y="9.5" width="5" height="5" rx="1" />
          <path d="M7.5 12h2M14.5 12h2" />
        </svg>
      );
    // Solution — a concept sheet: header block over body lines.
    case "Solution":
      return (
        <svg {...GRAPHIC_PROPS}>
          <rect x="5" y="3" width="14" height="18" rx="1.5" />
          <rect
            x="8"
            y="6.5"
            width="8"
            height="2.5"
            rx="0.75"
            fill="currentColor"
            stroke="none"
          />
          <line x1="8" y1="12.5" x2="16" y2="12.5" />
          <line x1="8" y1="15.5" x2="13.5" y2="15.5" />
        </svg>
      );
    // Concepts — a quick prototype: a wireframe app window.
    case "Concepts":
      return (
        <svg {...GRAPHIC_PROPS}>
          <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
          <line x1="3" y1="8.5" x2="21" y2="8.5" />
          <circle cx="5.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
          <circle cx="7.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
          <rect x="6" y="11" width="5" height="5.5" rx="1" />
          <line x1="13.5" y1="11.5" x2="18" y2="11.5" />
          <line x1="13.5" y1="14" x2="18" y2="14" />
          <line x1="13.5" y1="16.5" x2="16" y2="16.5" />
        </svg>
      );
    // Roadmap — a Gantt chart: staggered horizontal bars.
    case "Roadmap":
      return (
        <svg {...GRAPHIC_PROPS} stroke="none">
          <rect x="3" y="5" width="9" height="3" rx="1.5" fill="currentColor" />
          <rect
            x="7"
            y="10.5"
            width="10"
            height="3"
            rx="1.5"
            fill="currentColor"
            opacity="0.7"
          />
          <rect
            x="11"
            y="16"
            width="8"
            height="3"
            rx="1.5"
            fill="currentColor"
            opacity="0.45"
          />
        </svg>
      );
    default:
      return null;
  }
}

/** Stakeholder presentation deck. */
function SlideDeck({ animate }: { animate: boolean }) {
  return (
    <motion.div
      {...panelMotion(animate, 0.05)}
      style={{ left: "4%", top: "2%", width: "48%" }}
      className={cn(PANEL_BASE, "z-10 rounded-md shadow-xl shadow-black/10")}
    >
      <div className="h-1.5 w-full bg-muted-foreground/20" />
      <div className="p-3">
        <p className="font-serif text-sm text-foreground">
          {BUILD_PACK_DECK_TITLE}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {BUILD_PACK_SLIDES.map((s) => (
            <div
              key={s.n}
              className="relative rounded-md border border-border bg-background p-1.5"
            >
              <span className="absolute left-1 top-0.5 z-10 text-[7px] font-medium text-muted-foreground">
                {s.n}
              </span>
              <div
                className="flex h-11 items-center justify-center"
                style={{ color: SLIDE_ICON_COLOR[SLIDE_COLOR[s.title]] }}
              >
                <SlideGraphic title={s.title} />
              </div>
              <p className="mt-1 truncate text-[7px] font-semibold text-foreground">
                {s.title}
              </p>
              <div className="mt-1 h-1 w-3/4 rounded-full bg-muted-foreground/20" />
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

export function MockBuildPack({
  play = true,
  showCaptions = true,
}: {
  play?: boolean;
  /** Floating audience annotations. Hidden on mobile, where the tight frame
      makes them overlap the panels. */
  showCaptions?: boolean;
}) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;

  return (
    <div className="relative h-full w-full">
      <SlideDeck animate={animate} />
      <Roadmap animate={animate} />
      <MdFile animate={animate} />

      {showCaptions && (
        <>
          <Caption style={{ left: "4%", top: "46%" }}>
            Workshop slide deck for investor buy-in
          </Caption>
          <Caption style={{ right: "0%", top: "92%", textAlign: "right" }}>
            Build pack for development
          </Caption>
          <Caption style={{ left: "0%", top: "98%" }}>
            Feature prioritisation for product teams
          </Caption>
        </>
      )}
    </div>
  );
}
