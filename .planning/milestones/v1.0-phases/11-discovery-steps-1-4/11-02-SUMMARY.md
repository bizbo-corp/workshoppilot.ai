---
phase: 11-discovery-steps-1-4
plan: 02
subsystem: ai-facilitation
tags: [prompts, validation, design-thinking, domain-expertise, discovery]
requires:
  - 08-01-SUMMARY.md # Step prompts and validation criteria architecture
  - 08-03-SUMMARY.md # Arc-phase-aware system prompt generation
provides:
  - Domain-expert-level prompts for Steps 1-4 (altitude checking, stakeholder prompting, synthetic interviews, evidence traceability)
  - Enhanced validation criteria with quality checks specific to Discovery phase
  - Boundary instructions preventing premature synthesis across Discovery steps
affects:
  - 11-03-PLAN.md # Step artifacts and UI components depend on these enriched prompts
  - 12-PLAN.md # Definition steps (5-7) will follow similar enrichment pattern
  - 13-PLAN.md # Ideation steps (8-10) will follow similar enrichment pattern
tech-stack:
  added: []
  patterns:
    - Domain expertise embedded in prompt instructions (altitude variants, category checklists, synthetic interview flow)
    - Evidence traceability as first-class prompt requirement
    - Boundary instructions as scope-creep prevention mechanism
key-files:
  created: []
  modified:
    - src/lib/ai/prompts/step-prompts.ts # Enriched Steps 1-4 with 6 new sections (altitude checking, anti-patterns, proactive prompting, synthetic interview facilitation, evidence traceability, affinity mapping)
    - src/lib/ai/prompts/validation-criteria.ts # Added 6 new criteria across Steps 1-4
key-decisions:
  - decision: "Step 1 AI drafts 3 HMW variants at different altitudes (specific/balanced/broad) with tradeoff explanations"
    rationale: "Altitude is the most common failure mode in problem definition — users either stay too abstract or jump to specific features. Presenting 3 options with tradeoffs guides users to the Goldilocks zone."
    phase: "11"
    plan: "02"
  - decision: "Step 2 AI uses proactive prompting with domain-specific stakeholder categories (not just generic checklist)"
    rationale: "Users tend to identify obvious stakeholders (users) but miss critical categories (buyers, regulators, internal team). Domain-aware prompting (e.g., 'for healthcare: patients, providers, insurers, regulators') reduces blind spots."
    phase: "11"
    plan: "02"
  - decision: "Step 3 AI facilitates synthetic interviews by roleplaying stakeholders from Step 2"
    rationale: "Real user research is ideal but slow/expensive. Synthetic interviews let users rapidly explore stakeholder perspectives as a starting point. Disclaimer ensures users understand these are simulations, not real data."
    phase: "11"
    plan: "02"
  - decision: "Step 4 AI requires evidence traceability with source attribution for every theme, pain, and gain"
    rationale: "Prevents AI from generating generic insights ('users want simplicity'). Every claim must trace to specific Step 3 findings with stakeholder source, ensuring research-grounded synthesis."
    phase: "11"
    plan: "02"
  - decision: "All 4 Discovery steps include BOUNDARY instructions preventing premature synthesis"
    rationale: "Users and AI both tend to jump ahead (ideating in Step 1, synthesizing in Step 3). Explicit boundaries ('This step is about GATHERING, not SYNTHESIZING') keep facilitation focused on current step's goal."
    phase: "11"
    plan: "02"
  - decision: "Synthetic interview quality guidance includes 'each stakeholder should sound DIFFERENT' and 'include contradictions or mixed feelings'"
    rationale: "Without quality guidance, AI generates formulaic interviews where all stakeholders sound the same. Realistic interviews have variation, inconsistency, and messiness — this makes synthetic research more valuable."
    phase: "11"
    plan: "02"
duration: 3
completed: 2026-02-08
---

# Phase 11 Plan 02: Enrich Discovery Step Prompts Summary

**One-liner:** Domain-expert prompts with altitude checking, stakeholder probing, synthetic interviews, and evidence traceability transform AI from generic facilitator to design thinking expert.

## Performance

- **Duration:** 3 minutes
- **Tasks completed:** 2/2 (100%)
- **Files modified:** 2
- **Commits:** 2 (task commits only)

## What Was Accomplished

### Task 1: Enrich Step Prompts for Steps 1-4
**Commit:** `0929496`

Enhanced `getStepSpecificInstructions` for the 4 Discovery steps with domain-specific facilitation guidance:

**Step 1 (Challenge):**
- ALTITUDE CHECKING: Draft 3 HMW variants (specific/balanced/broad) with tradeoff explanations and recommendations
- ANTI-PATTERNS: Redirect solutions disguised as problems, narrow vision statements, probe feature requests
- BOUNDARY: "This step is about DEFINING the problem, not solving it"

**Step 2 (Stakeholder Mapping):**
- PROACTIVE PROMPTING: Check for missing categories (buyers, regulators, internal team, partners) using challenge context
- CATEGORY CHECKLIST: 6 stakeholder types with explicit gap-checking prompts
- BOUNDARY: "This step is about MAPPING stakeholders, not researching them"

**Step 3 (User Research):**
- SYNTHETIC INTERVIEW FACILITATION: 5-step process (generate questions → approval → roleplay stakeholders → capture insights → offer real data alternative)
- SYNTHETIC INTERVIEW QUALITY: Each stakeholder should sound different, include concrete details, express contradictions/mixed feelings
- DISCLAIMER: Communicate synthetic interviews are AI simulations, not replacement for real research
- BOUNDARY: "This step is about GATHERING raw observations, not synthesizing patterns"

**Step 4 (Sense-Making):**
- EVIDENCE TRACEABILITY (CRITICAL): Every theme/pain/gain must cite specific Step 3 findings with stakeholder source and quotes
- AFFINITY MAPPING PROCESS: 6-step systematic process (review all insights → group into 2-5 themes → list evidence → distinguish pains/gains → extract top 5 each → validate with user)
- CHALLENGE RELEVANCE: Connect themes back to original HMW, show how research deepened understanding
- BOUNDARY: "Focus on synthesis, not solutions or personas"

**Impact:** Prompts went from functional-but-generic to domain-expert-level facilitation. AI now actively guides users through design thinking methodology with specific techniques (altitude checking, affinity mapping) rather than just gathering information.

### Task 2: Enhance Validation Criteria for Steps 1-4
**Commit:** `6b3ba79`

Added 6 new validation criteria across the 4 Discovery steps:

**Step 1:** Added 'Altitude Check' criterion (5 total)
- Ensures HMW altitude was assessed and user saw multiple options

**Step 2:** Added 'Completeness Check' criterion (4 total)
- Verifies missing stakeholder categories were proactively explored

**Step 3:** Added 'Source Attribution' and 'Behavioral Depth' criteria (5 total)
- Source Attribution: Each insight traces to specific stakeholder/source
- Behavioral Depth: Research captures behaviors/workarounds, not just opinions

**Step 4:** Added 'Evidence Chain' and 'Challenge Relevance' criteria (5 total)
- Evidence Chain: Every pain/gain links to Step 3 findings
- Challenge Relevance: Themes connect back to Step 1 HMW

**Impact:** Validation criteria now enforce the quality standards embedded in the prompts. During the Validate arc phase, AI checks that altitude was assessed, stakeholders were complete, sources were attributed, and evidence was traced.

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Enrich step prompts for Steps 1-4 | `0929496` | src/lib/ai/prompts/step-prompts.ts |
| 2 | Enhance validation criteria for Steps 1-4 | `6b3ba79` | src/lib/ai/prompts/validation-criteria.ts |

## Files Created

None (enrichment of existing files only)

## Files Modified

1. **src/lib/ai/prompts/step-prompts.ts** (112 insertions, 6 deletions)
   - Step 1: Added 3 new sections (ALTITUDE CHECKING, ANTI-PATTERNS, BOUNDARY)
   - Step 2: Added 3 new sections (PROACTIVE PROMPTING, CATEGORY CHECKLIST, BOUNDARY)
   - Step 3: Added 4 new sections (SYNTHETIC INTERVIEW FACILITATION, QUALITY, DISCLAIMER, BOUNDARY)
   - Step 4: Added 3 new sections (EVIDENCE TRACEABILITY, AFFINITY MAPPING PROCESS, CHALLENGE RELEVANCE)

2. **src/lib/ai/prompts/validation-criteria.ts** (30 insertions)
   - Step 1: +1 criterion (Altitude Check)
   - Step 2: +1 criterion (Completeness Check)
   - Step 3: +2 criteria (Source Attribution, Behavioral Depth)
   - Step 4: +2 criteria (Evidence Chain, Challenge Relevance)

## Decisions Made

1. **Altitude checking with 3 variants**: Users struggle with problem scoping. Presenting specific/balanced/broad variants with tradeoffs guides them to appropriate altitude.

2. **Domain-aware stakeholder prompting**: Generic checklists are easy to ignore. Using challenge context to suggest domain-specific stakeholders (healthcare → insurers/regulators, B2B → IT admins/executives) reduces blind spots.

3. **Synthetic interviews as rapid exploration tool**: Real research is ideal but slow. Synthetic interviews (AI roleplaying stakeholders) provide rapid starting point with explicit disclaimer about being simulations.

4. **Evidence traceability as hard requirement**: Without source attribution, AI generates generic insights. Requiring citation of specific Step 3 findings with stakeholder source ensures research-grounded synthesis.

5. **BOUNDARY instructions at every step**: Users and AI both jump ahead (ideating in Step 1, synthesizing in Step 3). Explicit boundaries prevent scope creep and keep facilitation focused.

6. **Synthetic interview quality guidance**: Formulaic interviews aren't useful. Quality guidance (different voices, contradictions, concrete details) makes synthetic research valuable.

## Deviations from Plan

None — plan executed exactly as written.

## Known Issues / Tech Debt

None introduced.

## Next Phase Readiness

**Ready to proceed to 11-03:** Step artifacts and UI components implementation.

**Why ready:**
- Discovery step prompts (1-4) now contain domain expertise for AI facilitation
- Validation criteria enforce quality standards during Validate arc phase
- Prompts are self-contained (no circular dependencies) per Phase 8 architecture
- Build passes, TypeScript compiles

**Handoff to 11-03:**
- Step prompts now define what AI should gather and how (altitude variants, stakeholder categories, synthetic interview questions, themes/pains/gains)
- Next plan implements the Zod schemas to structure these outputs as extractable JSON artifacts
- Validation criteria will be used to verify artifact quality before step completion

**Dependencies for future phases:**
- Phase 12 (Definition Steps 5-7): Will follow similar enrichment pattern (persona traits, journey stages, reframed HMW)
- Phase 13 (Ideation Steps 8-10): Will follow similar enrichment pattern (ideation techniques, SWOT analysis, Build Pack structure)

## Self-Check: PASSED

All commits exist:
- 0929496: feat(11-02): enrich step prompts for Steps 1-4 with domain expertise
- 6b3ba79: feat(11-02): enhance validation criteria for Steps 1-4

All modified files exist and contain expected changes:
- src/lib/ai/prompts/step-prompts.ts contains "altitude", "ANTI-PATTERNS", "PROACTIVE PROMPTING", "SYNTHETIC INTERVIEW", "EVIDENCE TRACEABILITY", "AFFINITY MAPPING", and 4 "BOUNDARY" sections
- src/lib/ai/prompts/validation-criteria.ts contains "Altitude Check", "Completeness Check", "Source Attribution", "Behavioral Depth", "Evidence Chain", "Challenge Relevance"
