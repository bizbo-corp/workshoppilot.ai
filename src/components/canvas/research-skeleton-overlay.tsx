'use client';

/**
 * ResearchSkeletonOverlay Component
 *
 * Empty-state hint for the User Research step (step 3). When the canvas has no
 * sticky notes yet, this renders faint, non-interactive skeleton "persona frames"
 * — dashed sage containers each holding a few shimmering placeholder stickies —
 * plus a note explaining that research findings will be compiled here.
 *
 * Purely presentational: it is NEVER written to the store / DB, so it cannot
 * affect confirm gating (STEP_CONFIRM_MIN_ITEMS) or the controlled-nodes flow.
 * It self-gates on emptiness and disappears the moment the first finding lands.
 *
 * Unlike PersonaFrameOverlay / ClusterHullsOverlay (which track canvas-space
 * coordinates), this is anchored in screen-space (centered in the canvas pane)
 * so the hint stays reliably visible regardless of the default viewport.
 */

import { useCanvasStore } from '@/providers/canvas-store-provider';
import { Sparkles } from 'lucide-react';

/** Skeleton frames to render, with how many placeholder stickies each holds. */
const SKELETON_FRAMES = [
  { stickyCount: 3 },
  { stickyCount: 3 },
  { stickyCount: 2 },
];

function SkeletonSticky() {
  return (
    <div className="flex h-[88px] w-[132px] flex-col gap-2 rounded-md bg-neutral-olive-200/70 p-2.5 dark:bg-neutral-olive-700/50 motion-safe:animate-pulse">
      <div className="h-2 w-3/4 rounded-full bg-neutral-olive-300/70 dark:bg-neutral-olive-600/60" />
      <div className="h-2 w-full rounded-full bg-neutral-olive-300/70 dark:bg-neutral-olive-600/60" />
      <div className="h-2 w-1/2 rounded-full bg-neutral-olive-300/70 dark:bg-neutral-olive-600/60" />
    </div>
  );
}

function SkeletonFrame({ stickyCount }: { stickyCount: number }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-neutral-olive-300 bg-neutral-olive-100/70 dark:border-neutral-olive-600 dark:bg-neutral-olive-800/50">
      {/* Sage header bar — where the persona name would sit */}
      <div className="flex h-7 items-center gap-1.5 rounded-t-[7px] bg-olive-600 px-2.5">
        <svg width="6" height="10" viewBox="0 0 6 10" fill="white" opacity={0.5} className="flex-shrink-0">
          <circle cx="1" cy="1" r="1" />
          <circle cx="5" cy="1" r="1" />
          <circle cx="1" cy="5" r="1" />
          <circle cx="5" cy="5" r="1" />
          <circle cx="1" cy="9" r="1" />
          <circle cx="5" cy="9" r="1" />
        </svg>
        <div className="h-2 w-24 rounded-full bg-white/40 motion-safe:animate-pulse" />
      </div>
      {/* Placeholder stickies, laid out left-to-right like a real persona row */}
      <div className="flex gap-3 p-4">
        {Array.from({ length: stickyCount }).map((_, i) => (
          <SkeletonSticky key={i} />
        ))}
      </div>
    </div>
  );
}

export function ResearchSkeletonOverlay() {
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);

  // Self-gate: hide as soon as any sticky note exists (preview or confirmed).
  const hasRealContent = stickyNotes.some((p) => !p.type || p.type === 'stickyNote');
  if (hasRealContent) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* Note explaining what this space becomes */}
        <div className="flex items-center gap-2 rounded-full border border-neutral-olive-200 bg-neutral-olive-50/80 px-4 py-1.5 text-sm font-medium text-neutral-olive-500 backdrop-blur-sm dark:border-neutral-olive-700 dark:bg-neutral-olive-900/60 dark:text-neutral-olive-300">
          <Sparkles className="h-4 w-4 text-olive-600" />
          This is where your research findings will be compiled
        </div>

        {/* Stacked skeleton persona rows */}
        <div className="flex flex-col gap-4 opacity-80">
          {SKELETON_FRAMES.map((frame, i) => (
            <SkeletonFrame key={i} stickyCount={frame.stickyCount} />
          ))}
        </div>
      </div>
    </div>
  );
}
