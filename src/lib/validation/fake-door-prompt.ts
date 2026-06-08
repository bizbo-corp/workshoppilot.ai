/**
 * Fake-door handoff prompt builder (Step 10 — Validate).
 *
 * The fake-door / landing-page smoke test needs a real page to drive traffic at. For now the
 * generator itself is a placeholder; what we DO produce is a self-contained prompt that can be
 * handed to a coding agent (v0, Claude, etc.) to build the landing page. This keeps the page
 * grounded in the actual workshop + the pre-committed signal so the CTA measures the right thing.
 */

import type { ValidationPlan } from '@/lib/schemas';
import { loadValidationBrief } from '@/lib/validation/llm-context';
import { OUTPUT_TYPE_LABELS } from '@/lib/validation/artifact-lookup';

export interface FakeDoorHandoff {
  prompt: string;
  conceptName: string | null;
}

/** Pure: assemble the coding-agent prompt from a plan + an already-grounded workshop brief. */
export function buildFakeDoorPrompt(plan: ValidationPlan, brief: string): string {
  const types = (plan.outputTypes ?? [plan.outputType])
    .map((t) => OUTPUT_TYPE_LABELS[t])
    .join(' + ');
  const signal = plan.signal;

  const lines: string[] = [];
  lines.push(
    'Build a single-page "fake-door" landing page that tests demand BEFORE the product is built.'
  );
  lines.push('No real product sits behind it — the only goal is to measure genuine interest.');
  lines.push('');
  lines.push('# What we are testing');
  lines.push(`- Output type: ${types}`);
  lines.push(`- Riskiest assumption: ${plan.assumption}`);
  if (signal) {
    const bar =
      signal.metricType === 'percent'
        ? `${signal.target}% of visitors`
        : `${signal.target} of ${signal.sampleSize} people`;
    lines.push(`- Success signal: ${bar} ${signal.metric}.`);
    if (signal.killThreshold != null) {
      lines.push(`- Pivot/kill if at or below: ${signal.killThreshold}.`);
    }
  }
  lines.push('');
  lines.push('# Page requirements');
  lines.push('- A compelling hero: a headline + subhead that sell the value to the target user.');
  lines.push('- A short benefits / "how it works" section grounded in the workshop context below.');
  lines.push(
    signal?.metric
      ? `- ONE primary call-to-action. The click must let us count: "${signal.metric}".`
      : '- ONE primary call-to-action (e.g. "Get early access", "Join the waitlist", "Notify me").'
  );
  lines.push('- Capture each click (and optionally an email) so conversions can be counted.');
  lines.push('- Clean, trustworthy, mobile-first. It must look real, not like a mockup.');
  lines.push('');
  lines.push('# Workshop context (ground truth — do not invent a different product)');
  lines.push(brief);

  return lines.join('\n');
}

/** Async: load the grounded brief for the workshop and produce the fake-door handoff prompt. */
export async function loadFakeDoorHandoff(
  workshopId: string,
  plan: ValidationPlan
): Promise<FakeDoorHandoff> {
  const { brief, conceptName } = await loadValidationBrief(workshopId);
  return { prompt: buildFakeDoorPrompt(plan, brief), conceptName };
}
