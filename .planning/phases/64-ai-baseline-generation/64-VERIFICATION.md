---
phase: 64-ai-baseline-generation
verified: 2026-06-11T00:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 64: AI Baseline Generation Verification Report

**Phase Goal:** Users are explicitly asked how they want to test their idea, and the AI generates a correct-archetype baseline flow scoped to their choice — with a regenerate option and graceful handling of two-sided products.
**Verified:** 2026-06-11
**Status:** passed
**Re-verification:** No — initial verification
**Human checkpoint:** Approved (all 6 manual steps passed per prompt instructions)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FlowArchetype (7 values) and TestScope types exist and are importable from src/lib/journey-flow/types | VERIFIED | types.ts line 20: `export type FlowArchetype = ...` (7 values); line 33: `export type TestScope` |
| 2 | heuristicGenerateFlow() produces a full archetype-shaped flow in journey mode and exactly 3 nodes in feature mode | VERIFIED | verify script: 74/74 assertions pass, Test 8 confirms feature scope = exactly 3 nodes + 2 edges |
| 3 | Each FlowArchetype deterministically maps to a StrategicIntent via single ARCHETYPE_TO_INTENT map | VERIFIED | types.ts line 43: `export const ARCHETYPE_TO_INTENT: Record<FlowArchetype, StrategicIntent>` — all 7 verified in Test 11 |
| 4 | Two-sided detection returns isTwoSided=true and generator emits exactly 1 annotation node | VERIFIED | verify script Test 9: PASS for marketplace+buyer+seller, exactly 1 annotation node |
| 5 | verify-journey-flow-generator.ts passes all assertions | VERIFIED | 74 passed, 0 failed — all 7 archetypes, feature mode, two-sided, enum validation |
| 6 | POST /api/build-pack/generate-journey-flow returns nodes+edges+archetype; any LLM failure falls back to heuristicGenerateFlow | VERIFIED | route.ts: LLM path lines 165–250, catch block line 257 calls heuristicGenerateFlow fallback |
| 7 | Generated state persisted under 'Journey Flow:' prefix (never 'Journey Map:') | VERIFIED | route.ts line 110, 305, 327: `like(buildPacks.title, 'Journey Flow:%')` and title prefix; no 'Journey Map:%' literal present |
| 8 | isApproved reset to false on regeneration | VERIFIED | route.ts line 288: `isApproved: false` comment "regeneration always resets approval" |
| 9 | ScopeChooser presents two explicit options with concept picker in feature mode, disabled CTA gating | VERIFIED | scope-chooser.tsx: TestScope import, aria-checked, disabled states, concept picker revealed in feature mode |
| 10 | Toolbar Regenerate button and archetype badge exist behind optional props | VERIFIED | toolbar.tsx: onRegenerate, isGenerating, archetype props; ARCHETYPE_LABELS rendered in badge |
| 11 | Annotation nodes render visually distinct (dashed border, info icon, no handles, no edit) | VERIFIED | node-card.tsx: `border-dashed bg-muted/60`, Info icon, no handles branch on isAnnotation |
| 12 | Page.tsx loads Step 9 concepts server-side and passes to content | VERIFIED | page.tsx: stepArtifacts join query, normalizes to {name, elevatorPitch}[], passes concepts prop |
| 13 | journey-flow-content.tsx wires ScopeChooser, handleGenerate with autosave timer guard, confirm-gated regenerate | VERIFIED | content.tsx: clearTimeout(saveTimerRef), isDirty:false appears 2x, AlertDialog, fetch to generate-journey-flow |
| 14 | canvas passes onRegenerate/isGenerating/archetype to JourneyFlowToolbar | VERIFIED | canvas.tsx line 463-465: all three props passed; reads flowArchetype from store |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Min Lines | Actual | Status | Key Contents |
|----------|-----------|--------|--------|--------------|
| `src/lib/journey-flow/types.ts` | — | 164 | VERIFIED | FlowArchetype, TestScope, ARCHETYPE_TO_INTENT, ARCHETYPE_LABELS, isAnnotation, 6 optional JourneyFlowState meta fields |
| `src/lib/journey-flow/generator.ts` | 150 | 874 | VERIFIED | All 7 exports: heuristicGenerateFlow, detectArchetype, detectTwoSided, extractConceptsForFlow, normalizeUiType, layoutPositions, buildAnnotationNode |
| `src/lib/ai/prompts/journey-flow-prompt.ts` | — | 309 | VERIFIED | buildJourneyFlowPrompt, JourneyFlowGenerationResult, 7-archetype definitions, two-sided rule, feature 3-node rule |
| `scripts/verify-journey-flow-generator.ts` | — | 317 | VERIFIED | 74 assertions, 0 failures; DB_CLEAN (no @/db imports) |
| `src/app/api/build-pack/generate-journey-flow/route.ts` | 150 | 346 | VERIFIED | POST handler, maxDuration=60, LLM path, heuristic fallback, two-sided floor, Journey Flow: upsert |
| `src/components/journey-flow/scope-chooser.tsx` | 80 | 235 | VERIFIED | ScopeChooser export, TestScope, aria-checked radio semantics, disabled gating |
| `src/components/journey-flow/journey-flow-toolbar.tsx` | — | 183 | VERIFIED | onRegenerate, isGenerating, archetype props; ARCHETYPE_LABELS badge |
| `src/components/journey-flow/journey-flow-node-card.tsx` | — | 144 | VERIFIED | isAnnotation branch: dashed border, info icon, no handles |
| `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/page.tsx` | — | 103 | VERIFIED | stepArtifacts query, concepts normalization, prop pass |
| `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/journey-flow-content.tsx` | — | 300 | VERIFIED | ScopeChooser integration, generate-journey-flow fetch, timer clear, isDirty:false x2, AlertDialog confirm gate |
| `src/components/journey-flow/journey-flow-canvas.tsx` | — | 493 | VERIFIED | onRegenerate/isGenerating/archetype props, flowArchetype from store, toolbar pass-through |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| generator.ts | types.ts | `from '@/lib/journey-flow/types'` (lines 15, 20) | WIRED |
| generator.ts | intent-detection.ts | `detectStrategicIntent` import (line 13), called in detectArchetype | WIRED |
| route.ts | generator.ts | `heuristicGenerateFlow` import + fallback call (line 30, 257) | WIRED |
| route.ts | journey-flow-prompt.ts | `buildJourneyFlowPrompt` import + call (line 22, 165) | WIRED |
| route.ts | build_packs table | `like(buildPacks.title, 'Journey Flow:%')` upsert (lines 110, 305, 327) | WIRED |
| scope-chooser.tsx | types.ts | `TestScope` import (line 8) | WIRED |
| node-card.tsx | types.ts | `isAnnotation` flag on JourneyFlowNode data (line 27) | WIRED |
| journey-flow-content.tsx | /api/build-pack/generate-journey-flow | `fetch('/api/build-pack/generate-journey-flow', ...)` (line 121) | WIRED |
| journey-flow-content.tsx | journey-flow store | `storeApi.setState(...)` with returned state (line 146) | WIRED |
| journey-flow-canvas.tsx | journey-flow-toolbar.tsx | `onRegenerate`, `isGenerating`, `archetype` props (lines 463-465) | WIRED |

---

### Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| GEN-01 | 64-03, 64-04 | User explicitly chooses test scope — no AI inference | SATISFIED | ScopeChooser with two radio cards, no scope preselected, CTA disabled until selection |
| GEN-02 | 64-01, 64-02 | AI generates baseline for chosen scope (journey = full; feature = 3-node mini-flow) | SATISFIED | route.ts hybrid LLM+heuristic; feature guard if screen nodes > 4 throws to fallback; verify Test 8 |
| GEN-03 | 64-01, 64-02 | AI determines archetype from 7 values, reconciled with strategicIntent as single concept | SATISFIED | ARCHETYPE_TO_INTENT is the single map; generator.detectArchetype adapts existing intent-detection |
| GEN-04 | 64-03, 64-04 | User can regenerate the baseline flow | SATISFIED | Toolbar Regenerate button, confirm AlertDialog, executeRegenerate reads stored scope |
| GEN-05 | 64-01, 64-02, 64-03 | Two-sided products: only riskier side's journey, with explanation on canvas | SATISFIED | detectTwoSided keyword heuristic; belt-and-braces floor in route.ts; annotation node renders dashed with explanation text |

No orphaned requirements — all 5 GEN IDs claimed by plans match the REQUIREMENTS.md Phase 64 table.

---

### Automated Gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | CLEAN — no output |
| `npx tsx scripts/verify-journey-flow-generator.ts` | 74 passed, 0 failed |
| No `@/db` imports in generator.ts | DB_CLEAN |
| No `@/db` imports in verify script | DB_CLEAN |
| No `Journey Map:%` write target in route.ts | CLEAN |
| Olive token compliance (no gray-/blue-/bg-white/amber-/yellow- in UI files) | TOKEN_CLEAN |

---

### Anti-Patterns Found

None blocking. All `return []` / `return null` hits are legitimate guard clauses or conditional React rendering, not stub implementations.

---

### Human Verification

Per prompt instructions, the human-verify checkpoint in plan 64-04 was approved by the user. All 6 manual steps passed:

1. Scope chooser with disabled-gating and concept picker
2. Journey generation with archetype badge and persistence across reload
3. Confirm-gated regenerate
4. Single-feature mini-flow (3 nodes)
5. Two-sided annotation on canvas
6. Read-only view (no chooser, no Regenerate)

---

### Summary

Phase 64 goal is fully achieved. All 14 must-have truths verify against actual code; 11 artifacts are substantive and correctly wired; all 5 GEN requirements are satisfied; both automated gates pass cleanly; human checkpoint was approved.

---

_Verified: 2026-06-11_
_Verifier: Claude (gsd-verifier)_
