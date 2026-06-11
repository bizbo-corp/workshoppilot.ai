/**
 * Output-type classifier (Step 10 — Validate).
 *
 * Classifies the workshop output into exactly one of eight types by reading the existing
 * upstream artifacts (classify-once). Returns confidence + rationale so the UI can present
 * it as a best guess when confidence is low.
 *
 * AUDIT (Phase 65): this is the SINGLE classification entry point — do not add a parallel
 * classifier. It returns exactly ONE type by design; combined types (`outputTypes: [primary,
 * secondary]`) are a UI-only concept added by the user via toggleType() in ValidatePanel.
 * Confidence is classifier-declared (0–1); < 0.6 renders as "best guess" disclosures in the
 * UI (DetectOutputTypeCard + ValidationGuidanceCard). A `source: 'user_override'`
 * classification is an implicit confirmation and always carries confidence 1.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { loadValidationBrief } from '@/lib/validation/llm-context';
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
- experience_design: reworking an existing journey, flow, or page (e.g. a website or form redesign)
- brand_comms: how the thing is named, framed, messaged, and positioned (branding / messaging)
- campaign: a time-bound marketing, awareness, or advocacy campaign

The brief may list SEVERAL components/parts (features, screens) — they are parts of ONE solution.
Classify the WHOLE solution, picking the single best fit for what it primarily IS. Weight the
solution most heavily, then the reframed challenge, then the original challenge. Set confidence
honestly (0–1): below 0.6 means "best guess, please confirm". Keep the rationale to one short
sentence.

Classify the SOLUTION (the thing being built or offered) — NOT the workshop's own tools. Journey
maps, personas and HMW statements are design-thinking artifacts used during the workshop, not the
output type.`;

export async function classifyOutputType(workshopId: string): Promise<{
  type: OutputType;
  confidence: number;
  rationale: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}> {
  const { brief } = await loadValidationBrief(workshopId);

  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema: classifierSchema,
    system: SYSTEM,
    prompt: `${brief}\n\nClassify the output type of the solution being validated.`,
    temperature: 0.1,
  });

  return {
    type: result.object.type,
    confidence: result.object.confidence,
    rationale: result.object.rationale,
    usage: result.usage,
  };
}
