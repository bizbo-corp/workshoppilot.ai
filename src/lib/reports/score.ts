import type { ScoreVerdict } from './schemas';

/**
 * The Validation Score: 0 to 100, result against the committed target.
 * A decision aid, not a truth claim; the UI says so.
 */
export function computeScore(signal: { target: number; kill: number }, actual: number): { score: number; verdict: ScoreVerdict } {
  const target = Math.max(0, signal.target);
  const kill = Math.max(0, Math.min(signal.kill, target));
  if (target <= 0) return { score: 45, verdict: 'inconclusive' };
  const score = Math.max(0, Math.min(100, Math.round((actual / target) * 100)));
  let verdict: ScoreVerdict;
  if (actual >= target) verdict = 'validated';
  else if (actual <= kill) verdict = 'invalidated';
  else if (actual >= target * 0.7) verdict = 'promising';
  else verdict = 'inconclusive';
  return { score, verdict };
}

export const VERDICT_LABELS: Record<ScoreVerdict, string> = {
  validated: 'Validated',
  promising: 'Promising',
  inconclusive: 'Inconclusive',
  invalidated: 'Not validated',
};
