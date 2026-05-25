/**
 * Research Analysis — Prompt & Zod Schema
 *
 * Used by the analyze-research API endpoint (Step 3, User Research).
 * Takes a user-uploaded transcript of existing research (interviews, survey
 * responses, notes) and synthesises it into persona cards + clustered insight
 * sticky notes for the canvas — the same artifacts the chat flow produces, just
 * sourced from a document instead of a live AI/real interview.
 */

import { z } from 'zod';

// ── Output Schema ───────────────────────────────────────────────────

export const researchAnalysisSchema = z.object({
  personas: z
    .array(
      z.object({
        name: z
          .string()
          .describe("Working first name or short label for this interviewee, e.g. 'Maria'"),
        archetype: z
          .string()
          .describe("Short role label describing their relationship to the challenge, e.g. 'The Frontline Nurse'"),
        summary: z
          .string()
          .describe('One concise line describing who they are and why they matter to the challenge'),
      }),
    )
    .describe('Distinct people / voices found in the research. Prefer 2-5; never invent people not present.'),
  insights: z
    .array(
      z.object({
        personaName: z
          .string()
          .describe('Must exactly match one of personas[].name'),
        text: z
          .string()
          .describe('A headline-length insight or a short verbatim quote — never a paragraph'),
      }),
    )
    .describe('Headline-length insights, each attributed to one persona by name'),
});

export type ResearchAnalysis = z.infer<typeof researchAnalysisSchema>;

// ── Prompt Builder ──────────────────────────────────────────────────

export function buildResearchAnalysisPrompt(opts: {
  /** Context preamble: the Step 1 challenge + prior step summaries. */
  contextPreamble: string;
  /** The raw research text the user uploaded/pasted. */
  transcript: string;
  /** Persona names/labels already on the board, so we reuse rather than duplicate. */
  existingPersonaNames: string[];
}): string {
  const { contextPreamble, transcript, existingPersonaNames } = opts;

  const existingBlock =
    existingPersonaNames.length > 0
      ? `\nPERSONAS ALREADY ON THE BOARD (reuse the EXACT name when a person in the research clearly maps to one of these — do not create a near-duplicate):\n${existingPersonaNames.map((n) => `- ${n}`).join('\n')}\n`
      : '';

  return `${contextPreamble}

You are a design-thinking research analyst. The user has uploaded existing research (interview transcripts, survey responses, or notes). Read it and synthesise it into personas and insights for the User Research step of the workshop.
${existingBlock}
RULES:
- Identify the DISTINCT people / voices in the research and turn each into one persona. If the research is anonymous or about a single group, create a small number of representative personas grounded in what the text actually says.
- For each persona, extract their key insights as HEADLINE-LENGTH sticky notes — a punchy insight or a short verbatim quote, never a paragraph. Think "headline", not "summary".
- Emit ONE insight per distinct point. If a person made two distinct points (e.g. a logistical pain AND an emotional reaction), emit two insights.
- Every insight MUST bear directly on the workshop challenge. Drop side comments, tangents, and off-topic remarks — even if memorable.
- Each insight's personaName MUST exactly match one of your personas[].name.
- NEVER fabricate. Only synthesise what is actually present in the research. If the research is thin, return fewer personas/insights rather than inventing detail.
- When a person in the research clearly maps to a persona already on the board, reuse that exact name.

RESEARCH TO ANALYSE:
"""
${transcript}
"""`;
}
