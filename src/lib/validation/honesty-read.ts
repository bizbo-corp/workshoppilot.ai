/**
 * In-session honesty read (Step 10 — Validate).
 *
 * The one place the facilitator judges the idea's CURRENT strength out loud — an
 * evidence-anchored qualitative read across five universal dimensions. Deliberately
 * produces NO number: the Validation Score stays post-test; this is the honest
 * conversation that makes the empty gauge feel earned rather than withheld.
 *
 * Anti-sycophancy is structural, not tonal: a dimension may only be credited with
 * evidence the user actually produced during the workshop (cited by step name, same
 * pattern as propose-assumption's `sources`). Assertions are named as assertions.
 * Every hard call-out pairs with the cheapest next experiment, so a low read lands
 * as "you just saved months", not "computer says no".
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { loadValidationBrief } from '@/lib/validation/llm-context';
import { evidenceBarLines } from '@/lib/validation/evidence-bars';
import { honestyDimensionSchema } from '@/lib/schemas/validation-schemas';
import type { HonestyRead, OutputType, Signal } from '@/lib/schemas/validation-schemas';

/** LLM output shape — generatedAt is stamped server-side, never by the model. */
const llmReadSchema = z.object({
  dimensions: z
    .array(honestyDimensionSchema)
    .min(5)
    .max(5)
    .describe('Exactly one entry per dimension: problem, audience, edge, evidence, cost_to_test'),
  verdictLine: z
    .string()
    .describe(
      'The headline read: 1–2 plain sentences. Honest enough to say "not worth building yet".'
    ),
});

const SYSTEM = `You are the workshop facilitator giving the founder THE HONEST READ — a direct,
evidence-anchored judgment of how strong their idea is RIGHT NOW, before any test has run.

The cardinal rule — evidence, not assertion:
- You may ONLY credit evidence the user actually produced during the workshop. "You believe
  there's demand" is thin; "three interviewees described this problem unprompted and one
  pre-paid" is real. If a dimension rests on the founder's own claims, say so plainly and rate
  it thin or missing.
- Anchor every read to the workshop step(s) it comes from via \`sources\` (use the step names
  from the brief, e.g. "User Research", "Concept Development"). A dimension with no supporting
  step gets an empty sources array and cannot be rated solid.
- Never soften a weak read to be kind. The founder is paying for the truth a friend won't give
  them. If the evidence says this isn't worth building yet, the verdictLine says exactly that.

The five dimensions (return exactly one entry each):
- problem — is there a real, specific problem, shown rather than claimed?
- audience — is the target user specific and reachable, or "everyone"?
- edge — what makes this beat the current alternative, including doing nothing?
- evidence — what demand signal exists so far, judged against the bar below?
- cost_to_test — how cheap is the committed test relative to what it could disprove?

Strength ratings:
- solid — backed by cited workshop evidence that meets the bar for this idea type.
- thin — something is there, but it is assertion-heavy or secondhand.
- missing — nothing in the workshop supports it yet.

Always end constructive:
- Every thin/missing dimension MUST include \`nextTest\`: the cheapest concrete experiment that
  would firm it up. Prefer pointing at the test the user already designed when it genuinely
  covers the gap; otherwise name something cheaper (three customer conversations beat a survey).
- The verdictLine pairs honesty with the path: a hard read should leave the founder knowing
  exactly what to do this week, and feeling the workshop just saved them months, not that they
  failed.

Voice (this is the facilitator the user has worked with all session):
- Direct and efficient. Zero fluff, no corporate speak, no hedging ("might", "perhaps").
- Plain sentences, second person. No emoji. No praise padding — cut "great job".
- Specific beats general: name the actual audience, the actual claim, the actual gap.`;

function signalLine(signal: Signal | null | undefined): string {
  if (!signal) return 'No success signal committed yet.';
  if (signal.metricType === 'qualitative') {
    return `Committed test signal (qualitative): ${signal.metric}.`;
  }
  const kill = signal.killThreshold != null ? `; kill at ≤${signal.killThreshold}` : '';
  return `Committed test signal: ${signal.metric} — target ${signal.target}${
    signal.metricType === 'percent' ? '%' : ` of ${signal.sampleSize}`
  }${kill}.`;
}

export async function generateHonestyRead(
  workshopId: string,
  opts: {
    outputTypes: OutputType[];
    assumption?: string;
    signal?: Signal | null;
  }
): Promise<{ read: HonestyRead; usage?: { inputTokens?: number; outputTokens?: number } }> {
  const { brief } = await loadValidationBrief(workshopId);
  const types = opts.outputTypes.length ? opts.outputTypes : (['app_digital'] as OutputType[]);

  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema: llmReadSchema,
    system: SYSTEM,
    prompt: `Evidence bar for this idea type — judge the evidence dimension against this, not a generic standard:
${evidenceBarLines(types)}

${opts.assumption ? `The riskiest assumption they committed to test: "${opts.assumption}"` : ''}
${signalLine(opts.signal)}

Brief of what actually happened in the workshop (your ONLY admissible evidence):

${brief}

Give the honest read: exactly five dimensions (problem, audience, edge, evidence, cost_to_test),
each rated solid/thin/missing with a 1–2 sentence read citing its workshop step sources, a
nextTest for every thin/missing dimension, and the verdictLine. Credit nothing the workshop
doesn't show.`,
    temperature: 0.3,
  });

  return {
    read: {
      dimensions: result.object.dimensions,
      verdictLine: result.object.verdictLine,
      generatedAt: new Date().toISOString(),
    },
    usage: result.usage,
  };
}
