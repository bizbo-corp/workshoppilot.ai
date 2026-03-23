/**
 * Concept Card AI Generation — Prompts & Zod Schemas
 *
 * Section-specific prompts for card-level and field-level AI generation.
 * Used by the concept-card-generate API endpoint.
 */

import { z } from 'zod';
import type { ConceptFieldId } from '@/lib/canvas/concept-card-utils';

// ── Zod Output Schemas ──────────────────────────────────────────────

export const elevatorPitchSchema = z.object({
  elevatorPitch: z.string().describe('2-3 sentence elevator pitch following Problem → Solution → Benefit structure'),
});

export const uspSchema = z.object({
  usp: z.string().describe('One sentence: what makes this concept different from current solutions. Should pass the "billboard test" — memorable and clear.'),
});

export const swotStrengthsSchema = z.object({
  strengths: z.array(z.string()).length(3).describe('Exactly 3 strengths, each citing research-identified advantages or validated user needs'),
});

export const swotWeaknessesSchema = z.object({
  weaknesses: z.array(z.string()).length(3).describe('Exactly 3 weaknesses, each citing user research pain points, journey barriers, or known limitations'),
});

export const swotOpportunitiesSchema = z.object({
  opportunities: z.array(z.string()).length(3).describe('Exactly 3 opportunities, each referencing market/domain context from research'),
});

export const swotThreatsSchema = z.object({
  threats: z.array(z.string()).length(3).describe('Exactly 3 threats, each referencing challenges from stakeholder research'),
});

export const swotFullSchema = z.object({
  swot: z.object({
    strengths: z.array(z.string()).length(3),
    weaknesses: z.array(z.string()).length(3),
    opportunities: z.array(z.string()).length(3),
    threats: z.array(z.string()).length(3),
  }),
});

const feasibilityDimensionSchema = z.object({
  score: z.number().int().min(1).max(5).describe('Score 1-5'),
  rationale: z.string().describe('Why this score, citing specific workshop evidence'),
});

export const feasibilityTechnicalSchema = z.object({
  technical: feasibilityDimensionSchema,
});

export const feasibilityBusinessSchema = z.object({
  business: feasibilityDimensionSchema,
});

export const feasibilityDesirabilitySchema = z.object({
  userDesirability: feasibilityDimensionSchema,
});

export const feasibilityFullSchema = z.object({
  feasibility: z.object({
    technical: feasibilityDimensionSchema,
    business: feasibilityDimensionSchema,
    userDesirability: feasibilityDimensionSchema,
  }),
});

export const conceptCardFullSchema = z.object({
  conceptName: z.string().describe('2-4 word marketable name'),
  elevatorPitch: z.string().describe('2-3 sentence elevator pitch'),
  usp: z.string().describe('One sentence unique selling proposition'),
  swot: z.object({
    strengths: z.array(z.string()).length(3),
    weaknesses: z.array(z.string()).length(3),
    opportunities: z.array(z.string()).length(3),
    threats: z.array(z.string()).length(3),
  }),
  feasibility: z.object({
    technical: feasibilityDimensionSchema,
    business: feasibilityDimensionSchema,
    userDesirability: feasibilityDimensionSchema,
  }),
});

export const elaborateSchema = z.object({
  content: z.string().describe('The improved/elaborated content'),
});

// ── Shared Preamble Builder ─────────────────────────────────────────

export function buildContextPreamble(params: {
  originalIdea?: string;
  problemStatement?: string;
  hmwStatement?: string;
  reframedHmw?: string;
  stepSummaries: string;
  conceptName: string;
  ideaSource: string;
}): string {
  const parts: string[] = [];

  parts.push('You are a design thinking facilitator generating concept card content.');

  if (params.originalIdea) {
    parts.push(`Original Idea: ${params.originalIdea}`);
  }
  if (params.problemStatement) {
    parts.push(`Problem Statement: ${params.problemStatement}`);
  }
  if (params.hmwStatement) {
    parts.push(`HMW Statement: ${params.hmwStatement}`);
  }
  if (params.reframedHmw) {
    parts.push(`Reframed HMW: ${params.reframedHmw}`);
  }

  if (params.stepSummaries) {
    parts.push(`\nPrior Step Summaries:\n${params.stepSummaries}`);
  }

  parts.push(`\nConcept Card: "${params.conceptName}" (from idea: "${params.ideaSource}")`);

  return parts.join('\n');
}

// ── Per-Field Prompt Builders ───────────────────────────────────────

export function getFieldPrompt(
  field: ConceptFieldId,
  preamble: string,
  currentCardJson: string,
): string {
  const cardContext = `\nCurrent card state:\n${currentCardJson}`;

  switch (field) {
    case 'elevatorPitch':
      return `${preamble}${cardContext}

Generate a compelling elevator pitch for this concept.
- Follow the Problem → Solution → Benefit structure
- Reference persona pain points from prior research
- 2-3 sentences, punchy and persuasive
- Make it feel like something you'd pitch to investors`;

    case 'usp':
      return `${preamble}${cardContext}

Generate a unique selling proposition (USP) for this concept.
- One sentence that passes the "billboard test" — memorable and instantly clear
- Reference journey map dip points to show differentiation from the current state
- Focus on what makes this DIFFERENT, not just what it does`;

    case 'swot':
      return `${preamble}${cardContext}

Generate a complete SWOT analysis for this concept.
- Exactly 3 items per quadrant
- Strengths: cite research-identified advantages or validated user needs
- Weaknesses: cite user research pain points, journey barriers, or known limitations
- Opportunities: reference market/domain context from research
- Threats: reference challenges from stakeholder research
- Be honest — genuine weaknesses and threats are more valuable than optimistic hand-waving`;

    case 'swot-strengths':
      return `${preamble}${cardContext}

Generate exactly 3 strengths for this concept's SWOT analysis.
- Each strength must cite research-identified advantages or validated user needs
- Be specific and evidence-based, not generic`;

    case 'swot-weaknesses':
      return `${preamble}${cardContext}

Generate exactly 3 weaknesses for this concept's SWOT analysis.
- Each weakness must cite user research pain points, journey barriers, or known limitations
- Be honest — genuine weaknesses build trust`;

    case 'swot-opportunities':
      return `${preamble}${cardContext}

Generate exactly 3 opportunities for this concept's SWOT analysis.
- Each opportunity should reference market/domain context from research
- Think about where this concept could expand or leverage emerging trends`;

    case 'swot-threats':
      return `${preamble}${cardContext}

Generate exactly 3 threats for this concept's SWOT analysis.
- Each threat should reference challenges from stakeholder research
- Consider competitive, technical, and market risks`;

    case 'feasibility':
      return `${preamble}${cardContext}

Score the feasibility of this concept across three dimensions.
- Technical Feasibility (1-5): Can this be built with current technology? What's the complexity?
- Business Viability (1-5): Is there a market? Can it generate revenue or deliver value?
- User Desirability (1-5): Do users actually want this? Is there validated demand?
- Each score needs a rationale citing specific workshop evidence
- Be realistic — don't default to all 4s and 5s`;

    case 'feasibility-technical':
      return `${preamble}${cardContext}

Score the technical feasibility of this concept (1-5).
- Consider: can this be built with current technology? What's the complexity?
- Provide a rationale citing specific workshop evidence
- Be realistic`;

    case 'feasibility-business':
      return `${preamble}${cardContext}

Score the business viability of this concept (1-5).
- Consider: is there a market? Can it generate revenue or deliver value?
- Provide a rationale citing specific workshop evidence
- Be realistic`;

    case 'feasibility-userDesirability':
      return `${preamble}${cardContext}

Score the user desirability of this concept (1-5).
- Consider: do users actually want this? Is there validated demand from research?
- Provide a rationale citing specific workshop evidence
- Be realistic`;

    default:
      return `${preamble}${cardContext}\n\nGenerate content for this concept card field.`;
  }
}

export function getGenerateAllPrompt(
  preamble: string,
  currentCardJson: string,
): string {
  return `${preamble}

Current card state:
${currentCardJson}

Generate ALL content for this concept card in a single pass:

1. **Concept Name**: A 2-4 word marketable, evocative name
2. **Elevator Pitch**: 2-3 sentences following Problem → Solution → Benefit. Reference persona pain points.
3. **USP**: One sentence that passes the billboard test. Reference journey map dip points.
4. **SWOT Analysis**: Exactly 3 items per quadrant, evidence-traced:
   - Strengths: cite research-identified advantages
   - Weaknesses: cite user research pain points or limitations
   - Opportunities: cite market/domain context
   - Threats: cite stakeholder challenges
5. **Feasibility**: Score 1-5 with rationale for Technical, Business, and User Desirability

Be honest in SWOT — genuine weaknesses and threats are more valuable than optimism.
Be realistic in feasibility — don't default to all 4s and 5s.
Every item should trace to prior workshop evidence where possible.`;
}

export function getElaboratePrompt(
  preamble: string,
  field: ConceptFieldId,
  currentContent: string,
  instructions: string,
): string {
  return `${preamble}

You are improving existing content on a concept card. Preserve the author's voice and intent while making it better.

Field: ${field}
Current content:
"${currentContent}"

User's instructions: ${instructions}

Improve the content following the user's instructions. Return ONLY the improved text as a single string.
Do not add labels, prefixes, or explanations — just the improved content.`;
}

// ── Schema Selector ─────────────────────────────────────────────────

export function getFieldSchema(field: ConceptFieldId) {
  switch (field) {
    case 'elevatorPitch': return elevatorPitchSchema;
    case 'usp': return uspSchema;
    case 'swot': return swotFullSchema;
    case 'swot-strengths': return swotStrengthsSchema;
    case 'swot-weaknesses': return swotWeaknessesSchema;
    case 'swot-opportunities': return swotOpportunitiesSchema;
    case 'swot-threats': return swotThreatsSchema;
    case 'feasibility': return feasibilityFullSchema;
    case 'feasibility-technical': return feasibilityTechnicalSchema;
    case 'feasibility-business': return feasibilityBusinessSchema;
    case 'feasibility-userDesirability': return feasibilityDesirabilitySchema;
    default: return elevatorPitchSchema;
  }
}
