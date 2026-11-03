import { cn } from '@/lib/utils';

/**
 * The Validation Score gauge. Armed: empty, with the target and kill marks
 * drawn on, so the empty gauge reads as loaded rather than unfinished.
 * Scored: filled to the score.
 */
export function ScoreRing({ score, target, kill, unit, className }: { score: number | null; target?: number; kill?: number; unit?: string; className?: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const killPct = target && kill != null ? Math.max(0, Math.min(1, kill / target)) : null;

  return (
    <div className={cn('flex items-center gap-5', className)} data-score={score ?? 'armed'}>
      <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        {killPct != null && (
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--canvas-red-pastel)" strokeWidth="10" strokeDasharray={`${c * killPct} ${c}`} opacity="0.6" />
        )}
        {score != null && (
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--olive-600)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} className="transition-[stroke-dasharray] duration-700" />
        )}
        <line x1="64" y1="2" x2="64" y2="22" stroke="var(--foreground)" strokeWidth="2" />
      </svg>
      <div className="space-y-1">
        <div className="text-3xl font-semibold tabular-nums">{score == null ? '—' : score}</div>
        {score == null ? (
          <p className="max-w-[16rem] text-xs text-muted-foreground">
            {target != null ? `Armed. Hit ${target}${unit ? ` ${unit}` : ''} to validate; ${kill}${unit ? ` ${unit}` : ''} or fewer parks it.` : 'Your score is waiting. Get the Verdict to arm it.'}
          </p>
        ) : (
          <p className="max-w-[16rem] text-xs text-muted-foreground">Result against the target you committed to. A decision aid, not a truth claim.</p>
        )}
      </div>
    </div>
  );
}
