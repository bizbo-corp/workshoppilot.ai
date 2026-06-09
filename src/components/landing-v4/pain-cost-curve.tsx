"use client";

import { Icon } from '@/components/ui/icon';
import { useEffect, useRef, useState } from "react";

/**
 * PainCostCurve — full-bleed cost-vs-time chart behind the "Why Now" pain
 * section. X axis = time (Week 0 → 6), Y axis = cost. Each week is a thin 1px
 * olive bar whose height encodes cost, annotated with the role + activity that
 * drives it. On scroll-into-view the bars grow upward, then the labels fade in
 * (drifting in from the left). Sits behind the copy (eye candy) but stays
 * hoverable where the copy doesn't cover it. Honours prefers-reduced-motion.
 */

type CostPoint = {
  week: number;
  /** bar height as a fraction of the max bar height */
  ratio: number;
  title: string;
  sub: string;
};

const TIMELINE: CostPoint[] = [
  { week: 0, ratio: 1.0, title: "Human Consultant", sub: "$5 – $10k day workshop facilitation" },
  { week: 1, ratio: 0.55, title: "Product manager", sub: "Write PRD documents" },
  { week: 2, ratio: 0.22, title: "Product manager", sub: "Seek C-suite or investor buy-in" },
  { week: 3, ratio: 0.18, title: "Product manager", sub: "Prioritise features" },
  { week: 4, ratio: 0.3, title: "Development", sub: "Understand requirements" },
  { week: 5, ratio: 0.52, title: "Development", sub: "Stand up prototype" },
  { week: 6, ratio: 0.8, title: "Development", sub: "Code burn" },
];

// Even spread across the plot: Week 0 near the left edge, Week 6 near the right.
const leftPct = (i: number) => 4 + i * (88 / 6);

// Vertical offsets from the section's bottom edge. Padded up so the whole
// graph sits high off the bottom of the section.
const BAR_BOTTOM = "136px";
const LABEL_BOTTOM = "88px";
const PILL_BOTTOM = "58px";
const AXIS_BOTTOM = "68px";

/**
 * Reveal-on-scroll helper shared by the desktop and mobile renderings.
 * Returns a ref to attach to the chart root, `shown` (true once it scrolls into
 * view, or immediately under reduced-motion), and `reduced` (prefers-reduced-
 * motion). Bars/labels read these to gate their transitions.
 */
function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, shown, reduced };
}

export function PainCostCurve() {
  const { ref, shown, reduced } = useRevealOnScroll();

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Cost — Y axis label, sat halfway up the (tallest) consultant bar */}
      <div
        className="pointer-events-none absolute left-2 sm:left-4"
        style={{
          bottom: `calc(${BAR_BOTTOM} + 0.5 * clamp(150px, 30vh, 340px))`,
          opacity: shown ? 1 : 0,
          transition: reduced ? "none" : "opacity 0.6s ease",
          transitionDelay: reduced ? "0s" : "0.2s",
        }}
      >
        <span className="inline-block -rotate-90 rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-[12px] font-medium tracking-wide text-muted-foreground">
          Cost
        </span>
      </div>

      {/* Time axis — full-width line connecting the week badges, edge to edge
          (behind the pills). */}
      <div
        className="absolute inset-x-0 h-px origin-left bg-neutral-olive-300/70 dark:bg-neutral-olive-700/70"
        style={{
          bottom: AXIS_BOTTOM,
          transform: shown ? "scaleX(1)" : "scaleX(0)",
          transition: reduced ? "none" : `transform 0.9s ${ease}`,
        }}
      />

      {TIMELINE.map((p, i) => (
        <div
          key={p.week}
          className="group pointer-events-auto absolute bottom-0 h-full"
          style={{ left: `${leftPct(i)}%`, width: "13%" }}
        >
          {/* Bar — thin 1px cost line, grows upward (muted: the old way) */}
          <div
            className="absolute left-0 w-px rounded-full bg-neutral-olive-400/80 transition-colors group-hover:bg-neutral-olive-500 dark:bg-neutral-olive-500/70 dark:group-hover:bg-neutral-olive-400"
            style={{
              bottom: BAR_BOTTOM,
              height: `calc(${p.ratio} * clamp(150px, 30vh, 340px))`,
              transformOrigin: "bottom",
              transform: shown ? "scaleY(1)" : "scaleY(0)",
              transition: reduced ? "none" : `transform 0.75s ${ease}`,
              transitionDelay: reduced ? "0s" : `${i * 0.1}s`,
            }}
          />

          {/* Label — role + activity, fades/drifts in after the bar */}
          <div
            className="absolute left-0 whitespace-nowrap transition-colors"
            style={{
              bottom: LABEL_BOTTOM,
              opacity: shown ? 1 : 0,
              transform: shown ? "translateX(0)" : "translateX(-18px)",
              transition: reduced ? "none" : `opacity 0.7s ease, transform 0.7s ${ease}`,
              transitionDelay: reduced ? "0s" : `${0.7 + i * 0.12}s`,
            }}
          >
            <p className="text-[13px] font-semibold leading-tight text-foreground/80 group-hover:text-foreground">
              {p.title}
            </p>
            <p className="text-[12px] leading-tight text-muted-foreground">{p.sub}</p>
          </div>

          {/* Week pill — X axis tick */}
          <div
            className="absolute left-0"
            style={{
              bottom: PILL_BOTTOM,
              opacity: shown ? 1 : 0,
              transition: reduced ? "none" : "opacity 0.5s ease",
              transitionDelay: reduced ? "0s" : `${i * 0.1}s`,
            }}
          >
            <span className="relative z-10 inline-block rounded-full border border-border bg-background px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground">
              Week {p.week}
            </span>
          </div>
        </div>
      ))}

      {/* WorkshopPilot — the tiny olive bar at Week 0 ($299, one session).
          Olive (brand) against the muted bars; mirrors the link under the copy. */}
      <div
        className="group pointer-events-auto absolute bottom-0 h-full"
        style={{ left: `calc(${leftPct(0)}% + 22px)`, width: "11%" }}
      >
        {/* tiny olive cost bar — thicker stroke + glow so it's unmistakably
            distinct from the thin gray "traditional" bars */}
        <div
          className="absolute left-0 w-[3px] rounded-full bg-olive-500 shadow-[0_0_10px_2px_var(--neutral-olive-50),0_0_4px_1px_var(--neutral-olive-50)] dark:shadow-[0_0_14px_3px_var(--olive-500),0_0_5px_1px_var(--olive-400)]"
          style={{
            bottom: BAR_BOTTOM,
            height: "calc(0.07 * clamp(150px, 30vh, 340px))",
            transformOrigin: "bottom",
            transform: shown ? "scaleY(1)" : "scaleY(0)",
            transition: reduced ? "none" : `transform 0.75s ${ease}`,
            transitionDelay: reduced ? "0s" : "0.15s",
          }}
        />
        {/* olive label, floated above the short bar so it doesn't crowd Week 0 */}
        <div
          className="absolute left-0 whitespace-nowrap"
          style={{
            bottom: `calc(${BAR_BOTTOM} + 0.07 * clamp(150px, 30vh, 340px) + 8px)`,
            opacity: shown ? 1 : 0,
            transform: shown ? "translateX(0)" : "translateX(-18px)",
            transition: reduced ? "none" : `opacity 0.7s ease, transform 0.7s ${ease}`,
            transitionDelay: reduced ? "0s" : "0.95s",
          }}
        >
          <p className="text-[13px] font-semibold leading-tight text-olive-700 group-hover:text-olive-600 dark:text-olive-400">
            WorkshopPilot
          </p>
          <p className="text-[12px] leading-tight text-olive-700/70 dark:text-olive-400/70">
            $299 · one workshop session
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium leading-tight text-olive-600 dark:text-olive-400">
            <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-olive-500 dark:bg-olive-400">
              <Icon name="check" className="size-3 text-background" strokeWidth={2.5} aria-hidden="true" />
            </span>
            Done in two hours
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * PainCostBarsMobile — the same cost-vs-time story as PainCostCurve, but laid
 * out as an in-flow vertical timeline for phones and tablets (below `xl`).
 * Vertical bars + fanned-out labels don't fit a narrow screen and the absolute
 * background version collides with the stacked copy, so here each week is a node
 * on a vertical spine: role + activity, week badge on the right, and a thin 2px
 * bar plotted against a faint full-width track (so the relative cost reads like
 * a bar graph). WorkshopPilot is pulled out on top in olive.
 * Bars grow on scroll-into-view; honours prefers-reduced-motion.
 */
export function PainCostBarsMobile() {
  const { ref, shown, reduced } = useRevealOnScroll();

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const lineTransition = (i: number) =>
    reduced ? "none" : `width 0.7s ${ease} ${0.1 + i * 0.08}s`;

  return (
    <div ref={ref} className="xl:hidden">
      {/* WorkshopPilot — pulled out on top, olive, mirrors the desktop chart */}
      <div className="mb-6 rounded-xl border border-olive-500/35 bg-olive-500/[0.05] p-4 dark:border-olive-400/30 dark:bg-olive-400/[0.06]">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold leading-tight text-olive-700 dark:text-olive-400">
            WorkshopPilot
          </p>
          <span className="shrink-0 rounded-full border border-olive-500/40 bg-background px-2 py-0.5 text-[11px] font-medium text-olive-700 dark:text-olive-400">
            Week 0
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-tight text-olive-700/70 dark:text-olive-400/70">
          $299 · one workshop session
        </p>
        <div className="mt-3 h-0.5 w-full rounded-full bg-olive-500/15 dark:bg-olive-400/15">
          <div
            className="h-full rounded-full bg-olive-500 shadow-[0_0_8px_1px_var(--olive-500)] dark:bg-olive-400"
            style={{
              width: shown ? "7%" : "0%",
              transition: reduced ? "none" : `width 0.7s ${ease} 0.05s`,
            }}
          />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium leading-tight text-olive-600 dark:text-olive-400">
          <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-olive-500 dark:bg-olive-400">
            <Icon name="check" className="size-3 text-background" strokeWidth={2.5} aria-hidden="true" />
          </span>
          Done in two hours
        </p>
      </div>

      <div className="mb-5 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          What it costs to plan the old way
        </p>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          cost →
        </span>
      </div>

      {/* The old way — a vertical timeline, one node per week, linked by a spine */}
      <div className="relative">
        {/* spine connecting the week nodes */}
        <span
          aria-hidden="true"
          className="absolute left-[5px] top-3 bottom-3 w-px bg-neutral-olive-300/80 dark:bg-neutral-olive-700/80"
        />
        <ul className="space-y-5">
          {TIMELINE.map((p, i) => (
            <li key={p.week} className="relative pl-7">
              {/* node sitting on the spine */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-[5px] size-[11px] rounded-full border-2 border-neutral-olive-400 bg-background dark:border-neutral-olive-500"
              />
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold leading-tight text-foreground">
                  {p.title}
                </p>
                <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Week {p.week}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                {p.sub}
              </p>
              {/* thin 2px cost bar on a faint full-width track */}
              <div className="mt-2.5 h-0.5 w-full rounded-full bg-neutral-olive-200/80 dark:bg-neutral-olive-800/80">
                <div
                  className="h-full rounded-full bg-neutral-olive-400 dark:bg-neutral-olive-500"
                  style={{
                    width: shown ? `${Math.round(p.ratio * 100)}%` : "0%",
                    transition: lineTransition(i),
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
