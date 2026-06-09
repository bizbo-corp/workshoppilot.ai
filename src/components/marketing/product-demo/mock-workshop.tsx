"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Icon } from '@/components/ui/icon';
import { cn } from "@/lib/utils";
import { LightStreak } from "./light-streak";
import { useTypewriter } from "./use-typewriter";
import {
  CURSOR_WAYPOINTS,
  GROUP_NOTE_ADDED,
  GROUP_NOTES_BASE,
  SUGGESTION_CHIPS,
  WORKSHOP_CHAT,
  WORKSHOP_GROUP,
  WORKSHOP_STICKIES,
  type WorkshopNote,
} from "./demo-data";

/**
 * Step 2 — "AI Runs the Workshop". A simulated chat panel (left) drives a faux
 * canvas where, on scroll-in: the cursor clicks "I'm stuck" → the AI types a
 * suggestion → a chip adds "Reception Staff" → the cursor drags a marquee
 * selection around the three cards (olive selection + corner handles) → a
 * titled "Vet Practice" container wraps them (real cluster-group style).
 *
 * `play={false}` (mobile / reduced-motion) renders the final grouped end-state.
 */

const PHASES = [
  "idle",
  "toButton",
  "click",
  "typing",
  "chips",
  "toChip",
  "added",
  "lasso",
  "grouped",
] as const;
type Phase = (typeof PHASES)[number];
const at = (p: Phase) => PHASES.indexOf(p);

const CORNERS = [
  "-left-1 -top-1",
  "-right-1 -top-1",
  "-left-1 -bottom-1",
  "-right-1 -bottom-1",
];

/** Square sticky note — 2× size, same `rounded-md` corners. All notes yellow. */
function Note({
  label,
  x,
  y,
  rotate,
  selected = false,
  land = false,
  animate = false,
}: WorkshopNote & { selected?: boolean; land?: boolean; animate?: boolean }) {
  return (
    <motion.div
      initial={land && animate ? { opacity: 0, y: -16, scale: 0.8 } : false}
      animate={land ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={land ? { type: "spring", stiffness: 240, damping: 18 } : undefined}
      style={{ left: `${x}%`, top: `${y}%`, rotate: `${rotate}deg` }}
      className={cn(
        "absolute size-32 rounded-md bg-[var(--sticky-note-yellow)] p-3 text-[13px] font-medium leading-snug text-[var(--sticky-note-yellow-text)] shadow-md shadow-black/10",
        selected ? "z-20 ring-2 ring-selection" : "z-10",
      )}
    >
      {label}
      {selected &&
        CORNERS.map((pos) => (
          <span
            key={pos}
            className={cn(
              "absolute size-2.5 rounded-[2px] border-2 border-selection bg-background",
              pos,
            )}
          />
        ))}
    </motion.div>
  );
}

/** Measure an element's content box (for px-from-% positioning). */
function useElementSize<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export function MockWorkshop({
  play = true,
  showLooseNotes = true,
}: {
  play?: boolean;
  /** "Pet Owners" / "Insurers" notes that bleed outside the focus area.
      Hidden on mobile, where the tight frame makes them overlap the board. */
  showLooseNotes?: boolean;
}) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;
  const [phase, setPhase] = useState<Phase>(animate ? "idle" : "grouped");
  const idx = at(phase);

  const boxRef = useRef<HTMLDivElement>(null);
  const box = useElementSize(boxRef);

  useEffect(() => {
    if (!animate) return;
    const timers = [
      setTimeout(() => setPhase("toButton"), 700),
      setTimeout(() => setPhase("click"), 1500),
      setTimeout(() => setPhase("typing"), 1850),
      setTimeout(() => setPhase("chips"), 3400),
      setTimeout(() => setPhase("toChip"), 3850),
      setTimeout(() => setPhase("added"), 4500),
      setTimeout(() => setPhase("lasso"), 5200),
      setTimeout(() => setPhase("grouped"), 6200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  const suggestionShown = idx >= at("typing");
  const chipsShown = idx >= at("chips");
  const pmAdded = idx >= at("added");
  const selecting = phase === "lasso";
  const grouped = idx >= at("grouped");

  const { shown: aiTyped, done: aiDone } = useTypewriter(
    WORKSHOP_CHAT.suggestion,
    suggestionShown && animate,
    18,
  );

  const wp =
    idx < at("toButton")
      ? CURSOR_WAYPOINTS.start
      : idx < at("toChip")
        ? CURSOR_WAYPOINTS.button
        : idx < at("lasso")
          ? CURSOR_WAYPOINTS.chip
          : idx < at("grouped")
            ? CURSOR_WAYPOINTS.lasso
            : CURSOR_WAYPOINTS.lassoEnd;

  return (
    <div ref={boxRef} className="relative h-full w-full">
      {/* "Vet Practice" group container (real cluster-group style) — behind cards */}
      {grouped && (
        <motion.div
          initial={animate ? { opacity: 0, scale: 0.96 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          style={{
            left: `${WORKSHOP_GROUP.x}%`,
            top: `${WORKSHOP_GROUP.y}%`,
            width: `${WORKSHOP_GROUP.w}%`,
            height: `${WORKSHOP_GROUP.h}%`,
          }}
          className="absolute z-[5] flex flex-col rounded-xl shadow-sm"
        >
          <div className="flex items-center gap-1.5 rounded-t-xl bg-olive-600 px-2.5 py-1.5 dark:bg-olive-500">
            <Icon name="grip-vertical" className="h-3.5 w-3.5 text-olive-50/70" />
            <span className="text-[11px] font-semibold text-olive-50">
              {WORKSHOP_GROUP.label}
            </span>
          </div>
          <div className="flex-1 rounded-b-xl border-2 border-t-0 border-dashed border-olive-600/40 bg-olive-600/[0.06] dark:border-olive-400/40 dark:bg-olive-500/10" />
        </motion.div>
      )}

      {/* Marquee selection rectangle (during the lasso drag) */}
      {selecting && (
        <motion.div
          aria-hidden
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          style={{
            left: `${WORKSHOP_GROUP.x}%`,
            top: `${WORKSHOP_GROUP.y}%`,
            width: `${WORKSHOP_GROUP.w}%`,
            height: `${WORKSHOP_GROUP.h}%`,
          }}
          className="absolute z-[15] rounded-[3px] border-2 border-dashed border-selection bg-selection/10"
        />
      )}

      {/* Loose notes that bleed outside the focus area (hidden on mobile) */}
      {showLooseNotes &&
        WORKSHOP_STICKIES.map((s) => <Note key={s.label} {...s} />)}

      {/* Group members */}
      {GROUP_NOTES_BASE.map((s) => (
        <Note key={s.label} {...s} selected={selecting} />
      ))}
      {pmAdded && (
        <Note {...GROUP_NOTE_ADDED} land animate={animate} selected={selecting} />
      )}

      {/* Simulated chat panel — overhangs the board's left edge */}
      <div className="absolute bottom-[8%] left-0 top-[8%] z-30 w-[42%] max-w-[240px]">
        {/* Light streak, offset from the chat box edge (rounded-xl/12 → rx 20) */}
        {animate && <LightStreak radius={12} />}
        <div className="relative z-10 flex h-full w-full flex-col rounded-xl border border-border bg-neutral-olive-50/95 p-3 shadow-2xl shadow-black/20 backdrop-blur dark:bg-neutral-olive-900/95">
        <div className="flex-1 space-y-2 overflow-hidden">
          <p className="text-[11px] leading-relaxed text-foreground/75">
            {WORKSHOP_CHAT.prompt}
          </p>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm transition-transform",
              phase === "click" && "scale-95",
            )}
          >
            <Icon name="sparkles" className="h-3 w-3 text-olive-600 dark:text-olive-400" />
            {WORKSHOP_CHAT.stuckLabel}
          </span>

          {suggestionShown && (
            <p className="text-[11px] leading-relaxed text-foreground/75">
              {aiTyped}
              {animate && !aiDone && (
                <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 animate-pulse bg-current align-middle" />
              )}
            </p>
          )}

          {chipsShown &&
            SUGGESTION_CHIPS.map((chip, i) => {
              const isAdded = i === 0 && pmAdded;
              return (
                <motion.div
                  key={chip}
                  initial={animate ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: animate ? i * 0.12 : 0 }}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-transform",
                    isAdded
                      ? "bg-neutral-olive-200 text-neutral-olive-600 dark:bg-neutral-olive-800 dark:text-neutral-olive-300"
                      : "bg-[var(--sticky-note-yellow)] text-[var(--sticky-note-yellow-text)]",
                    i === 0 && phase === "added" && "scale-95",
                  )}
                >
                  {chip}
                  {isAdded ? (
                    <Icon name="check-circle" className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                  ) : (
                    <Icon name="plus" className="h-3.5 w-3.5 opacity-70" />
                  )}
                </motion.div>
              );
            })}
        </div>

        {/* Faux input */}
        <div className="mt-2 rounded-lg bg-neutral-olive-200/80 p-2 dark:bg-neutral-olive-800/70">
          <p className="text-[10px] text-muted-foreground">
            {WORKSHOP_CHAT.placeholder}
          </p>
          <div className="mt-3 flex items-center">
            <Icon name="paperclip" className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded bg-olive-700 text-olive-50 dark:bg-olive-600">
              <Icon name="arrow-right" className="h-3 w-3" />
            </span>
          </div>
        </div>
        </div>
      </div>

      {/* Fake cursor */}
      {animate && box.w > 0 && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-40"
          initial={false}
          animate={{ x: (wp.x / 100) * box.w, y: (wp.y / 100) * box.h }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        >
          <Icon name="mouse-pointer" className="h-5 w-5 fill-foreground text-background" />
        </motion.div>
      )}
    </div>
  );
}
