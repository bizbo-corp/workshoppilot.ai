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
import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { buildValidationContext } from '@/lib/validation/llm-context';
import { OUTPUT_TYPE_LABELS } from '@/lib/validation/artifact-lookup';
import type { OutputType } from '@/lib/schemas/validation-schemas';

const proposalSchema = z.object({
  assumption: z.string(),
  alternatives: z.array(z.string()).min(2).max(3),
});

const SYSTEM = `You surface the RISKIEST ASSUMPTION behind a design-thinking concept — the belief that,
if wrong, would most likely kill the idea.

Rules:
- Phrase it as a falsifiable statement about the user/customer's NEED or BEHAVIOR.
  Good: "Novice speakers will trust an AI to restructure their talk."
  Bad (feature statement): "The app has a restructure button."
- Focus on desirability (do people actually want / will they do this?), not implementation.
- Keep each statement to one clear sentence.
- Provide 2–3 DISTINCT alternative assumptions, each testing a different belief.`;

export async function proposeAssumption(
  artifacts: AllWorkshopArtifacts,
  outputType: OutputType,
  avoid?: string
): Promise<{
  assumption: string;
  alternatives: string[];
  usage?: { inputTokens?: number; outputTokens?: number };
}> {
  const context = buildValidationContext(artifacts);
  const avoidLine = avoid
    ? `\n\nDo NOT repeat this assumption; produce a different one:\n"${avoid}"`
    : '';

  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema: proposalSchema,
    system: SYSTEM,
    prompt: `Workshop summary:\n\n${context}\n\nThe output is a ${OUTPUT_TYPE_LABELS[outputType]}. Propose the single riskiest assumption plus alternatives.${avoidLine}`,
    temperature: 0.4,
  });

  return {
    assumption: result.object.assumption,
    alternatives: result.object.alternatives,
    usage: result.usage,
  };
}
