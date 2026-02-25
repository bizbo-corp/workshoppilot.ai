---
phase: 43-workshop-completion
plan: "01"
subsystem: api
tags: [drizzle, postgres, server-actions, next-api-routes, workshops]

requires:
  - phase: any prior phase with workshops table
    provides: workshops table with status enum including 'completed'
  - phase: any prior phase with workshopSteps table
    provides: workshopSteps table with completedAt column
provides:
  - completeWorkshop server action (src/actions/workshop-actions.ts)
  - POST /api/workshops/[workshopId]/complete REST endpoint
affects:
  - 43-02 (Build Pack generation will call completeWorkshop or this endpoint as prerequisite)
  - 44 (deliverable generation phase reads workshop status='completed' as trigger)

tech-stack:
  added: []
  patterns:
    - "idempotent server action: check current state before updating, return success if already in target state"
    - "ownership defense in depth: WHERE clause includes both id AND clerkUserId"
    - "API route maps error message strings to HTTP status codes without leaking internals"

key-files:
  created:
    - src/app/api/workshops/[workshopId]/complete/route.ts
  modified:
    - src/actions/workshop-actions.ts

key-decisions:
  - "completeWorkshop checks steps.length >= 10 AND all completedAt non-null to prevent partial-step edge cases"
  - "Auth errors return 401, incomplete-steps returns 400, unexpected errors return 500 — distinct codes for clean client handling"
  - "No redirect() in completeWorkshop — calling component owns post-completion UI state"

patterns-established:
  - "Workshop completion gate: query all 10 workshopSteps, reject if any completedAt is null"
  - "Idempotency check before DB write: early return { success: true } if status already 'completed'"

requirements-completed:
  - COMP-03

duration: 1min
completed: 2026-02-25
---

# Phase 43 Plan 01: Workshop Completion Summary

**Server action and REST endpoint that set workshops.status='completed' after verifying all 10 steps are done, with auth, ownership, and idempotency guards**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-25T06:57:21Z
- **Completed:** 2026-02-25T07:02:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `completeWorkshop` server action with auth check, ownership verification, all-steps-complete gate, idempotency guard, and dual revalidatePath calls
- Created `POST /api/workshops/[workshopId]/complete` REST endpoint following Next.js 16 async params pattern
- Established idempotency and ownership-defense patterns reusable by Phase 44 deliverable generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add completeWorkshop server action** - `28ff6e6` (feat)
2. **Task 2: Add POST /api/workshops/[workshopId]/complete endpoint** - `b6c4cd0` (feat)

## Files Created/Modified

- `src/actions/workshop-actions.ts` - Added `completeWorkshop` exported server action (64 lines inserted)
- `src/app/api/workshops/[workshopId]/complete/route.ts` - New POST handler delegating to `completeWorkshop`

## Decisions Made

- Checked `steps.length < 10` in addition to `completedAt` null-check — guards against workshops that somehow lack all 10 step records
- API route maps specific error message strings to correct HTTP status codes (401 for auth/ownership, 400 for incomplete steps, 500 for unexpected) so callers get clean status codes without internal error details leaking
- No `redirect()` in the server action — callers (components or API clients) handle navigation after completion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `completeWorkshop(workshopId, sessionId)` is ready to be called from the Step 10 UI (Plan 43-02)
- Workshop status `'completed'` is now the database trigger Phase 44 will use to gate deliverable generation
- No blockers

---
*Phase: 43-workshop-completion*
*Completed: 2026-02-25*

## Self-Check: PASSED

- FOUND: src/actions/workshop-actions.ts
- FOUND: src/app/api/workshops/[workshopId]/complete/route.ts
- FOUND: .planning/phases/43-workshop-completion/43-01-SUMMARY.md
- FOUND commit: 28ff6e6 (Task 1)
- FOUND commit: b6c4cd0 (Task 2)
