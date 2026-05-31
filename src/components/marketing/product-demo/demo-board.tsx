import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The dotted-grid background shared by the demo "board" (all three steps).
 * Transparent base (no fill) with slightly-darker dots than the hairline border.
 */
export const DOTTED_BG: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, color-mix(in oklab, var(--foreground) 18%, transparent) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
};

/**
 * Section-level dotted board: spans the full height of the pinned panel and
 * bleeds off the right viewport edge. Sits behind all three demo frames and is
 * clipped only by the panel's `overflow-hidden`. No background fill — dots only.
 */
export function DemoBoard() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-[34%] z-0"
      style={{ right: "calc(50% - 50vw)", ...DOTTED_BG }}
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
