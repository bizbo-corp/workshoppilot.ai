---
phase: 10-navigation-persistence
plan: 02
subsystem: navigation
tags: [back-navigation, cascade-invalidation, revision, needs_regeneration, amber-indicators, view-mode]

# Dependency graph
requires:
  - phase: 10-navigation-persistence
    plan: 01
    provides: needs_regeneration status in schema, auto-save for message persistence
  - phase: 09-structured-outputs
    provides: Structured artifacts stored in step_artifacts table
  - phase: 07-context-architecture
    provides: step_artifacts table with workshopStepId unique constraint
provides:
  - Cascade invalidation service that marks downstream steps as needs_regeneration
  - Back-navigation to completed steps with artifact viewing (view-only by default)
  - Explicit revision flow with "Revise This Step" button
  - Amber visual indicators in sidebar and mobile stepper for affected steps
  - Workshop resume capability (NAV-04) via existing dashboard links
affects: [11-discovery-steps, 12-definition-steps, 13-ideation-validation]

# Tech tracking
tech-stack:
  added: []
  patterns: [cascade-invalidation, view-mode-navigation, explicit-revision-trigger]

key-files:
  created: [src/lib/navigation/cascade-invalidation.ts]
  modified: [src/actions/workshop-actions.ts, src/app/workshop/[sessionId]/layout.tsx, src/app/workshop/[sessionId]/step/[stepId]/page.tsx, src/components/layout/workshop-sidebar.tsx, src/components/layout/mobile-stepper.tsx, src/components/workshop/step-container.tsx, src/components/workshop/step-navigation.tsx]

key-decisions:
  - "Back-navigation to completed steps is VIEW ONLY by default - prevents accidental invalidation"
  - "Only clicking Revise This Step triggers cascade invalidation (explicit user action required)"
  - "Revised step resets to in_progress with arcPhase: orient (user re-enters editing mode)"
  - "Downstream steps marked needs_regeneration preserve artifacts as starting points"
  - "Amber visual indicators (border-amber-500) distinguish needs_regeneration from other statuses"
  - "needs_regeneration steps are navigable (accessible like completed steps for viewing/reworking)"
  - "Complete steps show confirmed artifact, needs_regeneration shows artifact but unconfirmed"

patterns-established:
  - "Cascade invalidation loops through downstream steps updating status individually"
  - "Server actions use revalidatePath to refresh layout after status changes"
  - "View-only mode for completed steps (Revise button replaces Next button)"
  - "router.refresh() pattern after mutation to reload page with updated status"

# Metrics
duration: 4.8min
completed: 2026-02-08
---

# Phase 10 Plan 02: Back-Navigation & Cascade Invalidation Summary

**Back-navigation with view-only artifact display, explicit revision triggering cascade invalidation, and amber needs_regeneration indicators throughout UI**

## Performance

- **Duration:** 4.8 min
- **Started:** 2026-02-08T06:32:40Z
- **Completed:** 2026-02-08T06:37:30Z
- **Tasks:** 2
- **Files modified:** 7
- **Files created:** 1

## Accomplishments

- Created cascade invalidation service that resets revised step and marks downstream steps as needs_regeneration
- Added reviseStep server action with revalidatePath to refresh sidebar/layout
- Updated sidebar and mobile stepper to display amber indicators for needs_regeneration steps
- Implemented back-navigation to completed steps with artifact viewing (no automatic invalidation)
- Added "Revise This Step" button (amber variant with AlertTriangle icon) shown only on completed steps
- Step page queries and passes existing artifacts to StepContainer for completed/needs_regeneration steps
- StepContainer pre-populates artifact state and confirmation based on step status
- Workshop resume works via existing dashboard links (no additional changes needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cascade invalidation service and update sidebar** - `7c8a09b` (feat)
2. **Task 2: Enable back-navigation with artifact viewing and revision** - `e46bc00` (feat)

## Files Created/Modified

**Created:**
- `src/lib/navigation/cascade-invalidation.ts` - Cascade invalidation service with invalidateDownstreamSteps function

**Modified:**
- `src/actions/workshop-actions.ts` - Added reviseStep server action
- `src/app/workshop/[sessionId]/layout.tsx` - Updated status type to include needs_regeneration
- `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` - Query existing artifacts, pass to StepContainer
- `src/components/layout/workshop-sidebar.tsx` - Amber indicator styling for needs_regeneration steps
- `src/components/layout/mobile-stepper.tsx` - Amber indicator styling for needs_regeneration steps
- `src/components/workshop/step-container.tsx` - Pre-populate artifact state, handleRevise callback
- `src/components/workshop/step-navigation.tsx` - Show "Revise This Step" button for completed steps

## Decisions Made

**View-only back-navigation:** Clicking a completed step in the sidebar loads it with artifact visible and chat history, but does NOT trigger cascade invalidation. This prevents accidental invalidation when users just want to review earlier work (addressing Pitfall 6 from research).

**Explicit revision trigger:** Only clicking the "Revise This Step" button triggers cascade invalidation. This button is shown ONLY on completed steps, replacing the Next button. The explicit action ensures users understand they're about to invalidate downstream work.

**Revised step reset behavior:** When a step is revised, it resets to `in_progress` status with `arcPhase: 'orient'` and `completedAt: null`. This puts the user back into active editing mode for that step, and re-entering the step will re-orient them via the AI system prompt.

**Preserve artifacts during invalidation:** Cascade invalidation does NOT delete artifacts or summaries from needs_regeneration steps. These serve as starting points for regeneration, allowing users to see what was previously generated and adjust accordingly.

**Amber visual language:** needs_regeneration steps use amber/warning colors (border-amber-500, text-amber-600) to distinguish them from other statuses. This creates a clear visual hierarchy: green (complete), blue (in_progress), amber (needs_regeneration), gray (not_started).

**Navigability of needs_regeneration:** Steps with needs_regeneration status are navigable (isAccessible check excludes only not_started). Users can click them to view what needs updating and rework them.

**Artifact confirmation state:** Complete steps show artifact with `artifactConfirmed: true` (already confirmed when step was completed). needs_regeneration steps show artifact with `artifactConfirmed: false` (needs re-confirmation after revision).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript path escaping (resolved):** Git commands failed on paths with brackets like `src/app/workshop/[sessionId]/layout.tsx`. Fixed by quoting paths in git add commands.

## User Setup Required

None - no external service configuration or manual steps required.

## Next Phase Readiness

**Ready for Phase 11 (Discovery Steps 1-4):**
- Navigation infrastructure complete (forward, back, revision, cascade)
- Auto-save ensures data persistence before navigation
- Cascade invalidation marks affected steps clearly
- Users can freely navigate completed steps without breaking downstream work
- Explicit revision flow prevents accidental data loss

**Ready for Phase 12-13 (Definition & Ideation/Validation Steps):**
- All 10 steps will benefit from revision + cascade invalidation
- Pattern established: view-only by default, explicit action to revise
- Amber indicators provide clear visual feedback

**NAV requirements satisfied:**
- NAV-01 (Back-navigation): Users can click completed steps and view artifacts ✓
- NAV-02 (Cascade invalidation): Revising step X marks steps X+1 through 10 as needs_regeneration ✓
- NAV-04 (Resume workshop): Dashboard links to last active step, messages load from DB ✓ (no changes needed - already working from Phase 4 + Phase 10 Plan 1)

**No blockers identified.**

## Self-Check: PASSED

All created files verified:
- src/lib/navigation/cascade-invalidation.ts ✓

All task commits verified:
- 7c8a09b ✓
- e46bc00 ✓

---
*Phase: 10-navigation-persistence*
*Completed: 2026-02-08*
