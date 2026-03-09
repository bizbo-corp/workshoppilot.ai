'use client';

import { cn } from '@/lib/utils';

interface GenerationCounterProps {
  remaining: number;
  cap: number;
  loading?: boolean;
  className?: string;
}

/**
 * Small badge showing remaining image generations (e.g. "2/3 remaining").
 * Color-coded: green (2-3), amber (1), red (0).
 */
export function GenerationCounter({ remaining, cap, loading, className }: GenerationCounterProps) {
  if (loading) return null;

  const isExhausted = remaining <= 0;
  const isLow = remaining === 1;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
        isExhausted
          ? 'bg-destructive/15 text-destructive'
          : isLow
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {remaining}/{cap} remaining
    </span>
  );
}
