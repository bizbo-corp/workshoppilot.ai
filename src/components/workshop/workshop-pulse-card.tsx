"use client";

import * as React from "react";
import { useEventListener } from "@liveblocks/react";
import { ArrowRight, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * Workshop Pulse Card
 *
 * Sticky read-only "what the facilitator's AI just said" panel rendered at
 * the top of each participant's chat scaffold. Mirrors the latest facilitator
 * AI message (cleaned of markup) so participants can follow the team's
 * narration even though their own AI thread is separate.
 *
 * Data sources, in priority order:
 * 1. Liveblocks `FACILITATOR_NARRATION` events — live, fires on each new
 *    facilitator AI turn that the chat route's onFinish extracts.
 * 2. Initial state from SSR (`initial` prop) — hydrates with the latest row
 *    from workshop_step_narration so refreshers and late joiners see the
 *    current pulse immediately rather than a blank card.
 *
 * Pure read-only by design: there's no input, no actions, no acknowledgment
 * UI. Participants react via their own chat or by editing the canvas directly.
 *
 * Multiplayer-only — the component just returns null in solo (parent gates
 * mounting via workshopType). It's also stepId-aware: only renders when the
 * narration is for the participant's current step.
 */

export type WorkshopPulseState = {
  narrationId: string;
  content: string;
  cta: string | null;
  rowId: string | null;
  progressLabel: string | null;
  /** Receive-time timestamp for "just now" / "2m ago" rendering. */
  receivedAt: number;
};

/** Shape of the SSR-hydrated pulse snapshot — same fields as the runtime
 *  state minus the receive timestamp, which the client backdates on hydration. */
export type WorkshopPulseSnapshot = Omit<WorkshopPulseState, "receivedAt">;

interface WorkshopPulseCardProps {
  /** Current step the participant is viewing. Narrations for other steps are
   *  ignored — the broadcast carries stepId so we can filter. */
  stepId: string;
  /** SSR-hydrated latest narration row for this (workshop, step). Null when
   *  there's no narration yet (e.g. step just started). */
  initial: WorkshopPulseSnapshot | null;
}

export function WorkshopPulseCard({ stepId, initial }: WorkshopPulseCardProps) {
  const [pulse, setPulse] = React.useState<WorkshopPulseState | null>(() =>
    initial
      ? {
          ...initial,
          // SSR-hydrated state isn't "just now" — backdate the timestamp so
          // the relative-time line doesn't pretend the message just arrived.
          // The progress label still reflects the latest state.
          receivedAt: Date.now() - 60_000,
        }
      : null,
  );
  const [justPulsed, setJustPulsed] = React.useState(false);

  useEventListener(({ event }) => {
    if (event.type !== "FACILITATOR_NARRATION") return;
    if (event.stepId !== stepId) return;
    // Dedupe by narrationId — if SSR and broadcast race, the second one
    // arrives with the same id and we no-op rather than re-pulsing.
    setPulse((prev) => {
      if (prev?.narrationId === event.narrationId) return prev;
      return {
        narrationId: event.narrationId,
        content: event.content,
        cta: event.cta,
        rowId: event.rowId,
        progressLabel: event.progressLabel,
        receivedAt: Date.now(),
      };
    });
    setJustPulsed(true);
    const t = setTimeout(() => setJustPulsed(false), 1200);
    return () => clearTimeout(t);
  });

  // No narration yet for this step — render nothing so we don't show an empty
  // shell. Participants will see the card appear the moment the facilitator's
  // AI completes its first pulse-worthy message.
  if (!pulse) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "shrink-0 border-b border-olive-200 bg-gradient-to-br from-olive-50/90 via-olive-50/70 to-card",
        "dark:border-neutral-olive-800 dark:from-olive-950/40 dark:via-olive-950/20 dark:to-card",
        "px-4 py-3 transition-shadow duration-300",
        justPulsed && "shadow-[inset_0_0_0_2px_var(--olive-400)]",
      )}
    >
      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <Sparkles
          className={cn(
            "h-3 w-3 text-olive-600 dark:text-olive-400",
            justPulsed && "animate-pulse",
          )}
          aria-hidden
        />
        <span>Workshop narrator</span>
        {pulse.progressLabel && (
          <>
            <span className="text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <span className="font-medium normal-case tracking-normal text-muted-foreground">
              {pulse.progressLabel}
            </span>
          </>
        )}
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-snug [&>p:last-child]:mb-0 [&>p]:my-1">
        <ReactMarkdown>{pulse.content}</ReactMarkdown>
      </div>

      {pulse.cta && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-olive-600/10 px-3 py-1 text-xs font-medium text-olive-800 dark:bg-olive-400/15 dark:text-olive-200">
          <ArrowRight className="h-3 w-3" aria-hidden />
          {pulse.cta}
        </div>
      )}
    </div>
  );
}
