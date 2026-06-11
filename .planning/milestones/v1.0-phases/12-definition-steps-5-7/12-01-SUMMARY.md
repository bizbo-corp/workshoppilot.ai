---
phase: 12-definition-steps-5-7
plan: 01
subsystem: ai-facilitation
tags:
  - schemas
  - prompts
  - validation
  - definition-steps
  - steps-5-7

dependency_graph:
  requires:
    - Phase 11 Discovery Steps 1-4 schemas and prompts
    - Phase 9 schema-driven extraction architecture
    - Phase 8 step-aware prompting system
  provides:
    - Enriched persona schema with motivations, frustrations, day-in-the-life, gains
    - 7-layer journey mapping schema with traffic light emotions
    - 4-part HMW builder schema with multiple statements support
    - Domain-expert facilitation prompts for Steps 5-7
    - Enhanced validation criteria for Definition steps
  affects:
    - Step 5 AI extraction behavior (new optional fields)
    - Step 6 AI extraction behavior (7 layers with traffic light enum)
    - Step 7 AI extraction behavior (4-part HMW array)
    - Step 5-7 validation quality checks

tech_stack:
  added:
    - None (used existing Zod, AI SDK 6, validation patterns)
  patterns:
    - Zod enum for traffic light emotions (positive/neutral/negative)
    - Optional fields for persona enrichment (motivations, frustrations, dayInTheLife)
    - Nested object arrays for multi-HMW statements
    - Evidence traceability guidance in prompts
    - Proactive AI drafting instructions
    - Multi-persona support with research-driven count

key_files:
  created: []
  modified:
    - src/lib/schemas/step-schemas.ts
    - src/lib/ai/prompts/step-prompts.ts
    - src/lib/ai/prompts/validation-criteria.ts

key_decisions:
  - Persona gains field added as required (min 1, max 5) — was missing from original schema
  - Persona motivations, frustrations, dayInTheLife are optional — only populated when conversation data exists
  - Journey emotions use traffic light enum (positive/neutral/negative) instead of freeform text for AI extraction reliability
  - Journey stages renamed 'actions' to 'action' (singular) for 7-layer clarity
  - Journey adds 4 new layers: goals, barriers, touchpoints (required), momentsOfTruth and opportunities (optional)
  - Reframe schema completely restructured: refinedHmw replaced with hmwStatements array using 4-part builder
  - Step 5 AI proactively drafts ALL persona fields (not Q&A session)
  - Step 5 evidence traceability: pains/gains MUST trace to Step 4, demographics can be inferred
  - Step 6 AI suggests stages collaboratively, then populates all 7 layers from research
  - Step 6 AI identifies dip with rationale, user confirms
  - Step 7 AI drafts fresh HMW from scratch (not evolution of Step 1)
  - Step 7 supports multiple HMW statements with selectedForIdeation array
  - All 3 steps include BOUNDARY instructions preventing premature ideation

metrics:
  duration: 6 min
  start_time: 2026-02-09T04:40:57Z
  end_time: 2026-02-09T04:47:17Z
  completed: 2026-02-09
---

# Phase 12 Plan 01: Definition Steps Schema & Prompt Enrichment Summary

**One-liner:** Enriched Steps 5-7 with user-decided schema fields (persona gains/motivations/day-in-the-life, 7-layer journey with traffic light emotions, 4-part HMW builder) and domain-expert facilitation prompts with evidence traceability, proactive drafting, and boundary instructions.

## Performance

**Duration:** 6 minutes (2026-02-09 04:40 - 04:47 UTC)
**Tasks completed:** 2 of 2
**Files modified:** 3
**Commits:** 2

## Accomplishments

Updated Zod schemas for Steps 5-7 to match user decisions from 12-CONTEXT.md:

**Step 5 Persona:**
- Added `gains` field (required, min 1, max 5) — was missing from original schema
- Added `motivations`, `frustrations`, `dayInTheLife` as optional fields
- All new fields include rich `.describe()` guidance for LLM extraction

**Step 6 Journey Mapping:**
- Replaced 3-layer structure (actions, thoughts, emotions) with 7-layer structure
- 7 layers per stage: action (singular), goals, barriers, touchpoints, emotions (enum), momentsOfTruth (optional), opportunities (optional)
- Emotions changed from freeform string to traffic light enum: 'positive' | 'neutral' | 'negative'
- Added `dipRationale` field (optional string) explaining why stage is the dip
- Stage count remains 4-8 min/max

**Step 7 Reframe:**
- Replaced `refinedHmw` (single string) with `hmwStatements` array
- Each HMW statement has 4-part structure: givenThat, persona, immediateGoal, deeperGoal, fullStatement
- Added `selectedForIdeation` array (optional) for multi-HMW selection
- Preserved `originalHmw`, `insightsApplied`, `evolution` fields

Enriched step prompts with domain-expert facilitation guidance:

**Step 5 Persona:**
- EVIDENCE TRACEABILITY: Pains/gains MUST trace to Step 4 with source attribution; demographics can be inferred from stakeholder types
- PROACTIVE DRAFTING: AI drafts ALL fields (name, age, bio, quote, everything) based on research; user reviews rather than builds from scratch
- MULTI-PERSONA GUIDANCE: Support 1-3 personas, research-driven count (not fixed), start with primary, suggest additional if research shows distinct user types
- BOUNDARY: Synthesizing research into persona, not jumping to solutions
- GATHERING REQUIREMENTS: Expanded to cover all 12 schema fields (was 5)
- PRIOR CONTEXT USAGE: Step 4 heavy for pains/gains, Step 3 for behaviors/quotes, Step 2 for stakeholder type

**Step 6 Journey Mapping:**
- STAGE CREATION COLLABORATIVE: AI suggests 4-8 stages based on persona/context, user confirms/modifies, AI populates layers
- 7-LAYER POPULATION: Detailed instructions for populating action, goals, barriers, touchpoints, emotions (traffic light), momentsOfTruth, opportunities from prior research
- DIP IDENTIFICATION: AI identifies dip stage with rationale based on barriers/emotion severity, user confirms or selects different stage
- CONTEXT REFERENCING: Use generic references ("the user"), not persona name, in stage descriptions
- BOUNDARY: Mapping current experience, not designing future solution
- PRIOR CONTEXT USAGE: Persona behaviors/pains, Step 4 pains as barriers, Step 3 for touchpoints, Step 1 for focus

**Step 7 Reframe:**
- STEP GOAL: Fresh rewrite from scratch (not evolution of Step 1)
- 4-PART HMW BUILDER: AI suggests 2-3 options per field with source context (Given that from dip barriers, persona from Step 5, immediate goal from journey/persona goals, deeper goal from Step 4 gains)
- MULTIPLE HMW STATEMENTS: User can create multiple, AI asks which to carry into Step 8 ideation
- VALIDATION: Explicit traceability (each field traces to specific research) + quality checks (more focused than Step 1, doesn't prescribe solution)
- BOUNDARY: Reframing problem, not solving it
- PRIOR CONTEXT USAGE: Journey dip heavy for "Given that", persona for persona field, Step 4 gains for deeper goal, compare to Step 1 to show evolution

Enhanced validation criteria:

**Step 5:** Added 2 new criteria (total 6)
- Evidence Traceability: Pains/gains explicitly trace to Step 4 with source attribution
- Multi-Persona Coverage: Persona count matches research diversity (1-3 as needed)

**Step 6:** Added 3 new criteria (total 7)
- Layer Depth: Each layer contains specific research-grounded details (not generic)
- Emotional Variance: Emotions vary and reflect barrier severity
- Dip Evidence: Dip stage has specific barriers from Step 4 and negative emotion

**Step 7:** Added 3 new criteria (total 7)
- Dip Alignment: "Given that" traces directly to journey dip barriers
- Evidence Traceability: Each of 4 HMW parts traces to specific prior research
- Fresh Rewrite: HMW drafted fresh from research (not minor refinement of Step 1)

## Task Commits

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Update Zod schemas for Steps 5-7 | 5badf28 | Added persona gains/motivations/frustrations/dayInTheLife, 7-layer journey with traffic light emotions, 4-part HMW builder array |
| 2 | Enrich step prompts and validation criteria | c5ad72c | Evidence traceability, proactive drafting, multi-persona guidance, 7-layer population, dip identification, 4-part HMW builder, boundary instructions, validation criteria enhancements |

## Files Created/Modified

**Modified:**
- `/Users/michaelchristie/devProjects/workshoppilot.ai/src/lib/schemas/step-schemas.ts` — Updated personaArtifactSchema, journeyMappingArtifactSchema, reframeArtifactSchema with user-decided fields
- `/Users/michaelchristie/devProjects/workshoppilot.ai/src/lib/ai/prompts/step-prompts.ts` — Enriched persona, journey-mapping, reframe instructions with domain-expert guidance
- `/Users/michaelchristie/devProjects/workshoppilot.ai/src/lib/ai/prompts/validation-criteria.ts` — Added 8 new validation criteria across Steps 5-7

## Decisions Made

**Schema Design:**
- Persona `gains` field is required (min 1, max 5) — matches pains structure, was missing from original
- Persona optional fields (motivations, frustrations, dayInTheLife) auto-populate when data exists but skippable
- Journey emotions enum constrained to 3 values (positive/neutral/negative) for reliable AI extraction and traffic light UI mapping
- Journey `action` singular (not `actions`) for 7-layer clarity — one primary action per stage
- Reframe supports array of HMW statements (not single) with selectedForIdeation for multi-HMW ideation workflow

**AI Facilitation Patterns:**
- Proactive drafting pattern: AI drafts everything, user reviews/refines (not Q&A session where user provides each field)
- Evidence traceability distinction: Research-derived fields (pains/gains) MUST cite Step 4 evidence; inferred fields (demographics) can be reasoned from context
- Multi-persona guidance: Count determined by research diversity (1-3 personas), not user preference upfront
- Collaborative stage creation: AI suggests, user confirms, AI populates (not user-driven construction)
- Fresh rewrite principle: Step 7 HMW is new statement from scratch using all research, not incremental evolution of Step 1

**Validation Strategy:**
- Step 5 validates both evidence chain AND persona count appropriateness (research diversity check)
- Step 6 validates layer depth (specific details not generic) AND emotional variance (not all negative/positive)
- Step 7 validates both traceability (4-part evidence chain) AND fresh rewrite (not minor refinement)

## Deviations from Plan

None — plan executed exactly as written. All must-have truths implemented:
- Step 5 persona schema supports multi-persona flow with motivations, frustrations, day-in-the-life fields ✓
- Step 6 journey schema has 7 layers per stage with traffic light emotion values ✓
- Step 7 reframe schema supports 4-part HMW builder with multiple statements ✓
- Step 5 AI proactively drafts persona and instructs evidence traceability ✓
- Step 6 AI suggests stages, populates 7 layers, identifies dip with rationale, uses traffic light emotions ✓
- Step 7 AI drafts fresh HMW from scratch, suggests options per field, validates traceability ✓
- All 3 Definition steps have BOUNDARY instructions preventing premature ideation ✓

## Issues Encountered

None. TypeScript compilation and build succeeded on first attempt for both tasks.

## Next Phase Readiness

**Phase 12 complete:** Definition Steps 5-7 schemas and prompts enriched.

**Blockers:** None

**Ready for:**
- Phase 13: Ideation/Validation Steps 8-10 schema and prompt enrichment (same pattern as Phases 11-12)
- End-to-end testing of Steps 5-7 facilitation with enriched prompts (human verification recommended)

**Dependencies satisfied:**
- Phase 9 schema-driven extraction supports new optional fields and enum constraints
- Phase 8 arc-phase-aware prompts will inject enriched instructions during facilitation
- Phase 11 established Discovery pattern; Phase 12 extends to Definition cluster

**Follow-up work:**
- Step 5-7 output rendering (persona card, journey grid, HMW builder UI) deferred to separate implementation phase
- Multi-persona flow UI (skeleton cards, "1 of 3" indicators) design not blocking — prompts support multi-persona, UI can evolve
- Traffic light color mapping for journey emotions (positive=green, neutral=orange, negative=red) design decision made, implementation when UI built

---

## Self-Check: PASSED

All SUMMARY claims verified:
- ✓ All 3 modified files exist
- ✓ Both commits exist (5badf28, c5ad72c)
- ✓ Persona gains, motivations fields added
- ✓ Journey traffic light emotions enum added
- ✓ Reframe hmwStatements array added
- ✓ Step 5 EVIDENCE TRACEABILITY section added
- ✓ Step 6 7-LAYER POPULATION section added
- ✓ Step 7 4-PART HMW BUILDER section added

---

*Plan executed: 2026-02-09 04:40-04:47 UTC*
*Phase: 12-definition-steps-5-7, Plan: 01 of 1*
