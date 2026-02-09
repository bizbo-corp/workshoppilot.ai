# Phase 13: Ideation & Validation Steps (8-10) - Research

**Researched:** 2026-02-09
**Domain:** AI-facilitated text-based ideation, concept development, and synthesis
**Confidence:** HIGH

## Summary

Phase 13 implements the final cluster of design thinking steps: generating ideas from the reframed HMW (Step 8 Ideation), developing selected ideas into full concepts with SWOT analysis (Step 9 Concept Development), and synthesizing the entire 10-step journey (Step 10 Validate). All three steps are text-based, following the established v1.0 architecture: AI-driven facilitation using context-aware prompts, schema-driven extraction via Vercel AI SDK 6's streamText with output property, and step-specific UI rendering.

The critical research finding: text-based ideation works well when structured into distinct rounds (themed clusters → brain writing → selection) rather than freeform brainstorming. Wild card ideas need explicit marking and prompting. Concept development benefits from proactive AI generation of complete concept sheets (not incremental field-by-field), and synthesis summaries must balance narrative flow with structured key outputs to feel like a satisfying conclusion.

**Primary recommendation:** Follow the established schema-prompt alignment pattern from Phases 11-12. Step 8 requires multi-round conversation architecture (cluster generation → user input → brain writing → selection). Step 9 uses proactive AI concept drafting (not form filling). Step 10 synthesis combines narrative intro + structured step-by-step summary.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Step 8: Ideation — Mind Mapping & Brain Writing**

- AI generates 3-4 themed clusters from the HMW statement, each with 3-4 ideas
- Each cluster includes 1-2 wild card ideas (deliberately provocative/unconventional) marked as wild cards
- No theme rationale — just present themes and ideas, keep it fast and creative
- After initial clusters, AI does a prompted round explicitly asking user "What ideas would you add?"
- User picks 5-8 favorite ideas from clusters for brain writing
- Brain writing runs 3 rounds — AI builds on user-selected favorites using "Yes, and..." technique
- Separate Crazy 8s round after brain writing — AI helps rapid-fire 8 quick ideas, no timer UI, just AI pacing with encouraging prompts ("quick, don't overthink")
- Idea selection happens at end of Step 8 (not start of Step 9) — user tells AI which ideas they like in chat
- Hard limit of max 3-4 ideas selected for concept development — AI enforces this
- Each selected idea becomes a separate concept (no combining)
- Step 8 artifact saves ALL generated ideas with selected ones flagged — preserves creative history
- No rejection tags on unselected ideas — just marked selected vs not

**Step 9: Concept Development — Concept Sheet, Billboard Hero, SWOT**

- AI recommends 1-3 concepts based on how distinct the selected ideas are
- AI drafts complete concept sheet proactively in one go (name, elevator pitch, USP, SWOT, feasibility) — user reviews and refines
- SWOT analysis: 3 bullets per quadrant (strengths, weaknesses, opportunities, threats)
- Feasibility scores use 1-5 numeric scale (not qualitative)
- Billboard Hero exercise included in Step 9 — tests the concept pitch as a billboard tagline

**Step 10: Validate — Synthesis Summary**

- Format: narrative intro paragraph + structured step-by-step summary below (both)
- Structured summary uses key output only: 2-3 bullet points per step of the most important outputs
- Includes confidence assessment with rationale (AI rates how well-validated the concept is based on research quality)
- Includes 3-5 concrete recommended next actions based on concept and gaps identified
- Note that Build Pack export is a future feature — next steps point toward it

### Claude's Discretion

- Final idea list presentation format after brain writing (evolved clusters vs flat ranked list)
- Billboard Hero exercise format within Step 9
- Concept comparison layout when multiple concepts exist
- Narrative intro paragraph length and storytelling style for Step 10

### Deferred Ideas (OUT OF SCOPE)

- Timer function for Crazy 8s — MMP feature
- Visual mind map canvas — MMP feature
- Build Pack export from Step 10 — future milestone
- Concept comparison side-by-side view — MMP feature
- Dot voting UI for idea selection — MMP feature (text-based selection works for v1.0)

## Standard Stack

### Core (Inherited from Phases 7-12)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel AI SDK | 6.x | AI streaming + structured outputs | Established pattern, proven in Steps 1-7, handles schema-driven extraction |
| Zod | Latest | Schema validation + LLM guidance | Already used for all step artifacts, .describe() fields guide extraction |
| Google Generative AI | Latest | Gemini 2.0 Flash model | Current LLM via chatModel, context caching enabled |
| Drizzle ORM | Latest | Database operations | Existing persistence layer for artifacts, summaries, messages |

### Supporting (No New Dependencies Required)

Phase 13 requires NO new libraries. All functionality uses existing stack:
- Step-specific prompts: extends `src/lib/ai/prompts/step-prompts.ts` pattern
- Schema definitions: extends `src/lib/schemas/step-schemas.ts` (schemas already exist for Steps 8-10)
- UI components: React + Tailwind + shadcn/ui (same as PersonaCard, JourneyMapGrid from Phase 12)
- Server actions: extends `src/actions/workshop-actions.ts` pattern
- Extraction: uses `src/lib/extraction/extract-artifact.ts` (already built)

### Installation

No new packages required. Phase 13 extends existing architecture.

## Architecture Patterns

### Pattern 1: Multi-Round Conversation Architecture (Step 8 Only)

**What:** Step 8 ideation follows a structured conversation flow with distinct phases: cluster generation → user input round → brain writing rounds → Crazy 8s round → selection round. This differs from Steps 1-7 which use the 6-phase arc (Orient → Gather → Synthesize → Refine → Validate → Complete).

**When to use:** When a step requires iterative generation with explicit user participation rounds (ideation, collaborative exercises).

**Example:**
```typescript
// Step 8 prompt structure (separate from arc phases)
const step8Instructions = `
IDEATION FLOW (6 distinct rounds):

ROUND 1: CLUSTER GENERATION
- Generate 3-4 themed clusters from HMW
- Each cluster: 3-4 ideas
- Include 1-2 wild cards per cluster (mark clearly)
- Present clusters, no rationale

ROUND 2: USER INPUT PROMPT
- Explicitly ask: "What ideas would you add?"
- Capture user ideas alongside AI suggestions

ROUND 3-5: BRAIN WRITING (3 rounds)
- User picks 5-8 favorites
- AI builds on each using "Yes, and..." technique
- Show evolved ideas after each round

ROUND 6: CRAZY 8s
- AI paces rapid-fire 8 ideas with energy
- "Quick — first thought!" prompts
- No timer UI, AI creates urgency

SELECTION (end of Step 8):
- User tells AI which ideas for concept development
- Hard limit: max 3-4 ideas
- AI enforces limit, confirms selection
`;
```

**Source:** User decisions from 13-CONTEXT.md + [AI-Augmented Brainwriting research](https://dl.acm.org/doi/10.1145/3613904.3642414) showing LLM integration enhances iterative ideation when structured into distinct rounds.

### Pattern 2: Proactive AI Concept Generation (Step 9)

**What:** Instead of prompting user to fill fields incrementally (elevator pitch → USP → SWOT → feasibility), AI generates the COMPLETE concept sheet in one output and user reviews/refines. This matches how humans work: draft the whole thing, then edit.

**When to use:** When the artifact is a coherent document (concept sheet, PRD, summary) rather than discrete data points.

**Example:**
```typescript
// Step 9 prompt (proactive generation)
const step9Instructions = `
CONCEPT GENERATION APPROACH:
1. User provides selected idea from Step 8
2. AI immediately drafts COMPLETE concept sheet:
   - Name (marketable, 2-4 words)
   - Elevator pitch (2-3 sentences)
   - USP (differentiation from current state)
   - SWOT (3 bullets × 4 quadrants)
   - Feasibility (1-5 scores: technical, business, user desirability)
3. Present draft: "Here's a concept sheet for [idea]. Review and tell me what to refine."
4. User edits specific sections conversationally

DO NOT ask field-by-field. Generate the whole sheet first.
`;
```

**Source:** User decision (13-CONTEXT.md: "AI drafts complete concept sheet proactively in one go") + UX best practice (reduce cognitive load by showing complete draft vs incremental prompts).

### Pattern 3: Dual-Format Synthesis (Step 10)

**What:** Step 10 summary combines narrative storytelling + structured data. Narrative intro provides emotional closure ("You started with [vague idea], explored [research], and arrived at [validated concept]"). Structured summary below provides scannable reference (2-3 bullets per step with key outputs).

**When to use:** Final step of a multi-step journey where users need both "story of what happened" and "quick reference of outputs."

**Example:**
```typescript
// Step 10 output structure
interface ValidateSummary {
  narrativeIntro: string; // 1-2 paragraphs, storytelling tone
  stepSummaries: {
    stepNumber: number;
    stepName: string;
    keyOutputs: string[]; // 2-3 bullets max
  }[];
  confidenceAssessment: {
    score: number; // 1-10
    rationale: string;
    researchQuality: 'thin' | 'moderate' | 'strong';
  };
  nextSteps: string[]; // 3-5 concrete actions
}
```

**Source:** [Design thinking synthesis research](https://voltagecontrol.com/articles/unveiling-the-core-of-design-thinking-mastering-synthesis-and-insight-generation/) showing effective synthesis balances coherent narrative with structured data extraction.

### Pattern 4: Evidence Traceability (Continues from Phase 12)

**What:** Step 9 SWOT bullets and feasibility rationale must trace back to prior steps (persona pains/gains, journey dip, research insights). No hallucinated claims.

**When to use:** Any step that builds on prior research (Steps 4-10).

**Example:**
```typescript
// Step 9 prompt instructions
const step9EvidenceGuidance = `
EVIDENCE TRACEABILITY:
- SWOT Strengths: Reference persona gains or journey opportunities
- SWOT Weaknesses: Reference persona pains or journey barriers
- SWOT Opportunities: Reference market/domain context from research
- SWOT Threats: Reference challenges from stakeholder map or research
- Feasibility scores: Justify using prior step data

Example (good):
"Strength: Addresses Sarah's top pain (manual data entry) identified in Step 4"

Example (bad - no traceability):
"Strength: Easy to use" (not connected to research)
`;
```

**Source:** Established in Phase 12 Plan 1 decision (evidence traceability for persona/journey). Extends to concept development.

### Anti-Patterns to Avoid

- **Freeform brainstorming:** Don't let Step 8 become unstructured "tell me your ideas" chat. Follow the 6-round structure.
- **Field-by-field concept building:** Don't prompt "What's the elevator pitch? Now USP? Now SWOT?" Generate complete draft first.
- **Cheerleading summaries:** Step 10 confidence assessment must be honest. If research was thin, say so.
- **Build Pack premature export:** Step 10 is synthesis only. Don't promise PRD export (future feature).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idea clustering algorithm | Custom NLP clustering | AI prompt instructions | LLM already clusters semantically via themed generation prompts |
| Crazy 8s timer | Countdown UI component | AI conversational pacing | User decision: "no timer UI, just AI pacing" |
| SWOT template | Custom SWOT UI builder | Structured text output + rendering | 3 bullets × 4 quadrants renders cleanly as lists, no complex UI needed |
| Synthesis narrative generation | Template-based summary builder | AI prompt with dual-format instructions | LLM excels at narrative generation when given clear structure |

**Key insight:** Text-based ideation and synthesis are AI's strengths. Don't over-engineer UI when conversational prompts + structured extraction + simple rendering suffice.

## Common Pitfalls

### Pitfall 1: Wild Card Ideas Too Tame

**What goes wrong:** AI generates "wild card" ideas that are just slight variations of normal ideas, not genuinely provocative.

**Why it happens:** Generic prompts like "suggest unusual ideas" without explicit boundary-pushing guidance.

**How to avoid:**
- Prompt: "Wild cards should challenge assumptions, use analogies from other industries, feel slightly uncomfortable or 'too bold.'"
- Examples in prompt: "What if we gamified this like a mobile game?" "What if we made it 10x more expensive but premium?" "What if users had to invite friends to unlock features?"

**Warning signs:** All cluster ideas sound similar in tone/scope. User says "these aren't very creative."

**Source:** [Ideation techniques research 2026](https://www.itonics-innovation.com/blog/powerful-ideation-techniques) emphasizing provocative prompts for creative divergence.

### Pitfall 2: Brain Writing Loses Coherence

**What goes wrong:** After 3 rounds of "Yes, and..." building, ideas become bloated or contradictory.

**Why it happens:** Each round adds features without pruning, losing the core concept.

**How to avoid:**
- Prompt each brain writing round: "Build on [idea], adding ONE meaningful enhancement. Don't pile on unrelated features."
- After Round 3, AI summarizes: "The core concept evolved from [original] to [enhanced]. Key additions: [list]."
- User decision allows this: "evolved clusters vs flat ranked list" is at Claude's discretion for presentation.

**Warning signs:** User confused about what the idea actually is after brain writing. Too many features listed.

### Pitfall 3: Concept Sheet Generic or Ungrounded

**What goes wrong:** Step 9 concept sheet feels like marketing fluff with no connection to prior research.

**Why it happens:** AI generates concept without referencing persona, journey, or research insights.

**How to avoid:**
- System prompt MUST inject Step 5 persona, Step 6 journey dip, Step 4 pains/gains into context.
- Prompt instructions: "Use [persona name]'s pains from Step 4 to inform SWOT weaknesses. Use journey dip from Step 6 to validate problem relevance."
- Feasibility rationale must cite prior steps: "User desirability: High (5/5) — directly addresses [persona]'s top pain: [quote from Step 4]"

**Warning signs:** SWOT bullets could apply to any product. Feasibility scores have no justification. User says "this doesn't feel like it connects to my research."

### Pitfall 4: Synthesis Summary Reads Like Changelog

**What goes wrong:** Step 10 summary becomes a dry list of "Step 1 outputs: [bullet], Step 2 outputs: [bullet]" with no narrative thread.

**Why it happens:** Treating synthesis as data dump instead of storytelling.

**How to avoid:**
- User decision enforces dual format: "narrative intro paragraph + structured step-by-step summary below (both)."
- Narrative intro prompt: "Tell the story of the journey: where user started (vague idea), what they discovered (research insights), where they arrived (validated concept). Make them feel their time was well spent."
- Structured summary is supplemental reference, not primary output.

**Warning signs:** Step 10 feels anticlimactic. User doesn't feel closure. Summary lacks emotional resonance.

**Source:** [Synthesis methods research](https://uxdesign.cc/synthesis-how-to-make-sense-of-your-design-research-d67ad79b684b) emphasizing coherent narrative as core of synthesis.

## Code Examples

Verified patterns from existing implementation:

### Step-Specific Prompt Injection (from step-prompts.ts)

```typescript
// Source: src/lib/ai/prompts/step-prompts.ts (existing pattern)
export function getStepSpecificInstructions(stepId: string): string {
  const instructions: Record<string, string> = {
    'ideation': `STEP GOAL: Generate volume of ideas from the reframed HMW.

DESIGN THINKING PRINCIPLES:
- Quantity over quality in initial rounds (divergent thinking)
- Wild cards challenge assumptions and unlock new directions
- "Yes, and..." builds on ideas without critique
- Defer judgment until selection phase

IDEATION FLOW (6 rounds):

ROUND 1: CLUSTER GENERATION
Generate 3-4 themed clusters addressing the HMW from Step 7.
- Each cluster: 3-4 ideas
- Mark 1-2 wild cards per cluster (deliberately provocative/unconventional)
- Wild cards should feel genuinely unconventional, push creative boundaries
- Present themes and ideas, NO rationale (keep it fast and creative)

ROUND 2: USER INPUT PROMPT
After presenting clusters, explicitly ask: "What ideas would YOU add?"
- Capture user ideas alongside AI suggestions
- Encourage piggybacking on existing ideas

ROUND 3-5: BRAIN WRITING (3 rounds)
User picks 5-8 favorite ideas for development.
For each favorite, run 3 rounds of "Yes, and..." enhancement:
- Round 1: AI adds one meaningful enhancement to the idea
- Round 2: AI builds on Round 1 enhancement
- Round 3: AI adds final evolution
After all rounds, present evolved ideas.

ROUND 6: CRAZY 8s (rapid-fire)
AI facilitates 8 quick ideas with energetic pacing:
- "Quick — first thought that comes to mind!"
- "Don't overthink — what if we...?"
- No timer UI, AI creates urgency through prompts
- Pacing should feel energetic, not formal

SELECTION (end of Step 8):
User tells AI which ideas to develop into concepts.
- Hard limit: max 3-4 ideas for concept development
- AI enforces limit, confirms selection
- Selected ideas become separate concepts (no combining)

ARTIFACT STRUCTURE:
Save ALL generated ideas with selected ones flagged:
- Cluster ideas (with wild card markers)
- User-contributed ideas
- Brain writing evolved ideas
- Crazy 8s ideas
- Selection flags (no rejection tags, just selected vs not selected)

BOUNDARY: This step is about GENERATING ideas, not evaluating them. Defer feasibility analysis to Step 9. Wild cards should feel uncomfortable — that's the point.

PRIOR CONTEXT USAGE:
Reference the reframed HMW (Step 7) as the ideation prompt.
Reference persona (Step 5) and journey dip (Step 6) to ground ideas in user needs.`,

    'concept': `STEP GOAL: Develop selected ideas into polished concept sheets with SWOT and feasibility analysis.

DESIGN THINKING PRINCIPLES:
- Concepts are stakeholder-ready — polished, not rough
- SWOT must be honest (no cheerleading)
- Feasibility uses evidence from prior steps
- Billboard Hero tests clarity of value proposition

CONCEPT GENERATION APPROACH:
AI recommends 1-3 concepts based on how distinct the selected ideas from Step 8 are.

For each selected idea, AI drafts COMPLETE concept sheet proactively (not field-by-field):
1. Name: marketable, 2-4 words, evocative
2. Elevator pitch: 2-3 sentences, Problem → Solution → Benefit structure
3. USP: what makes this different from current state (reference Step 6 journey)
4. SWOT analysis (3 bullets per quadrant):
   - Strengths: internal advantages (reference persona gains)
   - Weaknesses: internal limitations (reference persona pains)
   - Opportunities: external potential (market/domain context)
   - Threats: external risks (challenges from stakeholder map)
5. Feasibility scores (1-5 numeric scale with rationale):
   - Technical: can we build this?
   - Business: is it viable?
   - User desirability: do users want it? (cite persona pains/gains)
   - Rationale for each score with evidence

Present draft: "Here's a concept sheet for [idea]. Review and tell me what to refine."

User edits specific sections conversationally. DO NOT ask field-by-field prompts.

BILLBOARD HERO EXERCISE:
After concept sheet, run Billboard Hero test:
- Headline: 6-10 words, benefit-focused (not feature-focused)
- Subheadline: 1-2 sentences, explains how it solves persona's pain
- CTA: verb-driven, specific
Ask: "If [persona] saw this billboard, would they stop and pay attention?"

EVIDENCE TRACEABILITY (CRITICAL):
Every SWOT bullet and feasibility score MUST trace to prior steps:
- "Strength: Addresses [persona]'s top pain (manual data entry) from Step 4"
- "User desirability: 5/5 — [persona] said: '[quote from Step 3]'"
No hallucinated claims. If prior steps don't support it, don't include it.

GATHERING REQUIREMENTS:
- Which idea from Step 8 to develop?
- Review AI-drafted concept sheet
- Refine elevator pitch, USP, SWOT, feasibility
- Test Billboard Hero headline

BOUNDARY: This step is about DEVELOPING concepts, not choosing which to build. Final prioritization and Build Pack export are future features. Next steps in Step 10 will point toward validation and implementation planning.

PRIOR CONTEXT USAGE:
Reference selected ideas from Step 8 (Ideation) as starting point.
Reference persona (Step 5) for SWOT weaknesses/strengths and feasibility user desirability.
Reference journey dip (Step 6) for USP differentiation from current state.
Reference research (Steps 3-4) for SWOT evidence and feasibility rationale.`,

    'validate': `STEP GOAL: Synthesize the full 10-step journey into a validated summary.

DESIGN THINKING PRINCIPLES:
- Synthesis creates closure — user should feel their time was well spent
- Honest assessment, not cheerleading (confidence rating reflects research quality)
- Next steps are concrete and actionable
- Summary balances narrative (emotional) with structure (reference)

SYNTHESIS FORMAT (dual structure):

1. NARRATIVE INTRO (1-2 paragraphs):
Tell the journey story:
- Where user started: vague idea, initial challenge (Step 1)
- What they discovered: research insights, persona, journey dip (Steps 2-6)
- How they reframed: HMW evolution (Step 7)
- Where they arrived: generated ideas, validated concept (Steps 8-9)
Make them feel the transformation from vague idea to validated concept.
Storytelling tone, not dry summary.

2. STRUCTURED STEP-BY-STEP SUMMARY:
For each step (1-10), provide:
- Step name
- 2-3 bullet points of MOST IMPORTANT outputs only
Example:
"Step 1: Challenge
- Problem: [core problem statement]
- Target user: [who]
- HMW: [original HMW statement]"

Do NOT dump all data. Key outputs only (scannable reference).

3. CONFIDENCE ASSESSMENT:
Rate how well-validated the concept is (1-10 scale):
- Score: [number]
- Rationale: [why this score]
- Research quality: [thin/moderate/strong]
Be HONEST. If research was thin (synthetic interviews only), say so.
Example: "Confidence: 6/10. Research was synthetic (no real user interviews), but persona and concept align with stated challenge. Recommend validating assumptions with real users."

4. NEXT STEPS (3-5 concrete actions):
Based on concept and gaps identified:
- "Conduct 5 user interviews with [persona type] to validate [assumption]"
- "Build low-fidelity prototype of [concept feature]"
- "Research competitors addressing [problem space]"
- "Define MVP scope and technical requirements"
NOT generic ("do more research"). Specific to THIS concept and gaps.

NOTE: Build Pack export is a future feature. Next steps point toward it but don't promise it yet.

GATHERING REQUIREMENTS:
AI synthesizes automatically from all prior step artifacts. No user prompts needed unless user wants to adjust narrative tone or add context.

BOUNDARY: This is the FINAL step (Step 10). It's about synthesis and closure, not generating new outputs. If user wants to revise earlier steps, use navigation to go back. Step 10 is read-only reflection on the journey.

PRIOR CONTEXT USAGE:
Reference ALL prior steps (1-9) in narrative intro and structured summary.
Cite key outputs: challenge HMW, stakeholder map, persona name/quote, journey dip, reframed HMW, selected ideas, concept name/pitch.
Show the arc: vague → researched → reframed → ideated → validated.`,
  };

  return instructions[stepId] || '';
}
```

### Schema-Driven Extraction (existing pattern from extract-artifact.ts)

```typescript
// Source: src/lib/extraction/extract-artifact.ts (existing implementation)
import { streamText } from 'ai';
import { chatModel } from '@/lib/ai/chat-config';
import { stepSchemaMap } from '@/lib/schemas/step-schemas';

export async function extractArtifact(
  stepId: string,
  messages: Message[]
): Promise<Record<string, unknown>> {
  const schema = stepSchemaMap[stepId];
  if (!schema) throw new Error(`No schema for step: ${stepId}`);

  // AI SDK 6 structured output with schema
  const { output } = await streamText({
    model: chatModel,
    system: `Extract structured data from conversation. Follow the schema exactly.`,
    messages,
    output: schema, // Zod schema with .describe() fields guides extraction
    maxRetries: 2, // Retry on schema validation failures
  });

  return output; // Type-safe, validated artifact
}
```

### Step-Specific UI Rendering (from Phase 12 pattern)

```typescript
// Source: Pattern established in src/components/workshop/output-panel.tsx
// Steps 8-10 will follow same conditional rendering pattern

function OutputPanel({ artifact, stepOrder }: OutputPanelProps) {
  // Step-specific rendering
  if (stepOrder === 8 && artifact) {
    return <IdeationClusterView artifact={artifact} />;
  }

  if (stepOrder === 9 && artifact) {
    return <ConceptSheetView artifact={artifact} />;
  }

  if (stepOrder === 10 && artifact) {
    return <SynthesisSummaryView artifact={artifact} />;
  }

  // Fallback: generic markdown rendering
  return <MarkdownRenderer content={JSON.stringify(artifact, null, 2)} />;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static ideation templates | AI-augmented brainwriting with LLM collaboration | 2024-2025 | [CHI 2024 research](https://dl.acm.org/doi/10.1145/3613904.3642414) shows LLM integration enhances ideation process and outcomes |
| Manual SWOT quadrant filling | Proactive AI concept sheet generation | 2025-2026 | Reduces cognitive load, user edits complete draft instead of incremental prompts |
| Generic synthesis templates | Dual-format synthesis (narrative + structure) | 2024+ | [UX synthesis research](https://uxdesign.cc/synthesis-how-to-make-sense-of-your-design-research-d67ad79b684b) shows narrative coherence critical for closure |

**Deprecated/outdated:**
- Visual canvas requirement for mind mapping: Text-based structured lists work for v1.0 (visual canvas deferred to MMP per user decision)
- Dot voting UI: Text-based selection in chat works for v1.0 (dot voting deferred to MMP)
- Real-time collaboration for brain writing: Solo user AI-facilitated brain writing sufficient for v1.0

## Open Questions

1. **Billboard Hero integration timing**
   - What we know: User decided Billboard Hero included in Step 9
   - What's unclear: Before or after concept sheet generation? Separate round or embedded in concept refinement?
   - Recommendation: Run Billboard Hero AFTER concept sheet as validation exercise. Headline/subheadline test if elevator pitch is clear.

2. **Multiple concepts handling in Step 9**
   - What we know: User can select up to 3-4 ideas from Step 8, each becomes separate concept
   - What's unclear: Generate all concept sheets in sequence? Parallel? User picks one to develop first?
   - Recommendation: AI recommends 1-3 to develop (based on distinctness), generates sequentially with user review per concept. User can request "develop another" or "focus on this one."

3. **Crazy 8s vs Brain Writing sequencing**
   - What we know: User decision says "Separate Crazy 8s round after brain writing"
   - What's unclear: User has already brain-written 3 rounds on 5-8 ideas. Crazy 8s generates 8 MORE ideas. Are Crazy 8s ideas also eligible for selection, or just a final creative burst?
   - Recommendation: Crazy 8s ideas ARE selectable for concept development (part of the final idea pool). AI presents combined pool: cluster ideas + user ideas + brain-written ideas + Crazy 8s ideas. User selects from full set.

## Sources

### Primary (HIGH confidence)

- Existing codebase patterns (src/lib/ai/prompts/step-prompts.ts, src/lib/extraction/extract-artifact.ts, src/lib/schemas/step-schemas.ts)
- Phase 11-12 implementation (step-specific prompts, schema-driven extraction, UI rendering patterns)
- User decisions from 13-CONTEXT.md (locked implementation specifications)
- Obsidian domain specs (Steps 8-10 detailed specifications)

### Secondary (MEDIUM confidence)

- [AI-Augmented Brainwriting research (CHI 2024)](https://dl.acm.org/doi/10.1145/3613904.3642414) — LLM integration in group ideation
- [Text-based ideation techniques 2026](https://www.itonics-innovation.com/blog/powerful-ideation-techniques) — Structured brainwriting methods
- [SWOT Analysis best practices (Asana 2026)](https://asana.com/resources/swot-analysis) — Structured quadrant format
- [UX synthesis methods](https://uxdesign.cc/synthesis-how-to-make-sense-of-your-design-research-d67ad79b684b) — Narrative coherence in design research synthesis
- [Design thinking synthesis (Voltage Control)](https://voltagecontrol.com/articles/unveiling-the-core-of-design-thinking-mastering-synthesis-and-insight-generation/) — Transformation from data to insight

### Tertiary (LOW confidence)

- [AI brainstorming generators 2026](https://juma.ai/blog/ai-brainstorming-generators) — General AI ideation tools (not design thinking specific)
- [Brainwriting methods (Miro)](https://miro.com/brainstorming/what-is-brainwriting/) — General brainwriting overview (not AI-augmented)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies, extends existing Phases 7-12 architecture
- Architecture patterns: HIGH — Multi-round conversation, proactive generation, dual-format synthesis verified via research + user decisions
- Step 8 ideation flow: HIGH — User decisions explicit on 6-round structure
- Step 9 concept development: HIGH — Proactive generation + SWOT format + feasibility locked in CONTEXT.md
- Step 10 synthesis: HIGH — Dual format (narrative + structured) clearly specified
- UI rendering patterns: HIGH — Follows established Phase 12 pattern (PersonaCard, JourneyMapGrid precedent)
- Wild card idea quality: MEDIUM — Pitfall identified, prompt guidance needed, subjective "provocative" threshold
- Billboard Hero format: MEDIUM — Open question on timing/integration, at Claude's discretion per CONTEXT.md
- Multiple concept handling: MEDIUM — Open question on sequencing, recommendation provided

**Research date:** 2026-02-09
**Valid until:** 60 days (stable domain — design thinking methodology + existing tech stack)

---

**Ready for planning.** Research complete with HIGH confidence across all critical domains. Planner can create PLAN.md files using:
- Locked user decisions for implementation constraints
- Established patterns from Phases 7-12 for code structure
- Multi-round conversation architecture for Step 8
- Proactive AI generation for Step 9
- Dual-format synthesis for Step 10
- Step-specific UI components following Phase 12 precedent
