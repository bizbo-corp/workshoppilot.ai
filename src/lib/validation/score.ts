/**
 * Validation scoring (Step 10 — Validate)
 *
 * Computes a 0–100 score and a verdict from a recorded real-world result against the
 * pre-committed signal. The score is a DECISION AID, not a claim of objective truth — it
 * measures result-vs-stated-target. Surface it that way in the UI.
 */

import type { Signal, Verdict } from '@/lib/schemas/validation-schemas';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * Normalize the achievement ratio (actual vs. pass bar) for the metric type.
 * For count/ratio/percent the target IS the pass bar; binary normalizes against 1.
 */
function achievementRatio(signal: Signal, actual: number): number {
  const denom = signal.metricType === 'binary' ? 1 : signal.target;
  if (!denom || denom <= 0) return 0;
  return actual / denom;
}

export function computeScore(
  signal: Signal,
  actual: number
): { score: number; verdict: Verdict } {
  const ratio = achievementRatio(signal, actual);
  const score = clamp(Math.round(ratio * 100), 0, 100);

  let verdict: Verdict;
  if (actual >= signal.target) {
    verdict = 'validated';
  } else if (signal.killThreshold != null && actual <= signal.killThreshold) {
    verdict = 'invalidated';
  } else if (ratio >= 0.7) {
    verdict = 'promising';
  } else {
    verdict = 'inconclusive';
  }

  return { score, verdict };
}

/** Verdict-specific next-step nudge shown after results are recorded. */
export function nextStepNudge(verdict: Verdict): string {
  switch (verdict) {
    case 'validated':
      return 'Validated — run the next lens (Feasibility or Viability) to pressure-test it further.';
    case 'promising':
      return 'Promising — tighten the test and retest to push it over the bar.';
    case 'inconclusive':
      return 'Inconclusive — increase your sample size or sharpen the test, then try again.';
    case 'invalidated':
      return 'Invalidated — revisit the assumption or pivot the concept.';
  }
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  validated: 'Validated',
  promising: 'Promising',
  inconclusive: 'Inconclusive',
  invalidated: 'Invalidated',
};
