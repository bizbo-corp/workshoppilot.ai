"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { CircleStreak } from "./light-streak";

/**
 * The dotted-grid background shared by the demo "board" (all three steps).
 * Transparent base (no fill) with dots tinted via `--demo-dot` (darker in
 * light mode, lighter in dark — see globals.css).
 */
export const DOTTED_BG: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--demo-dot) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
};

/**
 * Section-level dotted board: spans the FULL width and height of the pinned
 * panel. Sits behind all three demo frames and is clipped only by the panel's
 * `overflow-hidden`. No background fill — dots only.
 */
export function DemoBoard() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={DOTTED_BG}
    />
  );
}

/**
 * Concentric stakeholder rings — STEP 2 ONLY. Sized in `vh` so they span the
 * full height of the section (bleeding past top/bottom, clipped by the panel),
 * centered horizontally near where the sticky notes sit. Fades with `active`.
 */
export function DemoRings({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      {/* Ring center — near the sticky-note cluster. Same faint stroke as the
          step 1 / step 3 line art (var(--olive-300), var(--demo-line-opacity),
          0.5px) for consistency. */}
      <div className="absolute left-[62%] top-1/2">
        {[112, 72, 38].map((vh) => (
          <div
            key={vh}
            className="absolute rounded-full border-[0.5px]"
            style={{
              width: `${vh}vh`,
              height: `${vh}vh`,
              transform: "translate(-50%, -50%)",
              borderColor: "var(--olive-300)",
              opacity: "var(--demo-line-opacity)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Overlapping-circles line art — STEP 1 ONLY. Three equal circles whose centres
 * form an equilateral triangle (a symmetric Venn): every pair overlaps by the
 * same amount and the three-way overlap is centred on the idea card. Clipped to
 * the panel by `overflow-hidden`. Strokes are as faint as step 3's circular
 * guide (`var(--olive-300)`, 0.5 opacity, 0.5px). Fades with `active`.
 *
 * Centres = card centre (≈1292,553 in the 1946×1105 art space) ± an equilateral
 * triangle of circumradius R/√3, with R = the centre-to-centre distance, so
 * each circle passes through the other two centres (classic 3-circle Venn).
 */
type Circle = { cx: number; cy: number; r: number };

const OVERLAP_CIRCLES: Circle[] = [
  { cx: 1292, cy: 33, r: 900 }, // top
  { cx: 842, cy: 813, r: 900 }, // lower-left
  { cx: 1742, cy: 813, r: 900 }, // lower-right
];

export function DemoNodes({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <svg
        viewBox="0 0 1946 1105"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        {/* Equal overlapping circles — faint, like step 3's circular guide */}
        {OVERLAP_CIRCLES.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            stroke="var(--olive-300)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
            style={{ opacity: "var(--demo-line-opacity)" }}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Hand-off flow — STEP 3 ONLY. A large circle (the workshop) expanding out of
 * the stage, with nodes around it tracing the path from sign-off → product
 * manager → developer. Faint line art, centered like the rings, fades with
 * `active`.
 */
/** Badges sitting on the RIGHT half of the circle (top & bottom points are
 * fine, never the left — that side sits behind the step text). `angle` is in
 * degrees, clockwise from 3 o'clock; FLOW_ROTATION nudges them all CCW so they
 * don't sit on the cardinal 0/90/180/270 — feels more organic. */
const FLOW_ROTATION = -10; // degrees CCW
const FLOW_NODES = [
  { angle: 270, label: "Investor buy-in" }, // top
  { angle: 330, label: "Feature prioritisation" }, // upper-right
  { angle: 30, label: "Project scope" }, // lower-right
  { angle: 90, label: "Developer handoff" }, // bottom
] as const;

export function DemoFlow({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="absolute left-[60%] top-1/2 h-[84vh] w-[84vh] -translate-x-1/2 -translate-y-1/2">
        {/* Faint circle + single orbiting comet (same mechanism as step 2) */}
        <CircleStreak duration={8} guideOpacity="var(--demo-line-opacity)" />

        {/* Simple badges on the circle, positioned from their angle */}
        {FLOW_NODES.map((n) => {
          const a = ((n.angle + FLOW_ROTATION) * Math.PI) / 180;
          return (
            <div
              key={n.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + 50 * Math.cos(a)}%`,
                top: `${50 + 50 * Math.sin(a)}%`,
              }}
            >
              <span className="inline-block whitespace-nowrap rounded-md border border-border/50 bg-neutral-olive-100/40 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground backdrop-blur-lg dark:bg-neutral-olive-800/40">
                {n.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
