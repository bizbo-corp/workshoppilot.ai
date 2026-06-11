/**
 * Success-signal suggester (Step 10 — Validate).
 *
 * Proposes 2–3 candidate signals sized to the chosen test, each with a plain-language
 * reason for how it proxies THIS assumption and how strong a proxy it is — so the user
 * chooses from explained options instead of facing a blank form.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { OUTPUT_TYPE_LABELS, LENS_LABELS } from '@/lib/validation/artifact-lookup';
import { cheapTestMenuLines } from '@/lib/validation/evidence-bars';
import type { Lens, OutputType, Signal } from '@/lib/schemas/validation-schemas';

const candidateSchema = z.object({
  metric: z.string().describe('Short noun phrase for what is measured, e.g. "users who finish a full setup"'),
  metricType: z
    .enum(['count', 'percent'])
    .describe('count = X of N people (interviews, pre-orders); percent = % (landing/click tests)'),
  sampleSize: z.number().int().min(1).describe('Realistic number of people/observations to test with'),
  target: z.number().describe('Pass bar: for count, the number who must succeed; for percent, the %'),
  killThreshold: z
    .number()
    .nullable()
    .describe('Result so low you should pivot, not retry. Null if not meaningful.'),
  successCriteriaText: z.string().describe('One plain sentence: what would prove you right'),
  failCriteriaText: z.string().describe('One plain sentence: what would tell you you are wrong'),
  why: z
    .string()
    .describe('One short plain sentence on how this measure supports the specific assumption. Do NOT use the word "proxy".'),
  proxyStrength: z
    .enum(['weak', 'medium', 'strong'])
    .describe('How strongly this measure proves the assumption (weak = one-off/indirect, strong = direct evidence of real adoption)'),
});

const suggestionSchema = z.object({
  candidates: z.array(candidateSchema).min(2).max(3),
});

const SYSTEM = `You design cheap, measurable success signals for validating a design-thinking
assumption. Propose 2–3 DISTINCT ways to measure it, strongest first.

Write for a non-technical founder — plain language, and never use the word "proxy".

Rules:
- Each candidate must clearly relate to the SPECIFIC assumption. If the assumption is about
  CONSISTENT or REPEATED use, prefer measures that capture return/completion, and mark a
  one-off click as "weak".
- Prefer "count" (X of N people) for interviews, concierge tests, pre-orders, pilots.
  Use "percent" only for landing-page / click-through style tests.
- Keep sample sizes small and achievable (often 5–12 people).
- Targets must be reachable but meaningful; killThreshold is the "walk away" line (well
  below target, or null).
- For "count" metrics the target is a number OF the sample — it MUST be ≤ sampleSize
  (e.g. 7 of 10, never 50 of 10). For "percent" the target is a 0–100 percentage.
- "why" is ONE short sentence tying the metric to the assumption. Criteria are ONE plain
  sentence each, no jargon.`;

export interface SignalCandidate {
  signal: Signal;
  why: string;
  proxyStrength: 'weak' | 'medium' | 'strong';
}

export async function suggestSignals(input: {
  assumption: string;
  outputType: OutputType;
  lens: Lens;
  artifactLabel: string;
}): Promise<{ candidates: SignalCandidate[]; usage?: { inputTokens?: number; outputTokens?: number } }> {
  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema: suggestionSchema,
    system: SYSTEM,
    prompt: `Assumption being tested: "${input.assumption}"
Output type: ${OUTPUT_TYPE_LABELS[input.outputType]}
Lens: ${LENS_LABELS[input.lens]}
Chosen test: ${input.artifactLabel}

Ground the measures in tests that actually fit this kind of idea — not generic app metrics:
${cheapTestMenuLines([input.outputType])}

Propose 2–3 ways to measure success for this test.`,
    temperature: 0.4,
  });

  const candidates: SignalCandidate[] = result.object.candidates.map((c) => {
    const sampleSize = Math.max(1, Math.round(c.sampleSize));
    // Belt-and-suspenders: a count target can never exceed the sample (no "50 of 10"),
    // and the kill line must sit strictly below the pass bar.
    const max = c.metricType === 'percent' ? 100 : sampleSize;
    const target = Math.min(Math.max(0, c.target), max);
    const killThreshold =
      c.killThreshold != null ? Math.min(c.killThreshold, Math.max(0, target - 1)) : null;
    return {
      why: c.why,
      proxyStrength: c.proxyStrength,
      signal: {
        metric: c.metric,
        metricType: c.metricType,
        target,
        sampleSize,
        killThreshold,
        successCriteriaText: c.successCriteriaText,
        failCriteriaText: c.failCriteriaText,
      },
    };
  });

  return { candidates, usage: result.usage };
}
