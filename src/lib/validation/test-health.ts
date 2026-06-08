/**
 * "Test health" assessment for the Validate signal step.
 *
 * Gives the user confidence that their sample size, chosen proxy, and pass/pivot bars make
 * a sound test — before they run it. Pure + UI-agnostic.
 */

import type { ProxyStrength } from '@/lib/validation/metric-library';

export type HealthLevel = 'weak' | 'okay' | 'strong';

export interface HealthNote {
  tone: 'good' | 'warn';
  text: string;
}

export interface TestHealth {
  level: HealthLevel;
  notes: HealthNote[];
}

export const HEALTH_LABELS: Record<HealthLevel, string> = {
  weak: 'Weak',
  okay: 'Okay',
  strong: 'Strong',
};

export function assessTestHealth(input: {
  metricType: 'count' | 'percent';
  sampleSize: number | null;
  target: number | null;
  killThreshold: number | null;
  proxyStrength: ProxyStrength | null;
}): TestHealth {
  const { metricType, sampleSize, target, killThreshold, proxyStrength } = input;
  const notes: HealthNote[] = [];
  let points = 0; // 0–4 across sample + proxy
  let hardError = false;

  // --- Sample adequacy ---
  if (sampleSize == null) {
    notes.push({ tone: 'warn', text: 'Add how many people you’ll test with.' });
  } else if (metricType === 'percent') {
    if (sampleSize < 20) {
      notes.push({ tone: 'warn', text: `Small audience (${sampleSize}) for a %-based test — aim for 30+ to trust the number.` });
    } else if (sampleSize < 50) {
      points += 1;
      notes.push({ tone: 'good', text: `Reasonable audience (${sampleSize}).` });
    } else {
      points += 2;
      notes.push({ tone: 'good', text: `Healthy audience size (${sampleSize}).` });
    }
  } else {
    if (sampleSize < 5) {
      notes.push({ tone: 'warn', text: `Small sample (${sampleSize}) — treat results as directional, not proof.` });
    } else if (sampleSize < 8) {
      points += 1;
      notes.push({ tone: 'good', text: `Workable sample (${sampleSize}) for a scrappy test.` });
    } else {
      points += 2;
      notes.push({ tone: 'good', text: `Solid sample size (${sampleSize}).` });
    }
  }

  // --- Proxy strength ---
  if (proxyStrength === 'strong') {
    points += 2;
    notes.push({ tone: 'good', text: 'Strong measure — it directly shows real adoption.' });
  } else if (proxyStrength === 'medium') {
    points += 1;
    notes.push({ tone: 'good', text: 'Solid measure for this assumption.' });
  } else if (proxyStrength === 'weak') {
    notes.push({ tone: 'warn', text: 'Weaker measure — something like finishing or coming back would prove more.' });
  }

  // --- Bar sanity ---
  if (target != null) {
    if (metricType === 'percent' && (target <= 0 || target > 100)) {
      hardError = true;
      notes.push({ tone: 'warn', text: 'Pass target should be between 1 and 100%.' });
    }
    if (metricType === 'count' && sampleSize != null && target > sampleSize) {
      hardError = true;
      notes.push({ tone: 'warn', text: 'Pass target is more people than you’re testing.' });
    }
    if (killThreshold != null && killThreshold >= target) {
      hardError = true;
      notes.push({ tone: 'warn', text: 'Your pivot line should sit below your pass bar.' });
    }
  }

  let level: HealthLevel;
  if (hardError) level = 'weak';
  else if (points >= 4) level = 'strong';
  else if (points >= 2) level = 'okay';
  else level = 'weak';

  return { level, notes };
}
