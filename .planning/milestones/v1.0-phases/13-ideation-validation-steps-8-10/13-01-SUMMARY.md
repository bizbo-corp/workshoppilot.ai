# Phase 13 Plan 01: Schema & Prompt Updates for Steps 8-10 Summary

**One-liner:** Enriched Zod schemas, AI prompts, and validation criteria for Steps 8-10 with multi-round ideation structure (clusters/wild cards/brain writing/Crazy 8s), complete concept sheets (SWOT 3x4/1-5 feasibility/Billboard Hero), and dual-format synthesis (narrative + structured summary with honest confidence assessment).

---

## Frontmatter

```yaml
phase: 13-ideation-validation-steps-8-10
plan: 01
subsystem: ai-facilitation
tags: [schemas, prompts, validation, ideation, concept-development, synthesis]
dependency_graph:
  requires:
    - "Phase 12 Plan 01 (Definition Steps 5-7 schemas and prompts)"
    - "Phase 11 Plan 02 (Discovery Steps 1-4 enriched prompts)"
    - "Phase 9 Plan 01 (Zod schema architecture with stepSchemaMap)"
  provides:
    - "Step 8 ideation schema: multi-round creative history with selection flags"
    - "Step 9 concept schema: complete concept sheets with evidence traceability"
    - "Step 10 validate schema: dual-format synthesis with confidence assessment"
    - "Enriched domain-expert prompts for Steps 8-10"
    - "Enhanced validation criteria for quality checks"
  affects:
    - "Phase 13 Plan 02 (Step-specific UI components for Steps 8-10)"
    - "Phase 13 Plan 03 (Schema-prompt alignment verification)"
tech_stack:
  added: []
  patterns:
    - "6-round structured ideation flow (cluster → user input → brain writing x3 → Crazy 8s → selection)"
    - "Proactive concept sheet generation (AI drafts complete, user refines)"
    - "Evidence traceability requirement (every SWOT bullet and feasibility score traces to prior research)"
    - "Dual-format synthesis (storytelling narrative + scannable structured reference)"
    - "Honest confidence assessment (score + rationale + research quality enum)"
key_files:
  created: []
  modified:
    - src/lib/schemas/step-schemas.ts
    - src/lib/ai/prompts/step-prompts.ts
    - src/lib/ai/prompts/validation-criteria.ts
decisions:
  - id: IDEA-01
    decision: "Step 8 artifact saves ALL generated ideas across 6 rounds (clusters, user ideas, brain writing, Crazy 8s) with selected ones flagged"
    rationale: "Preserves creative history for reference without discarding unselected ideas, follows user decision from 13-CONTEXT.md"
    alternatives_considered: "Save only selected ideas (loses creative context), combine all rounds into flat array (loses round structure)"
    impact: "Artifact structure has 5 optional arrays: clusters (required), userIdeas, brainWrittenIdeas, crazyEightsIdeas, selectedIdeas"
  - id: IDEA-02
    decision: "Step 8 enforces hard limit of max 3-4 selected ideas for concept development"
    rationale: "Prevents scope creep and ensures focused concept development in Step 9, matches user decision"
    alternatives_considered: "No limit (too many concepts dilutes quality), fixed 3 limit (too rigid)"
    impact: "selectedIdeas schema uses .min(1).max(4) validation, prompt instructs AI to enforce limit"
  - id: CONC-01
    decision: "Step 9 concept schema uses concepts array (1-3 concepts), each with ideaSource field tracing back to Step 8"
    rationale: "Supports multiple concepts while maintaining traceability to source ideas, each selected idea becomes separate concept"
    alternatives_considered: "Single concept object (doesn't support multiple concepts), allow combining ideas (loses traceability)"
    impact: "Schema structure: concepts: z.array(...).min(1).max(3), each concept has ideaSource field"
  - id: CONC-02
    decision: "SWOT analysis requires exactly 3 bullets per quadrant with evidence traceability"
    rationale: "Consistency for UI rendering, forces focus on top 3 per quadrant, matches user decision from 13-CONTEXT.md"
    alternatives_considered: ".min(3) without .max(3) (allows inconsistent lengths), .min(1) (too sparse)"
    impact: "Schema uses .min(3).max(3) for all 4 SWOT quadrant arrays, prompt emphasizes evidence citation"
  - id: CONC-03
    decision: "Feasibility uses 1-5 numeric scores with separate rationale field per dimension (technical/business/userDesirability)"
    rationale: "Numeric scale enables quantitative comparison, separate rationale ensures evidence-based scoring, matches user decision"
    alternatives_considered: "Qualitative enum (high/medium/low, less precise), single rationale for all 3 (loses per-dimension clarity)"
    impact: "Schema has 6 fields: technical (number 1-5), technicalRationale (string), business (number 1-5), businessRationale (string), userDesirability (number 1-5), userDesirabilityRationale (string)"
  - id: CONC-04
    decision: "Billboard Hero exercise included as optional field in concept schema (headline/subheadline/cta)"
    rationale: "Tests value proposition clarity, matches user decision to include in Step 9, optional to not block extraction if skipped"
    alternatives_considered: "Required field (blocks extraction if user skips exercise), separate artifact (over-engineering)"
    impact: "billboardHero field is .optional() nested object with 3 string fields"
  - id: VAL-01
    decision: "Step 10 validate schema completely restructured from PRD/Build Pack format to dual-format synthesis summary"
    rationale: "Matches user decision that Build Pack export is future feature, Step 10 is about synthesis and closure not deliverable generation"
    alternatives_considered: "Keep PRD fields as optional (confusing messaging), add synthesis fields alongside PRD (schema bloat)"
    impact: "Removed: userFlow, prdOutline fields. Added: narrativeIntro, stepSummaries (array of step number + name + keyOutputs), confidenceAssessment (score + rationale + researchQuality enum), recommendedNextSteps (3-5 concrete actions)"
  - id: VAL-02
    decision: "Confidence assessment uses 1-10 numeric score with honest rationale and researchQuality enum (thin/moderate/strong)"
    rationale: "Forces honest self-assessment, research quality enum captures whether interviews were synthetic vs real, matches user decision for honesty not cheerleading"
    alternatives_considered: "Qualitative confidence (vague), no research quality field (loses important context)"
    impact: "confidenceAssessment object has score (1-10 number), rationale (string explaining gaps), researchQuality (enum: thin/moderate/strong)"
  - id: PROM-01
    decision: "Step 8 prompt uses 6-round structured flow with explicit round names and instructions per round"
    rationale: "Clear structure prevents AI from skipping rounds or conflating techniques, matches user decision for structured ideation"
    alternatives_considered: "Generic ideation guidance (AI might skip techniques), techniques as options not required flow (inconsistent execution)"
    impact: "Prompt has 6 labeled sections: ROUND 1 (cluster gen), ROUND 2 (user input), ROUND 3-5 (brain writing), ROUND 6 (Crazy 8s), SELECTION"
  - id: PROM-02
    decision: "Wild cards must feel 'genuinely unconventional' with examples of boundary-pushing ideas"
    rationale: "Without examples AI generates safe variations, wild cards need to challenge assumptions per design thinking principles"
    alternatives_considered: "Just say 'wild card' without examples (too vague), mark as optional (loses creative value)"
    impact: "Prompt includes example wild cards: 'gamified like mobile game', '10x more expensive but premium', 'invite friends to unlock features'"
  - id: PROM-03
    decision: "Crazy 8s uses energetic conversational pacing instead of formal timer UI"
    rationale: "No timer component in UI yet (future work), AI can create urgency through language, matches user decision"
    alternatives_considered: "Skip Crazy 8s until timer built (loses creative technique), use generic prompting (loses energy)"
    impact: "Prompt includes energetic phrasing examples: 'Quick — first thought!', 'That's 4 down, 4 to go!', 'Don't overthink'"
  - id: PROM-04
    decision: "Step 9 prompt instructs AI to proactively draft COMPLETE concept sheet, not field-by-field Q&A"
    rationale: "User reviews complete draft (faster, more natural) vs answering 10+ questions (tedious), matches user decision"
    alternatives_considered: "Field-by-field prompting (slow, interview-like), user drafts everything (defeats AI facilitation purpose)"
    impact: "Prompt says: 'AI drafts ALL persona fields proactively... Present draft... User reviews and refines (not builds from scratch). This is NOT a Q&A session.'"
  - id: PROM-05
    decision: "Evidence traceability marked CRITICAL with good/bad examples in Step 9 prompt"
    rationale: "Research grounding is core to design thinking methodology, examples prevent generic SWOT bullets"
    alternatives_considered: "Just say 'reference research' (too vague), make it optional (defeats methodology)"
    impact: "Prompt has EVIDENCE TRACEABILITY (CRITICAL) section with example good: 'Addresses top pain from Step 4 — manual data entry causes 3+ hours/day' vs bad: 'Easy to use'"
  - id: PROM-06
    decision: "Step 10 prompt emphasizes honest confidence assessment with explicit instruction: 'Be HONEST. Do NOT inflate the score to make the user feel good.'"
    rationale: "Without this AI defaults to cheerleading (9/10 scores), honest assessment is more valuable per user decision"
    alternatives_considered: "Let AI decide tone (defaults to positive), just say 'accurate' (too mild)"
    impact: "Prompt includes example honest assessment: '6/10. Research was synthetic (no real user interviews)...' vs bad: '9/10. Great work!'"
  - id: VAL-CRIT-01
    decision: "Step 8 validation criteria check for wild card creativity quality (genuinely unconventional vs slight variations)"
    rationale: "Enforces design thinking principle that wild cards should challenge assumptions, not just be 'different' normal ideas"
    alternatives_considered: "Just check wild cards exist (doesn't ensure quality), skip wild card validation (loses creative value)"
    impact: "Validation criterion: 'Do the wild cards challenge assumptions or draw from other industries (not just slight variations of normal ideas)?'"
  - id: VAL-CRIT-02
    decision: "Step 9 validation criteria check for SWOT evidence traceability and feasibility rationale specificity"
    rationale: "Prevents generic bullets and gut-feeling scores, enforces research grounding"
    alternatives_considered: "Just check SWOT exists (doesn't ensure quality), trust AI to self-assess (inconsistent)"
    impact: "Two criteria: 'Do SWOT bullets trace to prior step evidence?' and 'Do feasibility scores include specific reasoning citing prior steps?'"
  - id: VAL-CRIT-03
    decision: "Step 10 validation criteria check for confidence honesty and next steps specificity"
    rationale: "Enforces honest assessment (not cheerleading) and concrete actions (not generic advice)"
    alternatives_considered: "Check summary exists only (doesn't ensure quality), skip honesty check (allows cheerleading)"
    impact: "Two criteria: 'Is confidence score honest (not inflated)? Does rationale explain gaps?' and 'Are next steps specific to THIS concept (not generic advice)?'"
metrics:
  duration: "5 min 42 sec"
  completed_date: "2026-02-09"
  files_modified: 3
  loc_added: 429
  loc_removed: 175
  commits: 2
```

---

## Tasks Completed

### Task 1: Update Zod schemas for Steps 8-10

**Status:** Complete
**Commit:** `ce9e38a`
**Files modified:** `src/lib/schemas/step-schemas.ts`

Replaced ideationArtifactSchema, conceptArtifactSchema, and validateArtifactSchema to match user decisions from 13-CONTEXT.md:

**Step 8 ideation schema:**
- `clusters` array (3-4 themed clusters, each with 3-4 ideas including `isWildCard` boolean flag)
- `userIdeas` array (optional, user-contributed ideas from Round 2)
- `brainWrittenIdeas` array (optional, ideas evolved through 3 rounds of "Yes, and...")
- `crazyEightsIdeas` array (optional, 8 rapid-fire ideas)
- `selectedIdeas` array (1-4 titles selected for concept development, hard limit enforced)

**Step 9 concept schema:**
- `concepts` array (1-3 concepts, each with `ideaSource` tracing to Step 8)
- Each concept has `name`, `elevatorPitch`, `usp`
- `swot` object with exactly 3 bullets per quadrant (`.min(3).max(3)`)
- `feasibility` object with 1-5 numeric scores (`technical`, `business`, `userDesirability`) and separate rationale fields per dimension
- `billboardHero` object (optional) with `headline`, `subheadline`, `cta`

**Step 10 validate schema:**
- `narrativeIntro` (storytelling paragraph of journey)
- `stepSummaries` array (9-10 step summaries with stepNumber, stepName, keyOutputs 2-3 bullets)
- `confidenceAssessment` object (score 1-10, rationale string, researchQuality enum: thin/moderate/strong)
- `recommendedNextSteps` array (3-5 concrete actions)

TypeScript compilation and build passed successfully.

---

### Task 2: Enrich step prompts and validation criteria for Steps 8-10

**Status:** Complete
**Commit:** `7976688`
**Files modified:** `src/lib/ai/prompts/step-prompts.ts`, `src/lib/ai/prompts/validation-criteria.ts`

**Step 8 ideation prompt enrichment:**
- 6-round structured flow with explicit instructions per round:
  - ROUND 1: Cluster generation (3-4 clusters with 3-4 ideas each, 1-2 wild cards per cluster with unconventional examples)
  - ROUND 2: User input prompt (explicit invitation: "What ideas would YOU add?")
  - ROUND 3-5: Brain writing (3 rounds of "Yes, and..." enhancement with evolution summary)
  - ROUND 6: Crazy 8s (energetic conversational pacing: "Quick — first thought!", "That's 4 down, 4 to go!")
  - SELECTION: Hard limit enforcement (max 3-4 ideas, AI prompts if user exceeds)
- Wild card creativity guidance with industry analogy examples
- BOUNDARY instructions preventing premature evaluation
- PRIOR CONTEXT USAGE: HMW (Step 7), Persona (Step 5), Journey dip (Step 6), Pains/Gains (Step 4)

**Step 9 concept prompt enrichment:**
- Concept recommendation logic (AI suggests 1-3 based on idea diversity)
- Proactive complete concept sheet generation (AI drafts all fields, user reviews — NOT Q&A session)
- Billboard Hero exercise after concept sheet review (benefit-focused headline test)
- EVIDENCE TRACEABILITY (CRITICAL) section with good/bad examples:
  - Good: "Addresses top pain from Step 4 — manual data entry causes 3+ hours/day"
  - Bad: "Easy to use" (not connected to research)
- SWOT and feasibility guidance: 3 bullets per quadrant, 1-5 numeric with rationale per dimension
- BOUNDARY instructions preventing premature synthesis
- PRIOR CONTEXT USAGE: Selected ideas (Step 8), Persona (Step 5), Journey dip (Step 6), Research (Steps 3-4), Reframed HMW (Step 7)

**Step 10 validate prompt enrichment:**
- Dual-format synthesis structure:
  1. NARRATIVE INTRO (storytelling tone: "You started with... Through research, you discovered... The concept that emerged...")
  2. STRUCTURED STEP-BY-STEP SUMMARY (2-3 bullets per step, key outputs only — NOT data dump)
  3. CONFIDENCE ASSESSMENT (1-10 score with honest rationale, researchQuality enum)
  4. RECOMMENDED NEXT STEPS (3-5 concrete actions specific to THIS concept and gaps)
- Explicit honesty instruction: "Be HONEST. Do NOT inflate the score to make the user feel good."
- Example honest vs bad assessment:
  - Honest: "6/10. Research was synthetic (no real user interviews), but persona and concept align well. Recommend validating with 5 real user interviews."
  - Bad: "9/10. Great work!" (cheerleading)
- Note: Build Pack export is future feature
- BOUNDARY instructions: Step 10 is reflective SYNTHESIS and CLOSURE, not new ideation
- PRIOR CONTEXT USAGE: ALL steps 1-9 in narrative and structured summary

**Validation criteria enrichment:**

**Step 8 ideation (6 criteria):**
1. Cluster Quality (3-4 clusters with 3-4 ideas each, themes are different approaches)
2. Wild Card Creativity (genuinely unconventional, challenge assumptions, not slight variations)
3. Brain Writing Coherence (ideas enhanced meaningfully without feature bloat)
4. Idea Volume (15+ distinct ideas across all rounds)
5. HMW Alignment (ideas address reframed HMW from Step 7)
6. Selection Discipline (1-4 ideas selected, AI enforced hard limit)

**Step 9 concept (5 criteria):**
1. Concept Completeness (all required elements: name, pitch, USP, SWOT 3x4, feasibility 1-5 x 3, billboard)
2. SWOT Evidence (bullets trace to prior research: strengths→gains, weaknesses→pains, opportunities→research context, threats→stakeholders/challenges)
3. Feasibility Rationale (1-5 scores have specific reasoning citing prior steps, honest about uncertainty)
4. Billboard Clarity (benefit-focused headline, 6-10 words, persona would stop and pay attention)
5. Dip Solution (concept addresses journey dip from Step 6, connection explicit in pitch/USP)

**Step 10 validate (5 criteria):**
1. Narrative Quality (compelling story from vague idea to validated concept, makes user feel time well spent)
2. Step Coverage (key outputs from Steps 1-9, 2-3 bullets per step, not data dump)
3. Confidence Honesty (score not inflated, rationale explains evidence AND gaps, research quality accurate)
4. Next Steps Specificity (3-5 steps specific to THIS concept, reference specific gaps, actionable)
5. Journey Arc Coherence (clear arc: problem → research → persona/journey → reframe → ideation → concept → validation)

TypeScript compilation and build passed successfully.

---

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed without discovery of bugs, missing functionality, or blocking issues. Schemas match user decisions from 13-CONTEXT.md, prompts contain enriched domain-expert guidance following Phase 11-12 patterns, and validation criteria enforce quality checks for wild card creativity, evidence traceability, and honest assessment.

---

## Next Phase Readiness

**Phase 13 Plan 02 dependencies satisfied:**
- Step 8-10 schemas are complete and match user decisions (required for step-specific UI components)
- Schema exports are consistent (IdeationArtifact, ConceptArtifact, ValidateArtifact types available for rendering components)

**Phase 13 Plan 03 dependencies satisfied:**
- Prompts enriched with complete gathering requirements and prior context usage (ready for schema-prompt alignment verification)
- All schema fields have corresponding prompt mentions for extraction guidance

**Blockers:** None

**Concerns:** None — standard execution, no unexpected complexity

---

## Self-Check: PASSED

Verified all claims from SUMMARY.md:

**Files exist:**
```
FOUND: src/lib/schemas/step-schemas.ts
FOUND: src/lib/ai/prompts/step-prompts.ts
FOUND: src/lib/ai/prompts/validation-criteria.ts
```

**Commits exist:**
```
FOUND: ce9e38a (Task 1: feat(13-01): update Zod schemas for Steps 8-10)
FOUND: 7976688 (Task 2: feat(13-01): enrich step prompts and validation criteria for Steps 8-10)
```

**Schema fields verified:**
- Step 8: clusters (with isWildCard), userIdeas, brainWrittenIdeas, crazyEightsIdeas, selectedIdeas ✓
- Step 9: concepts array, SWOT 3x4, feasibility 1-5 numeric with rationale per dimension, billboardHero ✓
- Step 10: narrativeIntro, stepSummaries, confidenceAssessment (score/rationale/researchQuality), recommendedNextSteps ✓

**Prompt enrichment verified:**
- Step 8: IDEATION FLOW, ROUND 1-6, SELECTION, BOUNDARY ✓
- Step 9: CONCEPT SHEET GENERATION, BILLBOARD HERO EXERCISE, EVIDENCE TRACEABILITY ✓
- Step 10: NARRATIVE INTRO, STRUCTURED STEP-BY-STEP SUMMARY, CONFIDENCE ASSESSMENT, RECOMMENDED NEXT STEPS ✓

**Validation criteria count verified:**
- Step 8: 6 criteria (Cluster Quality, Wild Card Creativity, Brain Writing Coherence, Idea Volume, HMW Alignment, Selection Discipline) ✓
- Step 9: 5 criteria (Concept Completeness, SWOT Evidence, Feasibility Rationale, Billboard Clarity, Dip Solution) ✓
- Step 10: 5 criteria (Narrative Quality, Step Coverage, Confidence Honesty, Next Steps Specificity, Journey Arc Coherence) ✓

**TypeScript compilation:** PASSED (npx tsc --noEmit ran without errors) ✓

**Build:** PASSED (npm run build succeeded) ✓

All verification checks passed.

---

## Team Handoff Notes

**For Phase 13 Plan 02 (UI Components):**
- Step 8 artifact has 5 arrays (clusters required, 4 optional) — UI should handle optional arrays gracefully
- selectedIdeas is array of strings (titles) not objects — match by title when rendering selected ideas
- Wild cards marked with isWildCard boolean flag — consider visual indicator in UI
- Concepts array supports 1-3 concepts — UI should render multiple concept cards if present
- SWOT always has exactly 3 bullets per quadrant — can hardcode grid layout
- Billboard Hero is optional field — render only if present

**For Phase 13 Plan 03 (Verification):**
- All Step 8-10 prompts now have GATHERING REQUIREMENTS and PRIOR CONTEXT USAGE sections
- Validation criteria have specific checkPrompt questions (not generic quality checks)
- Steps 1-7 schemas, prompts, and validation criteria unchanged from Phase 11-12

**For future AI integration testing:**
- Step 8 ROUND 1-6 flow is sequential — AI should execute in order, not skip rounds
- Step 9 proactive drafting means AI should generate complete concept sheet upfront, not ask field-by-field questions
- Step 10 confidence assessment should NOT default to high scores (8-10) — prompt instructs honesty

---

*Phase 13 Plan 01 completed successfully on 2026-02-09 in 5 min 42 sec.*
