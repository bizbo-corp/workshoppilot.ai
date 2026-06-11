/**
 * Journey Flow LLM Generation Prompt (Phase 64)
 *
 * Exports:
 *   buildJourneyFlowPrompt — builds a Gemini prompt that emits the JSON generation contract
 *   JourneyFlowPromptOptions — options shape
 *   JourneyFlowGenerationResult — parsed result type
 *
 * Prompt-only file (string building + types) — no AI SDK imports.
 * Follows the artifact-summarization convention in journey-mapper-prompt.ts.
 */

import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import type { TestScope } from '@/lib/journey-flow/types';

// ---------------------------------------------------------------------------
// Options + parsed result types
// ---------------------------------------------------------------------------

export interface JourneyFlowPromptOptions {
  scope: TestScope;
  selectedConceptName?: string; // required when scope='feature'
}

/**
 * Parsed result from the LLM response.
 * Edges reference node array indices (0-based).
 */
export interface JourneyFlowGenerationResult {
  flowArchetype: string;
  strategicIntent: string;
  isTwoSided: boolean;
  twoSidedNote?: string | null;
  nodes: Array<{
    name: string;
    uiType?: string;
    purpose?: string;
    keyElements?: string[];
    addressesPain?: string;
    priority?: string;
  }>;
  edges: Array<{
    sourceIndex: number;
    targetIndex: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(value: unknown, maxLen = 300): string {
  if (value == null) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

function getStr(obj: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!obj) return '';
  for (const key of keys) {
    const val = obj[key];
    if (val && typeof val === 'string' && val.trim()) return val.trim();
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Try nested object
      const nested = val as Record<string, unknown>;
      for (const k of ['value', 'text', 'content']) {
        if (nested[k] && typeof nested[k] === 'string') return String(nested[k]).trim();
      }
    }
  }
  return '';
}

function getArr(obj: Record<string, unknown> | null | undefined, ...keys: string[]): unknown[] {
  if (!obj) return [];
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val) && val.length > 0) return val;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Artifact summarizers
// ---------------------------------------------------------------------------

function summarizeChallenge(challenge: Record<string, unknown> | null): string {
  if (!challenge) return '(not available)';
  const statement = getStr(challenge, 'challengeStatement', 'statement', 'challenge', 'summary');
  const context = getStr(challenge, 'context', 'background', 'description');
  const output = getStr(challenge, 'outputType', 'output_type', 'type');
  const parts: string[] = [];
  if (statement) parts.push(`Statement: ${truncate(statement)}`);
  if (context) parts.push(`Context: ${truncate(context)}`);
  if (output) parts.push(`Output type: ${output}`);
  return parts.length > 0 ? parts.join('\n') : truncate(JSON.stringify(challenge));
}

function summarizePersona(persona: Record<string, unknown> | null): string {
  if (!persona) return '(not available)';
  const name = getStr(persona, 'personaName', 'name', 'role');
  const pains = getArr(persona, 'pains', 'painPoints', 'frustrations', 'challenges');
  const goals = getArr(persona, 'goals', 'jobs', 'motivations');
  const parts: string[] = [];
  if (name) parts.push(`Name/Role: ${name}`);
  if (pains.length > 0) parts.push(`Pain points: ${pains.slice(0, 4).join('; ')}`);
  if (goals.length > 0) parts.push(`Goals: ${goals.slice(0, 3).join('; ')}`);
  return parts.length > 0 ? parts.join('\n') : '(no persona data)';
}

function summarizeJourneyMap(journeyMapping: Record<string, unknown> | null): string {
  if (!journeyMapping) return '(not available)';
  // Extract stage names if present
  const stages = getArr(journeyMapping, 'stages', 'gridColumns', 'columns');
  if (stages.length > 0) {
    const names = stages
      .map((s) => (s as Record<string, unknown>).name || (s as Record<string, unknown>).title || '')
      .filter(Boolean)
      .slice(0, 8);
    if (names.length > 0) return `Journey stages: ${names.join(' → ')}`;
  }
  return '(no stage data)';
}

function summarizeHmw(reframe: Record<string, unknown> | null): string {
  if (!reframe) return '(not available)';
  const winners = getArr(reframe, 'winners', 'topHmw', 'selectedHmw', 'hmwStatements');
  if (winners.length > 0) {
    return winners
      .slice(0, 3)
      .map((w) => {
        if (typeof w === 'string') return truncate(w, 120);
        const wObj = w as Record<string, unknown>;
        return truncate(getStr(wObj, 'statement', 'text', 'hmw', 'value'), 120);
      })
      .filter(Boolean)
      .join('\n- ');
  }
  return '(not available)';
}

function summarizeConcepts(concept: Record<string, unknown> | null): string {
  if (!concept) return '(not available)';

  // Try multiple concept array paths
  const canvas = concept._canvas as Record<string, unknown> | undefined;
  const canvasCards = canvas && Array.isArray(canvas.conceptCards) ? canvas.conceptCards as Array<Record<string, unknown>> : null;
  const conceptsArr = Array.isArray(concept.concepts) ? concept.concepts as Array<Record<string, unknown>> : null;
  const cards = Array.isArray(concept.cards) ? concept.cards as Array<Record<string, unknown>> : null;
  const source = canvasCards || conceptsArr || cards;

  if (!source || source.length === 0) return '(no concept data)';

  return source
    .slice(0, 5)
    .map((c, i) => {
      const name = getStr(c, 'conceptName', 'name', 'title', 'ideaSource') || `Concept ${i + 1}`;
      const pitch = getStr(c, 'elevatorPitch', 'pitch', 'description');
      const usp = getStr(c, 'usp', 'valueProposition');
      const features = getArr(c, 'features', 'keyFeatures', 'key_features');
      const lines: string[] = [`  [${i + 1}] ${name}`];
      if (pitch) lines.push(`       Elevator pitch: ${truncate(pitch, 150)}`);
      if (usp) lines.push(`       USP: ${truncate(usp, 120)}`);
      if (features.length > 0) lines.push(`       Features: ${features.slice(0, 4).join(', ')}`);
      return lines.join('\n');
    })
    .join('\n');
}

function summarizeValidation(validate: Record<string, unknown> | null): string {
  if (!validate) return '(not available)';
  const classification = getStr(validate, 'outputType', 'output_type', 'classification', 'type');
  const rationale = getStr(validate, 'rationale', 'reasoning', 'explanation');
  const parts: string[] = [];
  if (classification) parts.push(`Classification: ${classification}`);
  if (rationale) parts.push(`Rationale: ${truncate(rationale, 200)}`);
  return parts.length > 0 ? parts.join('\n') : '(no validation data)';
}

// ---------------------------------------------------------------------------
// Main prompt builder
// ---------------------------------------------------------------------------

export function buildJourneyFlowPrompt(
  artifacts: AllWorkshopArtifacts,
  options: JourneyFlowPromptOptions
): string {
  const { scope, selectedConceptName } = options;

  const challengeSummary = summarizeChallenge(artifacts.challenge);
  const personaSummary = summarizePersona(artifacts.persona);
  const journeyMapSummary = summarizeJourneyMap(artifacts.journeyMapping);
  const hmwSummary = summarizeHmw(artifacts.reframe);
  const conceptsSummary = summarizeConcepts(artifacts.concept);
  const validationSummary = summarizeValidation(artifacts.validate);

  const scopeInstruction =
    scope === 'feature'
      ? `TEST SCOPE: Single feature
Selected concept: "${selectedConceptName || 'first concept'}"
Generate exactly 3 nodes: Entry screen → Core action screen → Result/confirmation screen. No more, no less.
Focus ONLY on the selected concept's screens. Do not map the whole product journey.`
      : `TEST SCOPE: Full journey
Generate the complete baseline flow (4–8 nodes typical). Funnel and single-screen-tool archetypes may be fewer (2–4 nodes).`;

  return `You are a UX strategist and product architect. Your task is to generate a Journey Flow baseline — a lean screen-level flow for rapid UX testing.

<workshop_context>
CHALLENGE (Step 1):
${challengeSummary}

PERSONA (Step 5):
${personaSummary}

JOURNEY MAP STAGES (Step 6):
${journeyMapSummary}

HMW WINNERS (Step 7):
${hmwSummary}

CONCEPTS (Step 9):
${conceptsSummary}

VALIDATE CLASSIFICATION (Step 10):
${validationSummary}
</workshop_context>

<scope>
${scopeInstruction}
</scope>

<archetypes>
Pick exactly ONE flow archetype that best matches the workshop outputs:

1. linear-sequence — Step-by-step processes: onboarding, long task flows, multi-step apps. Each screen leads naturally to the next with no forks or cycles.

2. hub-and-spoke — Dashboard + detail screens. A central hub screen branches to separate concept/feature screens. Best when 2+ concepts each deserve their own detail view.

3. single-page-sections — Brochure-style site. Sections top to bottom on one page. Best for pure informational/marketing sites without conversion emphasis.

4. funnel — Deliberately short conversion flow: Landing page with strong CTA → Sign-up/waitlist form → Thank-you/confirmation screen. Use for desirability tests, fake-door tests, or landing page validation. Usually 3 nodes only.

5. branching — Linear backbone with decision forks. One screen splits into two paths (eligible/ineligible, path A/path B, approve/reject). Converges again before the end.

6. single-screen-tool — Input → result utility. A calculator, generator, validator, or estimator. Exactly 2 screens: input panel and result panel.

7. loop — Engagement cycle where the journey intentionally cycles back to its start. Use for habit apps, logging tools, or any flow where "would they come back?" is the validation question.
</archetypes>

<strategic_intent_values>
Also emit strategicIntent — the product category that matches your chosen archetype:
- "web-app" — general web application (matches: linear-sequence, branching, loop)
- "dashboard" — analytics/monitoring/admin (matches: hub-and-spoke)
- "marketing-site" — landing page / conversion (matches: single-page-sections, funnel)
- "tool" — single-purpose utility (matches: single-screen-tool)
- "admin-portal" — CRUD management interface (override: hub-and-spoke when the product is clearly an admin/back-office portal)
</strategic_intent_values>

<two_sided_rule>
If this product is two-sided (a marketplace or platform with both a provider side AND a consumer side — e.g., buyer/seller, host/guest, creator/audience, service provider/client):
1. Set "isTwoSided": true
2. Generate ONLY the riskier side's journey (the side that must be convinced to participate — usually supply/provider side, unless demand/consumers are harder to acquire for this specific product)
3. In "twoSidedNote", write 1–2 sentences explaining: which side you mapped and why it is the riskier side to test first
4. NEVER generate both sides in the same flow — it produces an untestable mess

If the product is NOT two-sided, set "isTwoSided": false and "twoSidedNote": null.
</two_sided_rule>

<output_requirements>
Every node's "purpose" field and "keyElements" array feed a downstream low-fidelity prototype prompt. Make them:
- Concrete and specific to THIS product (use concept names, feature names, and pain points from the workshop data)
- NOT generic placeholders like "Screen 1" or "Main feature"
- "purpose" = 1–2 sentences: what this screen does AND why it matters for testing the hypothesis
- "keyElements" = 2–4 short strings: the specific UI elements or content that must appear on this screen (e.g., "Streak counter showing consecutive days", "One-tap log entry button")

Use the workshop artifacts — especially concept elevator pitches, USPs, and persona pain points — to write specific, useful names and purposes.
</output_requirements>

Respond with ONLY fenced JSON matching this exact schema — no preamble, no explanation outside the fences:

\`\`\`json
{
  "flowArchetype": "linear-sequence | hub-and-spoke | single-page-sections | funnel | branching | single-screen-tool | loop",
  "strategicIntent": "web-app | dashboard | marketing-site | tool | admin-portal",
  "isTwoSided": false,
  "twoSidedNote": null,
  "nodes": [
    {
      "name": "Screen name — specific to this product",
      "uiType": "dashboard | landing-page | form | table | detail-view | wizard | modal | settings | auth | onboarding | search | error",
      "purpose": "1–2 sentences. What this screen does and why it matters for testing.",
      "keyElements": ["Specific element 1", "Specific element 2", "Specific element 3"],
      "addressesPain": "Which persona pain point this screen addresses (optional)",
      "priority": "must-have | should-have | nice-to-have"
    }
  ],
  "edges": [
    { "sourceIndex": 0, "targetIndex": 1 }
  ]
}
\`\`\`

Edge rules:
- Edge indices refer to positions in the "nodes" array (0-based)
- For "loop": include the closing edge back to index 0 (e.g., { "sourceIndex": 3, "targetIndex": 0 })
- For "branching": include the fork (one sourceIndex appearing twice with different targetIndex values)
- For "hub-and-spoke": hub is index 0; all spoke edges originate from index 0
- Priority: first 3 nodes = "must-have"; remaining = "should-have" or "nice-to-have"`;
}
