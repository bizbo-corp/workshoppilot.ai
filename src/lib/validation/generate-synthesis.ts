/**
 * Validate-step synthesis generator (Build Pack).
 *
 * The Validate chat is intentionally brief now — it recaps lightly and hands off to the
 * UI-driven validation flow. The FULL workshop synthesis (narrative, per-step summaries,
 * honest confidence, next steps) is produced HERE from the workshop's own step summaries
 * (via loadValidationBrief), independent of how long or short the chat was, and stored on the
 * validate artifact so the Build Pack / results screen can render it.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { loadValidationBrief } from '@/lib/validation/llm-context';

export const validateSynthesisSchema = z.object({
  narrativeIntro: z
    .string()
    .describe('1–2 short paragraphs telling the story of the journey from vague idea to a concept ready for validation.'),
  stepSummaries: z
    .array(
      z.object({
        stepNumber: z.number().int().min(1).max(10),
        stepName: z.string(),
        keyOutputs: z.array(z.string()).min(1).max(3),
      })
    )
    .min(3)
    .max(10)
    .describe('Key human-readable output(s) per step covered in the brief.'),
  confidenceAssessment: z.object({
    score: z.number().int().min(1).max(10),
    rationale: z.string(),
    researchQuality: z.enum(['thin', 'moderate', 'strong']),
  }),
  recommendedNextSteps: z.array(z.string()).min(3).max(5),
});

export type ValidateSynthesis = z.infer<typeof validateSynthesisSchema>;

const SYSTEM = `You are writing the closing SYNTHESIS for a design-thinking workshop's Build Pack — a
written deliverable the user reads after the workshop, not a chat message.

Voice: a warm, honest mentor giving a debrief. Proud of the work AND clear-eyed about what's
unproven. No cheerleading, no deflation, no fortune-cookie advice.

What to produce:
- narrativeIntro: 1–2 short paragraphs telling the arc as a story — vague idea → researched
  problem → reframed challenge → concept(s) ready for validation. Name the concept(s). Be
  specific to THIS workshop; never generic.
- stepSummaries: for each step covered in the brief, the KEY human-readable output(s) only
  (1–3 per step). Use the canonical step names where you can (1 Challenge, 2 Stakeholder
  Mapping, 3 Research, 4 Sense-making, 5 Personas, 6 Journey Mapping, 7 Reframe, 8 Ideation,
  9 Concept Development, 10 Validate). Cover the steps the brief actually contains.
- confidenceAssessment: an HONEST 1–10 score with a one-paragraph rationale, plus researchQuality
  ("thin" = synthetic/AI personas only, "moderate" = mixed, "strong" = real user data). Never
  inflate. A 6/10 with honest reasoning beats a 9/10 with praise. The concept is NOT validated
  yet — it's ready FOR validation; reflect that.
- recommendedNextSteps: 3–5 concrete actions specific to this concept's gaps. The FIRST must be
  validation through prototyping + user testing (the critical gap). Be specific (e.g. "Build a
  clickable prototype of <concept> and test it with 5 users matching <persona> on <assumption>"),
  never "do more research".

Hard rules:
- Base everything on the brief below. Do not invent a different product, persona, or finding.
- Personas, journey maps and HMW statements are workshop TOOLS, not the product.
- If the brief covers fewer than 10 steps, summarize the ones present (minimum 3).`;

export async function generateValidateSynthesis(
  workshopId: string
): Promise<{
  synthesis: ValidateSynthesis;
  usage?: { inputTokens?: number; outputTokens?: number };
} | null> {
  const { brief, hasContent } = await loadValidationBrief(workshopId);
  if (!hasContent) return null;

  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema: validateSynthesisSchema,
    system: SYSTEM,
    prompt: `Write the workshop synthesis for the Build Pack, grounded in this brief.\n\n${brief}`,
    temperature: 0.3,
  });

  return { synthesis: result.object, usage: result.usage };
}
