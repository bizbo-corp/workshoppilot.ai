---
phase: 64-ai-baseline-generation
plan: "02"
subsystem: api/build-pack
tags: [ai-generation, journey-flow, api-route, hybrid-llm, heuristic-fallback]
dependency_graph:
  requires: ["64-01"]
  provides: ["POST /api/build-pack/generate-journey-flow"]
  affects: ["src/lib/journey-flow/generator.ts", "src/lib/ai/prompts/journey-flow-prompt.ts", "build_packs table"]
tech_stack:
  added: []
  patterns: ["generateTextWithRetry + manual JSON parse", "LLM-first heuristic-fallback hybrid", "Journey Flow: prefix upsert"]
key_files:
  created:
    - src/app/api/build-pack/generate-journey-flow/route.ts
  modified: []
decisions:
  - "Feature-scope guard throws to heuristic when LLM returns >4 screen nodes — heuristic always produces exactly 3"
  - "Belt-and-braces two-sided check runs after both LLM and heuristic paths; detectTwoSided keyword heuristic is the floor regardless of LLM output"
  - "twoSidedNote from LLM overrides annotation node default purpose text when provided"
  - "Cache hit requires both nodes.length > 0 AND state.testScope === requested scope — prevents serving journey cache for feature request and vice versa"
  - "strategicIntent accepted from LLM if in the 5 valid values, else derived via ARCHETYPE_TO_INTENT — keeps backward compat with Phase 66 dispatch"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 0
---

# Phase 64 Plan 02: Generate Journey Flow API Route Summary

Hybrid POST route for baseline journey flow generation: Gemini LLM first, heuristic fallback, scope-aware cache, `'Journey Flow:'`-prefixed upsert into `build_packs`.

## What Was Built

`POST /api/build-pack/generate-journey-flow` — a single 346-line API route that is the generation entry point for both the scope chooser and the Regenerate button. It:

1. Validates `{ workshopId, scope, selectedConceptId?, force? }` — 400 on missing or invalid params; feature scope requires `selectedConceptId`.
2. Runs Clerk auth + workshop ownership check (401/403).
3. Checks cache: returns existing `'Journey Flow:%'` json row only if `nodes.length > 0` AND `state.testScope === scope` (prevents cross-scope cache hits).
4. Loads all 10 step artifacts via `loadAllWorkshopArtifacts`; 400 if concept step is missing.
5. Extracts `concepts` via `extractConceptsForFlow`, coalesces persona pains from `pains/painPoints/frustrations`.
6. **LLM path:** `buildJourneyFlowPrompt` → `generateTextWithRetry(gemini-2.5-flash-lite, temp=0.3)` → `recordUsageEvent` → strip fences → `JSON.parse`. Validates archetype (must be one of 7), clamps `strategicIntent` to 5 valid values (else derives via `ARCHETYPE_TO_INTENT`), normalizes nodes (empty-name filter, `normalizeUiType`, `layoutPositions`, priority defaults), filters edges to surviving nodes. Feature scope guard: >4 nodes throws to fallback.
7. **Heuristic fallback:** `heuristicGenerateFlow({ concepts, challengeContext, persona, scope, selectedConceptName })` — always produces valid output; already handles two-sided detection and annotation node.
8. **Belt-and-braces two-sided check:** after either path, if no annotation node present, runs `detectTwoSided(challengeContext, concepts)`; if fires, prepends `buildAnnotationNode(riskierSide)`.
9. Builds `JourneyFlowState` matching save-route content shape: `isApproved: false`, `isDirty: false`, `_schemaVersion: 1`, full optional meta fields (`flowArchetype`, `strategicIntent`, `isTwoSided`, `testScope`, `selectedConceptId`, `lastGeneratedAt`).
10. Upserts under `'Journey Flow:%'` prefix (never `'Journey Map:%'`). Responds `{ state, buildPackId, cached: false, usedLlm }`.

## Verification Results

- `npx tsc --noEmit` — clean
- ESLint — clean
- 5 occurrences of `'Journey Flow:'`, 0 occurrences of `'Journey Map:%'` — PREFIX_OK
- All required symbols present: `heuristicGenerateFlow`, `buildJourneyFlowPrompt`, `generateTextWithRetry`, `recordUsageEvent`, `maxDuration`
- `isApproved: false` confirmed in state build

## Deviations from Plan

None — plan executed exactly as written.

The entire implementation (both Task 1 skeleton and Task 2 generation) was written in a single pass and committed in commit `cd5d2bd`. Task 2's commit step found no additional changes to stage because the full implementation was included in the first write.

## Self-Check

- [x] `src/app/api/build-pack/generate-journey-flow/route.ts` — FOUND (346 lines)
- [x] Commit `cd5d2bd` — FOUND
- [x] No `'Journey Map:%'` literal — CONFIRMED
- [x] `isApproved: false` — CONFIRMED

## Self-Check: PASSED
