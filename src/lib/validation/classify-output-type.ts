/**
 * Output-type classifier (Step 10 — Validate).
 *
 * Classifies the workshop output into exactly one of five types by reading the existing
 * upstream artifacts (classify-once). Returns confidence + rationale so the UI can present
 * it as a best guess when confidence is low.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { buildValidationContext } from '@/lib/validation/llm-context';
import { outputTypeSchema, type OutputType } from '@/lib/schemas/validation-schemas';

const classifierSchema = z.object({
  type: outputTypeSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

const SYSTEM = `You classify the output of a design-thinking workshop into exactly ONE primary type:
- app_digital: an app, web tool, software feature, or digital service
- physical_product: a physical object or piece of hardware
- service: a human-delivered or staged experience
- process_change: an internal workflow, organizational, or policy change
- offering: a business model, pricing, or go-to-market offer

Pick the single best fit for the PRIMARY concept. Weight the concept most heavily, then the
reframed challenge, then the original challenge. Set confidence honestly (0–1): below 0.6 means
"best guess, please confirm". Keep the rationale to one short sentence.`;

export async function classifyOutputType(artifacts: AllWorkshopArtifacts): Promise<{
  type: OutputType;
  confidence: number;
  rationale: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}> {
  const context = buildValidationContext(artifacts);

  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema: classifierSchema,
    system: SYSTEM,
    prompt: `Workshop summary:\n\n${context}\n\nClassify the output type.`,
    temperature: 0.1,
  });

  return {
    type: result.object.type,
    confidence: result.object.confidence,
    rationale: result.object.rationale,
    usage: result.usage,
  };
}
