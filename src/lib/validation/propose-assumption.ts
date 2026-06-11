/**
 * Riskiest-assumption proposer (Step 10 — Validate).
 *
 * Generates the single most likely riskiest assumption from the workshop data, phrased as a
 * falsifiable statement about the user/customer's NEED or BEHAVIOR (not a feature statement),
 * plus 2–3 distinct alternatives for "suggest another".
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { loadValidationBrief } from '@/lib/validation/llm-context';
import { OUTPUT_TYPE_NOUNS } from '@/lib/validation/artifact-lookup';
import { ASSUMPTION_EXAMPLES } from '@/lib/validation/evidence-bars';
import type { OutputType } from '@/lib/schemas/validation-schemas';

const proposalSchema = z.object({
  assumption: z.string(),
  alternatives: z.array(z.string()).min(2).max(3),
  sources: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe(
      'Which workshop steps/phases most informed this assumption — use the step names from the brief, e.g. "Concept Development", "Ideation", "Sense-making", "Reframing".'
    ),
  rationale: z.string().describe('One sentence: why this is the riskiest assumption.'),
});

const SYSTEM = `You surface the RISKIEST ASSUMPTION behind a design-thinking SOLUTION — the belief that,
if wrong, would most likely kill the idea.

What the assumption must be about:
- Anchor on the CORE VALUE / NEED in the challenge's desired outcome (e.g. emotional connection
  with an audience, driving others to action) — a belief about whether the target user genuinely
  wants, and will get, that value from the solution.
- The brief may list SEVERAL components/parts (features, screens). They belong to ONE solution.
  The assumption is about the WHOLE solution's core value — NOT about a single component or
  feature (unless Specific framing is explicitly requested below).
- Do NOT make the riskiest assumption about pricing, "paying a premium", or distribution unless
  that is truly the single biggest risk. Desirability (do they want it?) comes first.
- Stay inside the challenge's real domain and the solution described in the brief.

Hard rules:
- Personas, journey maps, HMW statements and other workshop outputs are design-thinking TOOLS
  used during the workshop — they are NOT the product. NEVER describe the product/service as a
  journey map, persona, or any workshop artifact. The subject is THE SOLUTION in the brief.
- Phrase it as a falsifiable statement about the user/customer's NEED or BEHAVIOR.
- The output type only shapes the PHRASING (a service → about using/paying for the service); it
  must not invent a different product than the solution in the brief.
- Focus on desirability (do people actually want / will they do this?), not implementation.

Style — the most important part:
- ONE short, plain sentence. Aim for 12–18 words; 25 max.
- State a SINGLE belief. No compound clauses — no "rather than", no "over X", no "instead of",
  no ", believing…", and no hedging like "perceive sufficient value".
- Name the user, the solution, and the GOAL it serves. Prefer "will want a … that helps them …".
  Good (broad): "Speakers will want an app that helps them communicate ideas to drive action in others."
  Good (specific): "Speakers will want an audience-profiler feature in order to tailor their message."
  Bad (means, not goal): "Speakers believe understanding audience emotions is key to driving action."
  Bad (long / compound / hedged): "Business professionals will perceive sufficient value in a
  structured empathy tool to pay for it, rather than relying on free presentation features."
  Bad (feature statement): "The app has a restructure button."
- Provide 2–3 DISTINCT alternatives, each ONE short sentence testing a different belief about
  the same solution and user.
- Also return: sources (which workshop steps/phases most shaped this — use the step names in the
  brief) and rationale (one sentence on why it's the riskiest).`;

export type AssumptionScope = 'broad' | 'specific';

export async function proposeAssumption(
  workshopId: string,
  outputTypes: OutputType[],
  scope: AssumptionScope = 'broad',
  avoid?: string
): Promise<{
  assumption: string;
  alternatives: string[];
  sources: string[];
  rationale: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}> {
  const { brief, conceptName } = await loadValidationBrief(workshopId);
  const types = outputTypes.length ? outputTypes : (['app_digital'] as OutputType[]);
  const nouns = types.map((t) => OUTPUT_TYPE_NOUNS[t]);
  const isCombo = nouns.length > 1;
  // Natural noun phrase to weave into the sentence, e.g. "app", "service paired with an app".
  const subject = isCombo ? `${nouns[0]} paired with a ${nouns[1]}` : nouns[0];
  const comboLine = isCombo
    ? `\nThe solution COMBINES two parts — ${nouns[0]} AND ${nouns[1]}. Weave BOTH into ONE natural hybrid assumption (e.g. "Speakers will want a wrist tracker with a companion app that helps them …"). Use natural articles; do not write two separate assumptions.`
    : '';

  const framing =
    scope === 'specific'
      ? `Frame the assumption SPECIFICALLY about ONE concrete feature or component of the solution${
          conceptName ? ` "${conceptName}"` : ''
        }.
Use this exact shape: "<target user> will want a <specific feature> that <what it does> in order to <the sub-goal it serves>."
Name the concept's actual mechanic (e.g. an audience-profiler, an analogy generator).
Example: "Speakers will want an audience-profiler feature that maps audience needs in order to empathise with specific audiences."`
      : `Frame the assumption BROADLY at the level of the ORIGINAL CHALLENGE's END GOAL, in the challenge's own words (e.g. communicate effectively to persuade, inspire, or drive others to action).
Shape: "<target user> will want <a/an> ${subject} that helps them <the challenge's end goal>."
Refer to the solution naturally as ${subject} — pick the correct article (a / an, or none for a mass noun) and you may lightly adjust it so the sentence reads as natural English; NEVER paste a raw UI label like "App / Digital". Do NOT mention intermediate mechanisms (emotions, empathy, audience analysis, message clarity) or any specific concept feature — those belong only to Specific framing.
The verb must fit the idea type — services get "pay for"/"book", process changes get "adopt", campaigns get "engage with", physical products get "want"/"buy" — never app language for a non-app idea.
Example for this idea type: "${ASSUMPTION_EXAMPLES[types[0]]}"`;

  const scopeReminder =
    scope === 'specific'
      ? ' Anchor it on a concrete feature and the sub-goal that feature serves.'
      : ' Keep it about the end goal (communicating effectively to drive action), never the means or a specific feature.';

  const avoidLine = avoid
    ? `\n\nDo NOT repeat this assumption; produce a different one:\n"${avoid}"`
    : '';

  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema: proposalSchema,
    system: SYSTEM,
    prompt: `The solution's output form: ${subject}.${comboLine} ${framing}

Brief:

${brief}

Propose the single riskiest assumption about whether the target user will adopt this ${subject} to get the desired outcome, plus 2–3 distinct alternatives. Each must be ONE short, testable sentence (12–18 words).${scopeReminder} Read it back and make sure the article and noun read as natural English (e.g. "an app", not "a App / Digital"). Stay strictly within the workshop's domain above; never describe the product as a journey map, persona, or other workshop artifact, and do not invent an unrelated product.${avoidLine}`,
    temperature: 0.4,
  });

  return {
    assumption: result.object.assumption,
    alternatives: result.object.alternatives,
    sources: result.object.sources,
    rationale: result.object.rationale,
    usage: result.usage,
  };
}
