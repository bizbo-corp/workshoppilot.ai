---
phase: 64-ai-baseline-generation
plan: 01
subsystem: ai
tags: [gemini, journey-flow, archetypes, heuristic, typescript, pure-functions]

# Dependency graph
requires:
  - phase: 63-journey-flow-editor-core
    provides: JourneyFlowNode, JourneyFlowEdge, JourneyFlowState, save route, store

provides:
  - FlowArchetype type (7 values) and TestScope type exported from src/lib/journey-flow/types.ts
  - ARCHETYPE_TO_INTENT reconciliation map (single source of truth for archetype → strategicIntent)
  - ARCHETYPE_LABELS display map
  - isAnnotation field on JourneyFlowNode (two-sided annotation node support)
  - 6 optional Phase 64 generation metadata fields on JourneyFlowState (flowArchetype, strategicIntent, testScope, selectedConceptId, lastGeneratedAt, isTwoSided)
  - heuristicGenerateFlow() — entry point for pure-heuristic baseline generation (all 7 archetypes + feature mode)
  - detectArchetype(), detectTwoSided(), extractConceptsForFlow(), normalizeUiType(), layoutPositions(), buildAnnotationNode()
  - buildJourneyFlowPrompt() — LLM prompt covering all 7 archetypes, two-sided rule, feature 3-node rule, fenced-JSON contract
  - JourneyFlowGenerationResult parsed-result type
  - scripts/verify-journey-flow-generator.ts — 74 pure-function assertions (no DB access)

affects:
  - 64-02 (generate API route — imports heuristicGenerateFlow, buildJourneyFlowPrompt)
  - 64-03 (scope chooser UI — imports TestScope, ARCHETYPE_LABELS)
  - 64-04 (wiring — uses all contracts)
  - 66 (prototype prompt — reads flowArchetype + ARCHETYPE_TO_INTENT from JourneyFlowState)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Archetype reconciliation pattern: FlowArchetype (7 values, structural) → StrategicIntent (5 values, product category) via ARCHETYPE_TO_INTENT; no parallel taxonomy"
    - "Pure-function generator pattern: no DB, no React, no env — tsx-runnable from scripts/"
    - "Archetype detection with keyword override: loop/branching/funnel/tool keyword signals checked BEFORE intent-based defaults (more specific wins)"
    - "Two-sided annotation node: isAnnotation=true on JourneyFlowNode; no edges; positioned at y=-120 above canvas"
    - "LLM prompt convention: prompt-only file (string + types), no AI SDK imports; matches journey-mapper-prompt.ts"

key-files:
  created:
    - src/lib/journey-flow/generator.ts
    - src/lib/ai/prompts/journey-flow-prompt.ts
    - scripts/verify-journey-flow-generator.ts
  modified:
    - src/lib/journey-flow/types.ts

key-decisions:
  - "ARCHETYPE_TO_INTENT is the single reconciled concept — no parallel taxonomy; archetype is structural pattern, strategicIntent is product category derived from it"
  - "detectArchetype() uses keyword override signals BEFORE intent-based defaults — funnel requires any marketing signal (not strictly marketing-site intent score); single-screen-tool detects via direct tool keyword scan"
  - "All new JourneyFlowState fields are optional — _schemaVersion stays at 1; Phase 66 guards with ?? fallback"
  - "buildAnnotationNode() positions annotation at y=-120 (above canvas), no connecting edges, isAnnotation=true"
  - "extractConceptsForFlow() is a lean adapter of generate-journey-map extractConcepts() — drops _debug and cross-source enrichment loop"

patterns-established:
  - "Pattern: type-only StrategicIntent import in types.ts keeps file dependency-free at runtime"
  - "Pattern: verify scripts are pure-function only — never import db client or read env (.env.local = prod)"

requirements-completed: [GEN-02, GEN-03, GEN-05]

# Metrics
duration: 8min
completed: 2026-06-11
---

# Phase 64 Plan 01: AI Baseline Generation Foundation Summary

**FlowArchetype taxonomy (7 values), ARCHETYPE_TO_INTENT reconciliation map, heuristic generator with all 7 archetype shapes + feature mode, two-sided annotation node support, and LLM prompt contract — proven by 74 pure-function assertions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-11T00:56:33Z
- **Completed:** 2026-06-11T01:04:35Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Extended `JourneyFlowState` and `JourneyFlowNode` with all Phase 64 metadata contracts (additive-only, schema version unchanged)
- Built `heuristicGenerateFlow()` covering all 7 archetypes + feature scope (exactly 3 nodes) + two-sided detection with annotation node
- Created `buildJourneyFlowPrompt()` targeting the lean JourneyFlow contract with all archetype definitions, two-sided rule, and feature scope instruction
- All 74 verify-script assertions pass; zero DB imports in generator or verify script

## Task Commits

1. **Task 1: Extend Journey Flow types** — `fdea2af` (feat)
2. **Task 2: Create heuristic generator + verification script** — `6d37c95` (feat)
3. **Task 3: Write LLM generation prompt** — `eb0eea1` (feat)

## Files Created/Modified

- `src/lib/journey-flow/types.ts` — Extended with FlowArchetype, TestScope, ARCHETYPE_TO_INTENT, ARCHETYPE_LABELS, isAnnotation on JourneyFlowNode, 6 optional meta fields on JourneyFlowState
- `src/lib/journey-flow/generator.ts` — New: pure heuristic generator (7 functions/interfaces; all 7 archetypes; feature mode; two-sided; ~340 lines)
- `src/lib/ai/prompts/journey-flow-prompt.ts` — New: LLM prompt with artifact summarization, 7 archetype definitions, two-sided rule, fenced-JSON contract
- `scripts/verify-journey-flow-generator.ts` — New: 74 pure-function assertions; no DB; exits 0

## Decisions Made

- **ARCHETYPE_TO_INTENT is the single reconciled concept.** FlowArchetype (7 values) = structural pattern; StrategicIntent (5 values) = product category for Phase 66 prompt dispatch. One map, no duplication.
- **detectArchetype() keyword overrides before intent scoring.** The existing `detectStrategicIntent()` weighted scoring doesn't always reach the `marketing-site` or `tool` threshold when challenge context is light. Added direct keyword signals (FUNNEL_KEYWORDS + any marketing signal; TOOL_SECONDARY_KEYWORDS) that override the intent-based default. This is an enhancement to the existing detection logic, not a replacement.
- **All new JourneyFlowState fields are optional.** `_schemaVersion` stays at 1. Old saved states with none of these fields load cleanly. Phase 66 guards with `?? 'linear-sequence'`.
- **Annotation node has no edges.** Two-sided annotation is prepended to the nodes array with no inbound or outbound edges. The canvas renders it at y=-120 above the flow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] detectArchetype funnel/tool detection required stronger keyword signals**
- **Found during:** Task 2 (verification script Test 3 and Test 6)
- **Issue:** `detectStrategicIntent()` returned `web-app` for "landing page + sign-up + conversion" (expected `marketing-site`) and "loan calculator + convert" (expected `tool`). This caused funnel and single-screen-tool archetypes to fall through to `linear-sequence` in the detectArchetype logic.
- **Fix:** Added `MARKETING_SECONDARY_KEYWORDS` and `TOOL_SECONDARY_KEYWORDS` to detectArchetype; funnel now triggers on funnel keywords + any marketing signal (not strictly `intent === 'marketing-site'`); tool now triggers on direct keyword scan as well as intent score.
- **Files modified:** `src/lib/journey-flow/generator.ts`
- **Verification:** All 74 verify-script assertions pass after fix; Tests 3 and 6 both PASS
- **Committed in:** `6d37c95` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Necessary for correctness — without this fix, funnel and single-screen-tool would never be generated. No scope creep.

## Issues Encountered

None beyond the auto-fixed detection logic deviation above.

## Next Phase Readiness

- Plan 64-02 (generate API route) can import `heuristicGenerateFlow`, `buildJourneyFlowPrompt`, and all types directly
- Plan 64-03 (scope chooser UI) can import `TestScope`, `FlowArchetype`, `ARCHETYPE_LABELS`
- Plan 64-04 (wiring) has everything it needs
- Phase 66 (prototype prompt) can read `flowArchetype` from `JourneyFlowState` and dispatch via `ARCHETYPE_TO_INTENT`

---
*Phase: 64-ai-baseline-generation*
*Completed: 2026-06-11*
