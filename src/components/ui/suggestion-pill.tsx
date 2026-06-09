'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Standard suggestion pill used app-wide — AI chat reply suggestions, the validate-step
 * assumption alternatives, setup example chips, signal metric chips, etc.
 *
 * Uses the shared `tertiary` colour tier (the pale-olive tokens), so it stays in lockstep with the
 * tertiary Button variant — change `--tertiary*` once and both update. The corner radius is fixed at
 * ~half a single line's height, so the browser caps it to a FULL pill on one line and keeps it as
 * rounded corners when the text wraps to multiple lines — no measuring needed.
 *
 * - default (inline): short, single-line pills (chat suggestions, metric chips).
 * - block: full-width, left-aligned for long / multi-line suggestions (assumption alternatives).
 * - selected: stronger olive for multi-select / "currently chosen" states.
 */
export interface SuggestionPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  block?: boolean;
}

export const SuggestionPill = React.forwardRef<HTMLButtonElement, SuggestionPillProps>(
  function SuggestionPill({ selected = false, block = false, className, type = 'button', ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-pressed={props['aria-pressed'] ?? (selected ? true : undefined)}
        className={cn(
          'cursor-pointer rounded-[19px] border px-3.5 py-2 text-sm leading-snug shadow-sm transition-colors',
          'border-tertiary-border bg-tertiary text-tertiary-foreground hover:bg-tertiary-hover',
          'disabled:cursor-not-allowed disabled:opacity-50',
          block ? 'flex w-full items-start gap-1.5 text-left' : 'inline-flex items-center gap-1.5',
          selected &&
            'border-olive-400 bg-tertiary-hover font-medium dark:border-neutral-olive-500',
          className,
        )}
        {...props}
      />
    );
  },
);
