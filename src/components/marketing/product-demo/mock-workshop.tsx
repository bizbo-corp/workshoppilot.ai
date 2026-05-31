"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MousePointer2, Paperclip, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
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
 * Step 2 — "AI Runs the Workshop". A faux stakeholder canvas (dotted, with
 * concentric rings) on the right, and a simulated chat panel that overhangs —
 * "comes out of" — the canvas's left edge. A scripted, non-interactive story
 * plays on scroll-in:
 *   prompt → cursor clicks "I'm stuck" → AI types a suggestion → suggestion
 *   chips appear → cursor adds "Practice Manager" → cursor lassos the three
 *   internal notes → a dashed "VET PRACTICE" container (real group-node style)
 *   wraps them.
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

/** Square sticky note (real notes are square). All stakeholder notes are yellow. */
function Note({ label, x, y, rotate }: WorkshopNote) {
  return (
    <div
      style={{ left: `${x}%`, top: `${y}%`, rotate: `${rotate}deg` }}
      className="absolute z-10 flex size-16 flex-col justify-center rounded-md bg-[var(--sticky-note-yellow)] p-2 text-[9px] font-medium leading-tight text-[var(--sticky-note-yellow-text)] shadow-md shadow-black/10"
    >
      {label}
    </div>
  );
}

export function MockWorkshop({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;
  // animate is stable for a mount, so initial state is correct — no synchronous
  // setState in an effect.
  const [phase, setPhase] = useState<Phase>(animate ? "idle" : "grouped");
  const idx = at(phase);

  // Measure the CANVAS so the fake cursor / rings can be sized in px from %.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      setTimeout(() => setPhase("grouped"), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  const suggestionShown = idx >= at("typing");
  const chipsShown = idx >= at("chips");
  const pmAdded = idx >= at("added");
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
    <div className="relative h-full w-full">
      {/* Dotted canvas — inset from the left so the chat can overhang it */}
      <div
        ref={canvasRef}
        className="absolute inset-y-0 right-0 left-[15%] overflow-hidden rounded-2xl border border-border bg-muted/30"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        {/* Concentric stakeholder rings (real concentric-rings-overlay style) */}
        {size.h > 0 &&
          [1.5, 1.0, 0.55].map((k) => (
            <div
              key={k}
              aria-hidden
              className="pointer-events-none absolute rounded-full border border-neutral-olive-300/50 dark:border-neutral-olive-700/50"
              style={{
                width: size.h * k,
                height: size.h * k,
                left: size.w * 0.62,
                top: size.h * 0.5,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}

        {/* VET PRACTICE group container — real group-node style (dashed, label above) */}
        {grouped && (
          <motion.div
            initial={animate ? { opacity: 0, scale: 0.94 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            style={{
              left: `${WORKSHOP_GROUP.x}%`,
              top: `${WORKSHOP_GROUP.y}%`,
              width: `${WORKSHOP_GROUP.w}%`,
              height: `${WORKSHOP_GROUP.h}%`,
            }}
            className="absolute z-0 rounded-lg border-2 border-dashed border-neutral-olive-300 bg-neutral-olive-100/70 dark:border-neutral-olive-600 dark:bg-neutral-olive-800/70"
          >
            <span className="absolute -top-5 left-0 text-[10px] font-semibold uppercase tracking-wide text-neutral-olive-600 dark:text-neutral-olive-300">
              {WORKSHOP_GROUP.label}
            </span>
          </motion.div>
        )}

        {/* Standalone + base internal notes */}
        {[...WORKSHOP_STICKIES, ...GROUP_NOTES_BASE].map((s) => (
          <Note key={s.label} {...s} />
        ))}

        {/* The accepted suggestion lands as a note */}
        {pmAdded && (
          <motion.div
            initial={animate ? { opacity: 0, y: -16, scale: 0.8 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            style={{
              left: `${GROUP_NOTE_ADDED.x}%`,
              top: `${GROUP_NOTE_ADDED.y}%`,
              rotate: `${GROUP_NOTE_ADDED.rotate}deg`,
            }}
            className="absolute z-10 flex size-16 flex-col justify-center rounded-md bg-[var(--sticky-note-yellow)] p-2 text-[9px] font-medium leading-tight text-[var(--sticky-note-yellow-text)] shadow-md shadow-black/10 ring-2 ring-olive-500/50"
          >
            {GROUP_NOTE_ADDED.label}
          </motion.div>
        )}

        {/* Fake cursor (lives in the canvas coordinate space) */}
        {animate && size.w > 0 && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-40"
            initial={false}
            animate={{ x: (wp.x / 100) * size.w, y: (wp.y / 100) * size.h }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <MousePointer2 className="h-5 w-5 fill-foreground text-background" />
          </motion.div>
        )}
      </div>

      {/* Simulated chat panel — overhangs the canvas's left edge */}
      <div className="absolute bottom-[8%] left-0 top-[8%] z-30 flex w-[42%] max-w-[240px] flex-col rounded-xl border border-border bg-neutral-olive-100/95 p-3 shadow-2xl shadow-black/20 backdrop-blur dark:bg-neutral-olive-900/95">
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
            <Sparkles className="h-3 w-3 text-olive-600 dark:text-olive-400" />
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
            SUGGESTION_CHIPS.map((chip, i) => (
              <motion.div
                key={chip}
                initial={animate ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: animate ? i * 0.12 : 0 }}
                className={cn(
                  "flex items-center justify-between rounded-md bg-[var(--sticky-note-yellow)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--sticky-note-yellow-text)] transition-transform",
                  i === 0 && phase === "added" && "scale-95",
                )}
              >
                {chip}
                <Plus className="h-3.5 w-3.5 opacity-70" />
              </motion.div>
            ))}
        </div>

        {/* Faux input */}
        <div className="mt-2 rounded-lg bg-neutral-olive-200/80 p-2 dark:bg-neutral-olive-800/70">
          <p className="text-[10px] text-muted-foreground">
            {WORKSHOP_CHAT.placeholder}
          </p>
          <div className="mt-3 flex items-center">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded bg-olive-700 text-olive-50 dark:bg-olive-600">
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
