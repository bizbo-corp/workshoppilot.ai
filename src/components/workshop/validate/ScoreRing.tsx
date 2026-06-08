'use client';

import { cn } from '@/lib/utils';
import type { Verdict } from '@/lib/schemas';

const VERDICT_RING: Record<Verdict, string> = {
  validated: 'text-green-600 dark:text-green-400',
  promising: 'text-amber-500 dark:text-amber-400',
  inconclusive: 'text-foreground/70',
  invalidated: 'text-destructive',
};

/** SVG progress ring showing a 0–100 validation score, coloured by verdict. */
export function ScoreRing({
  score,
  verdict,
  size = 96,
}: {
  score: number;
  verdict: Verdict;
  size?: number;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className={cn('-rotate-90', VERDICT_RING[verdict])}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
          opacity={0.25}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{clamped}</span>
        <span className="text-[12px] uppercase tracking-wide text-foreground/70">score</span>
      </div>
    </div>
  );
}
