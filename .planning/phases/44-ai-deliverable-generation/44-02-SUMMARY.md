---
phase: 44-ai-deliverable-generation
plan: "02"
subsystem: ui

tags: [react, deliverables, generation, toast, loading-state, build-pack]

requires:
  - phase: 44-01
    provides: POST /api/build-pack/generate-prd (type='full-prd') and POST /api/build-pack/generate-tech-specs API routes

provides:
  - Fully interactive PRD and Tech Specs deliverable cards wired to generation APIs
  - Loading spinner state during Gemini generation (prdStatus/techSpecsStatus: idle|loading|done|error)
  - Success state with 'View on Outputs Page' label after generation completes
  - Error state with 'Retry Generation' label on failure + toast notification
  - Generation handlers in step-container.tsx (handleGenerateFullPrd, handleGenerateTechSpecs)
  - Generation handlers in results-content.tsx for both synthesis view paths

affects:
  - 45 (Outputs page — 'View on Outputs Page' button will navigate here)
  - build_packs table (generation writes rows, cards reflect done state)

tech-stack:
  added: []
  patterns:
    - "Generation status state machine: idle → loading → done|error, local to each deliverable section component"
    - "Props-down generation pattern: parent provides async handlers, child manages status transitions"
    - "Toast-on-throw: handlers toast.error before re-throwing so caller can set error state"

key-files:
  created: []
  modified:
    - src/components/workshop/synthesis-summary-view.tsx
    - src/components/workshop/step-container.tsx
    - src/app/workshop/[sessionId]/results/results-content.tsx

key-decisions:
  - "Generation state (prdStatus/techSpecsStatus) kept local in each component — no global state needed since generation is per-session"
  - "Retry logic: error state shows 'Retry Generation' button; clicking re-runs the same handler and resets status"
  - "View on Outputs Page label is disabled until Phase 45 adds the navigation route — consistent with plan decision"
  - "handlers throw after toast.error so component can set error status without duplicating toast calls"

patterns-established:
  - "Async generation prop pattern: parent passes () => Promise<void>, child wraps in try/catch + status state"

requirements-completed: [GEN-01, GEN-02, GEN-03, GEN-04]

duration: 2min
completed: 2026-02-25
---

# Phase 44 Plan 02: UI Wiring for Deliverable Generation Summary

**PRD and Tech Specs deliverable cards wired to generation APIs with idle/loading/done/error state machine and toast feedback**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T07:37:47Z
- **Completed:** 2026-02-25T07:39:50Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Added generation state (prdStatus/techSpecsStatus) and handlers to both SynthesisSummaryView and SynthesisBuildPackSection
- Added handleGenerateFullPrd and handleGenerateTechSpecs in step-container.tsx using fetch + sonner toasts
- Wired generation callbacks and added matching handlers in results-content.tsx (both synthesis view paths covered)
- Removed all 'Coming in Phase 44' placeholder labels — replaced with dynamic state-driven labels
- Cards now show: 'Generate PRD'/'Generate Tech Specs' → loading spinner → 'View on Outputs Page' (or 'Retry Generation' on error)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire deliverable cards to generation APIs with loading and success states** - `7364b0a` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/components/workshop/synthesis-summary-view.tsx` - Added GenerationStatus type, prdStatus/techSpecsStatus state, generation handlers, and dynamic card labels to both SynthesisSummaryView and SynthesisBuildPackSection
- `src/components/workshop/step-container.tsx` - Added handleGenerateFullPrd and handleGenerateTechSpecs callbacks; passed to SynthesisBuildPackSection
- `src/app/workshop/[sessionId]/results/results-content.tsx` - Added generation handlers using fetch; passed to SynthesisSummaryView and SynthesisBuildPackSection

## Decisions Made

- Generation state kept local to each component — no global state needed since generation is per-session and short-lived
- `disabled={!workshopCompleted || isDone}` — disables button after success to prevent duplicate generation (Phase 45 will add navigation)
- Error state shows 'Retry Generation' and re-enables the button so user can retry without a page refresh
- Handlers toast.error before re-throwing so status transitions (done/error) happen in the component, not the handler

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript passed on first attempt, build succeeded immediately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Deliverable generation is fully end-to-end: click → API → Gemini → build_packs DB → success state
- Phase 45 (Outputs page) can add the navigation route and flip the 'View on Outputs Page' button from disabled to functional
- Both Step 10 view (SynthesisBuildPackSection) and Results page (SynthesisSummaryView + SynthesisBuildPackSection fallback) support generation

## Self-Check: PASSED

- FOUND: src/components/workshop/synthesis-summary-view.tsx
- FOUND: src/components/workshop/step-container.tsx
- FOUND: src/app/workshop/[sessionId]/results/results-content.tsx
- FOUND: 44-02-SUMMARY.md
- FOUND commit 7364b0a

---
*Phase: 44-ai-deliverable-generation*
*Completed: 2026-02-25*
