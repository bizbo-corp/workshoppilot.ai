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
      {/* Ring center — near the sticky-note cluster */}
      <div className="absolute left-[62%] top-1/2">
        {[112, 72, 38].map((vh) => (
          <div
            key={vh}
            className="absolute rounded-full border border-neutral-olive-300/60 dark:border-neutral-olive-600/50"
            style={{
              width: `${vh}vh`,
              height: `${vh}vh`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Shared faint stroke colour for the step background line art. */
const LINE_COLOR =
  "text-neutral-olive-300/55 dark:text-neutral-olive-600/45";

/**
 * Large single-line lightbulb — STEP 1 ONLY. A faint 0.5px (non-scaling)
 * outline echoing the "idea" of step 1, centered like the rings and sized in
 * `vh` so it bleeds past the panel edges. Fades with `active`.
 */
export function DemoBulb({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "absolute left-[62%] top-1/2 h-[78vh] w-[78vh] -translate-x-1/2 -translate-y-1/2",
          LINE_COLOR,
        )}
      >
        {[
          "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",
          "M9 18h6",
          "M10 22h4",
        ].map((d) => (
          <path key={d} d={d} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
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
/** Node pills sitting on the circle at 12 / 3 / 6 o'clock. */
const FLOW_NODES = [
  { pos: "left-1/2 top-0", title: "Product", sub: "Feature prioritisation and roadmap" },
  { pos: "left-full top-1/2", title: "Stakeholders", sub: "C-suite or investor buy-in" },
  { pos: "left-1/2 top-full", title: "Development", sub: "PRDs for project scope and handoff" },
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
        <CircleStreak duration={6} />

        {/* Node pills on the circle */}
        {FLOW_NODES.map((n) => (
          <div
            key={n.title}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center",
              n.pos,
            )}
          >
            <span className="rounded-md border border-border bg-neutral-olive-100 px-2.5 py-0.5 text-[13px] font-semibold text-foreground/80 dark:bg-neutral-olive-800">
              {n.title}
            </span>
            <span className="mt-1 whitespace-nowrap text-[13px] text-muted-foreground">
              {n.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
