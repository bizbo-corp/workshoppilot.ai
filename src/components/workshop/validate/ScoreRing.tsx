'use client';

import { cn } from '@/lib/utils';
import type { Signal, Verdict } from '@/lib/schemas';

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

/**
 * Pre-result ("armed") state of the gauge: the ring renders empty but with the
 * committed pass/kill bars drawn on it. Full ring = target hit (score 100), so
 * the green pass tick sits at 12 o'clock and the red kill tick at its fraction
 * of the target. Qualitative signals have no bars — just the empty, waiting ring.
 */
export function ArmedScoreRing({ signal, size = 96 }: { signal: Signal; size?: number }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const isQualitative = signal.metricType === 'qualitative';
  const target = signal.target ?? null;
  const hasTarget = !isQualitative && target != null && target > 0;
  const killFraction =
    hasTarget && signal.killThreshold != null
      ? Math.max(0, Math.min(1, signal.killThreshold / target))
      : null;

  /** Radial tick crossing the ring at `fraction` of the way around (from 12 o'clock). */
  const tick = (fraction: number, className: string, key: string) => {
    const theta = -Math.PI / 2 + fraction * 2 * Math.PI;
    const inner = radius - stroke / 2 - 1;
    const outer = radius + stroke / 2 + 1;
    return (
      <line
        key={key}
        x1={cx + inner * Math.cos(theta)}
        y1={cx + inner * Math.sin(theta)}
        x2={cx + outer * Math.cos(theta)}
        y2={cx + outer * Math.sin(theta)}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        className={className}
      />
    );
  };

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
          opacity={0.25}
        />
        {hasTarget && tick(1, 'text-green-600 dark:text-green-400', 'target')}
        {killFraction != null && killFraction > 0 && tick(killFraction, 'text-destructive', 'kill')}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hasTarget ? (
          <>
            <span className="text-2xl font-bold tabular-nums text-foreground/80">
              {signal.metricType === 'percent' ? `${target}%` : target}
            </span>
            <span className="text-[12px] uppercase tracking-wide text-foreground/70">target</span>
          </>
        ) : (
          <>
            <span className="text-2xl font-bold text-foreground/50">–</span>
            <span className="text-[12px] uppercase tracking-wide text-foreground/70">score</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Plain-language reading of the committed bars, shown beside the armed ring:
 * "Hit 40 of 50 → validated · 10 or fewer → killed."
 */
export function armedCaption(signal: Signal): string {
  if (signal.metricType === 'qualitative') {
    if (signal.successCriteriaText && signal.failCriteriaText) {
      return `${signal.successCriteriaText} → validated · ${signal.failCriteriaText} → killed.`;
    }
    return 'Run the test, then judge what you observed — your read decides the verdict.';
  }
  const isPercent = signal.metricType === 'percent';
  const unit = isPercent ? '%' : '';
  const targetDisplay = isPercent
    ? `${signal.target}%`
    : `${signal.target} of ${signal.sampleSize}`;
  const killPart =
    signal.killThreshold != null
      ? ` · ${signal.killThreshold}${unit} or fewer → killed`
      : '';
  return `Hit ${targetDisplay} → validated${killPart}.`;
}
