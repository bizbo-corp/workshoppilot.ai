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
        role: z
          .string()
          .describe("The interviewee's job title / position, e.g. 'Frontline Nurse', 'Procurement Lead'. Empty string if not stated."),
        archetype: z
          .string()
          .describe("Short label describing their relationship to the challenge, e.g. 'The Frontline Nurse'"),
        summary: z
          .string()
          .describe('One concise line describing who they are and why they matter to the challenge'),
      }),
    )
    .describe('Distinct, identifiable people / voices found in the research. Never invent people not present.'),
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
    .describe('Headline-length insights, each attributed to one identifiable persona by name'),
  synthesized: z
    .array(
      z.object({
        text: z
          .string()
          .describe('A headline-length insight that is NOT attributable to one identifiable person — a cross-interviewee pattern, theme, or an overall impression'),
      }),
    )
    .describe('Insights with no single identifiable source — these become neutral "synthesized" cards.'),
});

export type ResearchAnalysis = z.infer<typeof researchAnalysisSchema>;
export type ContributionType = 'per-interviewee' | 'synthesized';

// ── Prompt Builder ──────────────────────────────────────────────────

export function buildResearchAnalysisPrompt(opts: {
  /** Context preamble: the Step 1 challenge + prior step summaries. */
  contextPreamble: string;
  /** The raw research text the user uploaded/pasted. */
  transcript: string;
  /** Persona names/labels already on the board, so we reuse rather than duplicate. */
  existingPersonaNames: string[];
  /** How the contributor framed their research. Defaults to per-interviewee. */
  contributionType?: ContributionType;
}): string {
  const { contextPreamble, transcript, existingPersonaNames, contributionType = 'per-interviewee' } = opts;

  const existingBlock =
    existingPersonaNames.length > 0
      ? `\nPERSONAS ALREADY ON THE BOARD (reuse the EXACT name when a person in the research clearly maps to one of these — do not create a near-duplicate):\n${existingPersonaNames.map((n) => `- ${n}`).join('\n')}\n`
      : '';

  const modeBlock =
    contributionType === 'synthesized'
      ? `MODE — OVERALL IMPRESSIONS (SYNTHESIZED):
The contributor is giving consolidated impressions across several interviews, NOT a per-person breakdown. Return an EMPTY personas array and an EMPTY insights array. Put every takeaway into "synthesized" as headline-length cards. Do NOT invent individual interviewees or attach names.`
      : `MODE — PER-INTERVIEWEE:
Create one persona ONLY for each clearly identifiable interviewee (a distinct person you can name or pseudonymously label, with a discernible role). Attribute their points to them via insights[].personaName.
- Capture each persona's role/position in the "role" field when the research states it.
- Any takeaway that is NOT tied to one identifiable person — a cross-interviewee pattern, an overall theme, or a vibe — goes in "synthesized" (no name), NOT a fabricated persona.`;

  return `${contextPreamble}

You are a design-thinking research analyst. The contributor has provided existing research (interview transcripts, survey responses, or notes). Read it and structure it for the User Research step of the workshop.
${existingBlock}
${modeBlock}

RULES:
- Insights are HEADLINE-LENGTH — a punchy insight or a short verbatim quote, never a paragraph. Think "headline", not "summary".
- Emit ONE insight per distinct point. If a person made two distinct points (e.g. a logistical pain AND an emotional reaction), emit two insights.
- Every insight MUST bear directly on the workshop challenge. Drop side comments, tangents, and off-topic remarks — even if memorable.
- Each insight's personaName MUST exactly match one of your personas[].name.
- NEVER fabricate. Only structure what is actually present in the research. If you cannot tell who said something, it is "synthesized", not a made-up person. If the research is thin, return fewer items rather than inventing detail.
- When a person in the research clearly maps to a persona already on the board, reuse that exact name.

RESEARCH TO ANALYSE:
"""
${transcript}
"""`;
}
