/**
 * HMW Card AI Generation — Prompts & Zod Schemas
 *
 * Section-specific prompts for card-level and field-level AI generation.
 * Used by the hmw-card-generate API endpoint.
 */

import { z } from 'zod';
import type { HmwFieldId } from '@/lib/canvas/hmw-card-types';

// Re-export elaborate schema from concept card prompts (same shape)
export { elaborateSchema } from './concept-card-prompts';

// ── Zod Output Schemas ──────────────────────────────────────────────

export const hmwFieldSchema = z.object({
  value: z.string().describe('The generated field value'),
});

export const hmwCardFullSchema = z.object({
  givenThat: z.string().describe('Context/situation from journey dip — what barrier or frustration exists'),
  persona: z.string().describe('The persona or user group we are helping'),
  immediateGoal: z.string().describe('What should they achieve at this moment — the immediate action or feeling'),
  deeperGoal: z.string().describe('The aspirational, transformational outcome beyond the immediate goal'),
  fullStatement: z.string().describe('Complete assembled HMW statement combining all 4 parts'),
});

// ── Shared Preamble Builder ─────────────────────────────────────────

export function buildHmwPreamble(params: {
  originalIdea?: string;
  problemStatement?: string;
  reframedHmw?: string;
  stepSummaries: string;
}): string {
  const parts: string[] = [];

  parts.push('You are a design thinking facilitator generating "How Might We" statement content.');

  if (params.originalIdea) {
    parts.push(`Original Idea: ${params.originalIdea}`);
  }
  if (params.problemStatement) {
    parts.push(`Problem Statement: ${params.problemStatement}`);
  }
  if (params.reframedHmw) {
    parts.push(`Reframed HMW: ${params.reframedHmw}`);
  }

  if (params.stepSummaries) {
    parts.push(`\nPrior Step Summaries:\n${params.stepSummaries}`);
  }

  return parts.join('\n');
}

// ── Per-Field Prompt Builders ───────────────────────────────────────

export function getHmwFieldPrompt(
  field: HmwFieldId,
  preamble: string,
  currentCardJson: string,
): string {
  const cardContext = `\nCurrent card state:\n${currentCardJson}`;

  switch (field) {
    case 'givenThat':
      return `${preamble}${cardContext}

Generate the "Given that" context for this HMW statement.
- Ground it in journey map dip barriers and persona frustrations from prior research
- Describe the specific situation, context, or problem trigger
- Keep it concise — one clear sentence fragment describing the challenge
- Example: "parents struggle to find reliable childcare on short notice"`;

    case 'persona':
      return `${preamble}${cardContext}

Generate the persona/user group for this HMW statement.
- Reference the personas developed in Step 5 of the workshop
- Use a specific, empathy-building description (not just "users")
- Keep it brief — a descriptive noun phrase
- Example: "busy working parents with young children"`;

    case 'immediateGoal':
      return `${preamble}${cardContext}

Generate the immediate goal for this HMW statement.
- What should they be able to do, be, feel, or achieve at this dip moment
- Focus on the immediate, actionable outcome
- Use an active verb phrase
- Example: "quickly find and book trusted childcare"`;

    case 'deeperGoal':
      return `${preamble}${cardContext}

Generate the deeper goal for this HMW statement.
- The aspirational, transformational outcome beyond the immediate goal
- Push beyond functional — aim for emotional or life-changing impact
- What does success ultimately look like for this person?
- Example: "feel confident and stress-free about their children's care"`;

    case 'fullStatement':
      return `${preamble}${cardContext}

Assemble a complete HMW statement from the four parts on this card.
- Combine: "Given that [context], how might we help [persona] [immediate goal] so they can [deeper goal]?"
- Ensure the statement flows naturally as one sentence
- Polish for clarity and impact`;

    default:
      return `${preamble}${cardContext}\n\nGenerate content for this HMW card field.`;
  }
}

export function getHmwGenerateAllPrompt(
  preamble: string,
  currentCardJson: string,
): string {
  return `${preamble}

Current card state:
${currentCardJson}

Generate ALL content for this HMW (How Might We) card in a single pass:

1. **Given that**: Context/situation from journey dip — what barrier or frustration exists. Ground in prior research.
2. **Persona**: The specific user group we're helping. Reference workshop personas.
3. **Immediate goal**: What should they achieve at this moment — use active verb phrase.
4. **Deeper goal**: The aspirational, transformational outcome. Push beyond functional to emotional/life impact.
5. **Full statement**: Assemble: "Given that [1], how might we help [2] [3] so they can [4]?"

Every field should trace to prior workshop evidence where possible.
Make the statement inspiring yet grounded in real user needs.`;
}

export function getHmwElaboratePrompt(
  preamble: string,
  field: HmwFieldId,
  currentContent: string,
  instructions: string,
): string {
  return `${preamble}

You are improving existing content on a HMW card. Preserve the author's voice and intent while making it better.

Field: ${field}
Current content:
"${currentContent}"

User's instructions: ${instructions}

Improve the content following the user's instructions. Return ONLY the improved text as a single string.
Do not add labels, prefixes, or explanations — just the improved content.`;
}

// ── Schema Selector ─────────────────────────────────────────────────

export function getHmwFieldSchema(field: HmwFieldId) {
  switch (field) {
    case 'fullStatement':
      return hmwFieldSchema;
    default:
      return hmwFieldSchema;
  }
}
