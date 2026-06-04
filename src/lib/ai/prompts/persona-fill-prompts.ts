/**
 * Prompts + schema for the in-card "Complete with AI" persona action.
 *
 * Powers POST /api/ai/persona-fill — a local, card-level way to fill any empty
 * zones (the 6 empathy fields, narrative, quote) without going through the chat
 * facilitator. Grounded in the workshop challenge + prior-step research so the
 * output traces back to evidence, same as the chat-driven persona flow.
 */

import { z } from 'zod';

/**
 * All AI-fillable persona content zones. Every field is required so the model
 * always returns a complete set; the client decides which to apply (empty zones
 * only, so existing user edits are never overwritten).
 */
export const personaFillSchema = z.object({
  empathySays: z
    .string()
    .describe("What the persona says out loud. 1-2 short phrases joined with '; '."),
  empathyThinks: z
    .string()
    .describe("What the persona thinks but may not say. 1-2 short phrases joined with '; '."),
  empathyFeels: z
    .string()
    .describe("The persona's emotional state. 1-2 short phrases joined with '; '."),
  empathyDoes: z
    .string()
    .describe("The persona's observable actions and behaviours. 1-2 short phrases joined with '; '."),
  empathyPains: z
    .string()
    .describe("The persona's frustrations and obstacles. 1-2 short phrases joined with '; '."),
  empathyGains: z
    .string()
    .describe("What the persona wants to achieve or the relief they seek. 1-2 short phrases joined with '; '."),
  narrative: z
    .string()
    .describe(
      "A 2-3 sentence, third-person day-in-the-life paragraph that makes this person feel real and specific. No ellipsis, no truncation — a complete paragraph.",
    ),
  quote: z
    .string()
    .describe(
      "A single first-person line (8-20 words) in the persona's own voice that captures their core tension or desire.",
    ),
});

export type PersonaFillResult = z.infer<typeof personaFillSchema>;

/** The persona fields we send to the model as current state. */
type PersonaSnapshot = {
  name?: string;
  age?: number;
  job?: string;
  archetype?: string;
  archetypeRole?: string;
  empathySays?: string;
  empathyThinks?: string;
  empathyFeels?: string;
  empathyDoes?: string;
  empathyPains?: string;
  empathyGains?: string;
  narrative?: string;
  quote?: string;
};

/**
 * Build the generation prompt. The model is told to honour existing field values
 * (so its output stays consistent with what's already on the card) and to ground
 * everything in the research context.
 */
export function getPersonaFillPrompt(params: {
  workshopContext: {
    title?: string;
    originalIdea?: string;
    problemStatement?: string;
    hmwStatement?: string;
    reframedHmw?: string;
  };
  stepSummaries: string;
  persona: PersonaSnapshot;
}): string {
  const { workshopContext, stepSummaries, persona } = params;

  const personaJson = JSON.stringify(
    {
      name: persona.name || '(unnamed)',
      age: persona.age ?? '(unknown)',
      job: persona.job || '(unknown)',
      archetype: persona.archetype || '(none)',
      archetypeRole: persona.archetypeRole || '(none)',
      empathySays: persona.empathySays || '(empty)',
      empathyThinks: persona.empathyThinks || '(empty)',
      empathyFeels: persona.empathyFeels || '(empty)',
      empathyDoes: persona.empathyDoes || '(empty)',
      empathyPains: persona.empathyPains || '(empty)',
      empathyGains: persona.empathyGains || '(empty)',
      narrative: persona.narrative || '(empty)',
      quote: persona.quote || '(empty)',
    },
    null,
    2,
  );

  return `You are a design-thinking facilitator completing a user persona card. Generate research-grounded content for EVERY field — this is a synthesis task, not creative writing. Personas must trace back to the research evidence below.

WORKSHOP CONTEXT:
- Title: ${workshopContext.title || '(untitled)'}
- Original idea: ${workshopContext.originalIdea || '(not set)'}
- Challenge / problem: ${workshopContext.problemStatement || '(not set)'}
- How-might-we: ${workshopContext.reframedHmw || workshopContext.hmwStatement || '(not set)'}

PRIOR STEP RESEARCH (use this as your evidence base — especially Step 4 empathy/research findings):
${stepSummaries || '(no prior step summaries available — infer reasonably from the workshop context above)'}

CURRENT PERSONA CARD (fields marked "(empty)" need filling; treat any already-filled fields as fixed truth and keep your output consistent with them):
${personaJson}

INSTRUCTIONS:
- Return ALL eight fields. For fields that already have content, return a value consistent with it (you may keep it as-is). For "(empty)" fields, write fresh, specific, research-grounded content.
- Empathy fields: ground in the research. Keep each to 1-2 short phrases joined with "; ". Pains and gains must trace to real findings, not generic filler.
- narrative: a 2-3 sentence third-person day-in-the-life paragraph. Make it specific and human. Never truncate with "…".
- quote: one first-person line (8-20 words) in this persona's own voice that captures their core tension or desire.
- Do not invent quotes, names, or statistics that contradict the research. A real, sparse-but-honest persona beats a rich fabricated one.`;
}
