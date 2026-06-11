---
phase: 66-low-fi-prototype-prompt
plan: "01"
subsystem: prototype-prompt-pipeline
tags: [journey-flow, prototype, prompt-building, gemini, build-packs, api-route]
dependency_graph:
  requires:
    - Phase 63 Journey Flow editor (JourneyFlowNode/Edge/State types)
    - Phase 64 AI baseline generation (testScope, selectedConceptId, isAnnotation fields)
    - Phase 65 validation guidance wiring (placeholder /outputs/prototype-prompt page)
    - src/lib/validation/llm-context.ts (loadValidationBrief)
    - src/lib/ai/gemini-retry.ts (generateTextWithRetry)
    - src/db/schema/build-packs.ts (upsert target)
  provides:
    - POST /api/build-pack/generate-prototype-prompt
    - src/lib/journey-flow/prompt-builder.ts (PROMPT-04 shared module)
    - src/lib/ai/prompts/low-fi-prototype-prompt.ts (low-fi prompt template)
  affects:
    - Plan 66-02 (UI card that calls this route)
    - Future hi-fi path (imports same prompt-builder module)
tech_stack:
  added:
    - src/lib/journey-flow/prompt-builder.ts (new pure-functions module)
    - src/lib/ai/prompts/low-fi-prototype-prompt.ts (new prompt file)
    - src/app/api/build-pack/generate-prototype-prompt/route.ts (new API route)
  patterns:
    - PROMPT-04 shared boundary: fidelity-agnostic pure functions; hi-fi adds preamble without touching this module
    - Gemini-with-deterministic-fallback pattern (same as generate-journey-flow)
    - StoredPrototypePrompt JSON shape with generatedFromFlowUpdatedAt for staleness detection
key_files:
  created:
    - src/lib/journey-flow/prompt-builder.ts
    - src/lib/ai/prompts/low-fi-prototype-prompt.ts
    - src/app/api/build-pack/generate-prototype-prompt/route.ts
  modified: []
decisions:
  - "Plain db client (not dbWithRetry) in route — fast-path write convention (same as save-journey-flow)"
  - "body variable renamed body2 in route to avoid shadowing req.json() assignment"
  - "Annotation node IDs built into Set before nav filtering — single-pass O(n) approach"
  - "buildFallbackBody uses first 8 non-empty brief lines — keeps fallback concise without truncating mid-sentence on guaranteed blank-line-separated sections"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-06-11"
  tasks_completed: 3
  files_created: 3
  files_modified: 0
---

# Phase 66 Plan 01: Low-Fi Prototype Prompt Server Side Summary

**One-liner:** Gemini-backed API route that parses Journey Flow node data into a wireframe-enforced prototype prompt with annotation exclusion, feature-scope scoping, and build_packs persistence for staleness detection.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create shared journey-understanding module | 38434b1 | src/lib/journey-flow/prompt-builder.ts |
| 2 | Create low-fi prompt file | f0561e6 | src/lib/ai/prompts/low-fi-prototype-prompt.ts |
| 3 | Create POST /api/build-pack/generate-prototype-prompt route | 3f5453f | src/app/api/build-pack/generate-prototype-prompt/route.ts |

## What Was Built

### Task 1 — Shared Journey-Understanding Module (PROMPT-04)

`src/lib/journey-flow/prompt-builder.ts` is the fidelity-agnostic pure-functions boundary both the low-fi path and the future hi-fi path consume. No DB, no React, no AI SDK.

- `parseScreensFromFlow`: filters annotation nodes from screens and from nav links (uses a Set of annotation IDs, filters edges touching them)
- `buildScreenDescriptions`: deterministic text block per screen (name, UI type label, purpose, key elements, addressesPain)
- `buildNavigationSection`: heading-free `- From → To` lines; callers add their own heading

### Task 2 — Low-Fi Prompt File

`src/lib/ai/prompts/low-fi-prototype-prompt.ts` contains everything fidelity-specific:

- `buildLowFiPreamble()`: the mandatory 7-rule wireframe hard-rules preamble (PROMPT-02 locked decision)
- `buildLowFiGeminiPrompt()`: meta-prompt sent to Gemini; instructs it to write WHAT THIS PROTOTYPE TESTS / SCREENS TO BUILD / NAVIGATION sections; when `testScope === 'feature'`, injects the single-feature scope instruction (PROMPT-05)
- `assembleLowFiPrompt()`: composes final prompt as preamble + optional scope line + Gemini body; preamble is always prepended deterministically
- `buildFallbackBody()`: deterministic body from raw flow data used when Gemini fails
- `StoredPrototypePrompt` interface: JSON shape for build_packs with `generatedFromFlowUpdatedAt` for staleness detection

### Task 3 — API Route

`POST /api/build-pack/generate-prototype-prompt`:

1. Auth + ownership (Clerk; 401/403 guards; owner-only)
2. Loads Journey Flow `json` row; 400 if missing or all-annotation nodes
3. `parseScreensFromFlow` excludes annotation nodes before prompt building
4. `loadValidationBrief` for grounded workshop context
5. Gemini generation (gemini-2.5-flash-lite, temp 0.4) → deterministic fallback on error/short output
6. `assembleLowFiPrompt` always prepends the wireframe preamble
7. Upserts `Prototype Prompt:${workshopTitle}` JSON row with `StoredPrototypePrompt` content
8. Returns `{ promptText, buildPackId, generatedFromFlowUpdatedAt, testScope, selectedConceptId, usedLlm }`

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

- [x] PROMPT-04: Shared module exists with fidelity-agnostic pure functions the hi-fi path can import unchanged
- [x] PROMPT-02: API route produces a self-contained plain-text prompt starting with the wireframe preamble, lists only real screen nodes (annotation nodes excluded), derives navigation from edges, persists with `generatedFromFlowUpdatedAt` staleness metadata
- [x] PROMPT-05 (server half): Feature-scope flows produce a prompt with explicit mini-flow scope statement

## Self-Check: PASSED

All 3 files created and present on disk. All 3 task commits found in git log.
