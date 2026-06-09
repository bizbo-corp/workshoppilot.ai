/**
 * Tailored-example generator (Step 10 — Validate).
 *
 * The static per-output-type guidance (output-type-guidance.ts) is generic. This adds ONE short,
 * concrete sentence showing what running the chosen test looks like for THIS workshop's specific
 * solution — the "hybrid" tailoring tier. Grounded in the same brief the other Validate-step LLM
 * calls use, with the artifacts-are-tools guardrail so it never describes the product as a journey
 * map / persona / workshop artifact.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { loadValidationBrief } from '@/lib/validation/llm-context';
import { getValidationGuidance } from '@/lib/validation/output-type-guidance';
import { OUTPUT_TYPE_LABELS } from '@/lib/validation/artifact-lookup';
import type { ValidationPlan } from '@/lib/schemas';

const schema = z.object({
  example: z
    .string()
    .describe('One short, concrete sentence showing what running this test looks like for the solution.'),
});

const SYSTEM = `You write ONE short, concrete sentence showing what running a validation test looks like for a SPECIFIC design-thinking solution.

Rules:
- Exactly one sentence, 12–30 words. No preamble, no "Example:" prefix, no quotes.
- Make it concrete and actionable for THIS solution and its target user — name what they'd actually
  build/show and who they'd show it to, in the workshop's real domain.
- Ground it in the brief's SOLUTION and CHALLENGE. Never invent a different product.
- Personas, journey maps and HMW statements are design-thinking TOOLS, not the product — never
  describe the product/service as one of them.
- Match the chosen test type (the approach + artifact given), don't substitute a different test.`;

export async function generateTailoredExample(
  workshopId: string,
  plan: ValidationPlan
): Promise<{ example: string; usage?: { inputTokens?: number; outputTokens?: number } }> {
  const { brief } = await loadValidationBrief(workshopId);
  const guidance = getValidationGuidance(plan.outputType);
  const approach = guidance?.approach ?? plan.artifactLabel;
  const outputLabel = OUTPUT_TYPE_LABELS[plan.outputType];

  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema,
    system: SYSTEM,
    prompt: `Output form: ${outputLabel}.
Recommended test approach: ${approach}.
Chosen test: ${plan.artifactLabel || approach}.
${plan.assumption ? `Assumption being tested: "${plan.assumption}".` : ''}

Brief:

${brief}

Write one concrete sentence describing what running "${plan.artifactLabel || approach}" looks like for THIS solution and its target user. Start naturally (e.g. "For <the solution>, …"). Stay strictly within the workshop's domain above; never describe the product as a journey map, persona, or other workshop artifact.`,
    temperature: 0.5,
  });

  return { example: result.object.example.trim(), usage: result.usage };
}
