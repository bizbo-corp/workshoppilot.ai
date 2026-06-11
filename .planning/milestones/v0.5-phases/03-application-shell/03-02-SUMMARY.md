---
phase: 03-application-shell
plan: 02
subsystem: database
tags: [drizzle, seed-data, step-definitions, middleware, clerk]

# Dependency graph
requires:
  - phase: 01-foundation-database
    provides: Database schema with step_definitions table
  - phase: 02-authentication-roles
    provides: Clerk middleware with route protection patterns
provides:
  - Corrected database step_definitions with WorkshopPilot's 10 steps
  - Step metadata module as single source of truth for step information
  - Workshop route protection (steps 1-3 public, 4-10 protected)
affects: [04-workshop-shell, 05-step-pages, sidebar, mobile-stepper]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hardcoded step metadata pattern (not DB-fetched per user decision)"
    - "Step ID alignment between database, metadata, and routing"

key-files:
  created:
    - src/lib/workshop/step-metadata.ts
  modified:
    - scripts/seed-steps.ts
    - src/middleware.ts

key-decisions:
  - "Step metadata is hardcoded (not fetched from DB) for performance and simplicity"
  - "Step IDs must align exactly between seed script, metadata module, and database foreign keys"
  - "Workshop route protection: steps 1-3 public, 4-10 protected (LOCKED user decision)"

patterns-established:
  - "STEPS array export with StepDefinition interface for type-safe step metadata"
  - "Helper functions: getStepByOrder, getStepBySlug, getStepById for flexible lookup"
  - "Cleanup step in seed script deletes old definitions before re-seeding (development safety)"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 03 Plan 02: Step Definitions & Metadata Summary

**Corrected database with 10 WorkshopPilot steps (challenge → validate), hardcoded metadata module, and workshop route protection middleware**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T18:43:19Z
- **Completed:** 2026-02-07T18:46:39Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Database re-seeded with correct 10 WorkshopPilot step definitions (challenge, stakeholder-mapping, user-research, sense-making, persona, journey-mapping, reframe, ideation, concept, validate)
- Created step metadata module with complete step information for all 10 steps (names, descriptions, greetings, mock outputs)
- Updated middleware to protect workshop routes per Phase 2 handoff (steps 1-3 public, 4-10 protected)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix seed script with correct WorkshopPilot step definitions** - `2fa1b40` (fix)
2. **Task 2: Create step metadata module with correct WorkshopPilot steps** - `fbdcc47` (feat)
3. **Task 3: Update middleware for workshop route protection** - `900fff1` (feat)

## Files Created/Modified
- `scripts/seed-steps.ts` - Replaced generic design thinking steps with WorkshopPilot's actual 10 steps, added cleanup before seeding
- `src/lib/workshop/step-metadata.ts` - Hardcoded step data with StepDefinition interface, STEPS array, lookup functions (getStepByOrder, getStepBySlug, getStepById)
- `src/middleware.ts` - Added workshop step routes to public (1-3) and protected (4-10) matchers, removed Phase 2 handoff comment

## Decisions Made

**1. Hardcoded step metadata (not DB-fetched)**
- **Context:** User decision from earlier planning - step metadata is static reference data
- **Rationale:** No runtime DB query needed, faster page loads, simpler code
- **Implementation:** All 10 steps with full metadata in src/lib/workshop/step-metadata.ts

**2. Step ID alignment is critical**
- **Context:** workshop_steps table has foreign key to step_definitions.id
- **Rationale:** Misaligned IDs cause foreign key constraint failures
- **Implementation:** Same IDs in seed script (database), metadata module (hardcoded), and all consumers

**3. Delete-then-insert seed pattern**
- **Context:** Original seed script had wrong step IDs (empathize, define, ideate...)
- **Rationale:** onConflictDoUpdate doesn't handle ID changes, old IDs would remain
- **Implementation:** Added `db.delete(stepDefinitions)` before seeding (cascade deletes workshop_steps)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Environment variable loading in seed script**
- **Issue:** Initial seed run failed with "DATABASE_URL environment variable is not set"
- **Cause:** tsx doesn't auto-load .env.local
- **Resolution:** Used dotenv-cli wrapper: `npx dotenv-cli -e .env.local -- npx tsx scripts/seed-steps.ts`
- **Impact:** None - standard pattern already established in project

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 3 workshop shell implementation:**
- Step metadata module exports STEPS for sidebar, mobile stepper, step pages
- Database contains correct 10 step definitions for workshop_steps foreign keys
- Middleware route protection configured for workshop routes (steps 1-3 public, 4-10 protected)

**Verified alignment:**
- All step IDs match between seed script and metadata module
- Build passes with no TypeScript errors
- Step metadata lookups work correctly (tested all helper functions)

**No blockers.** Phase 3 can proceed with workshop UI implementation.

---
*Phase: 03-application-shell*
*Completed: 2026-02-07*

## Self-Check: PASSED

All files and commits verified.
