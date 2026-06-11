---
phase: 63-journey-flow-editor-core
plan: 01
subsystem: api, database, ui
tags: [zustand, react, nextjs, drizzle, neon, journey-flow, build-packs]

# Dependency graph
requires: []
provides:
  - JourneyFlowNode/Edge/State types and display maps (src/lib/journey-flow/types.ts)
  - createJourneyFlowStore vanilla Zustand factory with 10 actions + dirty tracking
  - JourneyFlowStoreProvider + useJourneyFlowStore/useJourneyFlowStoreApi hooks
  - POST /api/build-pack/save-journey-flow upsert endpoint
affects:
  - 63-02 (canvas shell + ReactFlow wiring)
  - 63-03 (node editing, autosave hook)
  - 64 (AI baseline generation reads JourneyFlowState shape)
  - 65 (validation guidance wiring depends on isApproved)
  - 66 (prototype prompt reads journey flow nodes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Journey Flow store follows vanilla Zustand factory pattern (same as feature-prioritization-store)"
    - "Provider uses useRef singleton pattern to avoid re-creation on re-render"
    - "Save route uses Response.json() style (not NextResponse) matching newer save routes"
    - "Build-pack title prefix 'Journey Flow:' kept distinct from 'Journey Map:' (park-don't-delete contract)"

key-files:
  created:
    - src/lib/journey-flow/types.ts
    - src/stores/journey-flow-store.ts
    - src/providers/journey-flow-store-provider.tsx
    - src/app/api/build-pack/save-journey-flow/route.ts
  modified: []

key-decisions:
  - "Title prefix 'Journey Flow:' used — never 'Journey Map:' — to avoid clobbering old mapper's persisted state"
  - "deleteNode cascades edge removal to prevent orphan edges that break ReactFlow rendering"
  - "Empty state (0 nodes) rejected at save route — matches feature-prioritization pattern"
  - "Workshop title fetched in ownership query (select includes title column) for build-pack insert title"
  - "Plain db client used (not dbWithRetry) — matching both existing save routes per 63-RESEARCH.md OQ-3"

patterns-established:
  - "Journey Flow store: all mutations except setState/markDirty/markClean set isDirty true"
  - "Save route: auth → ownership → empty-guard → upsert → return buildPackId"

requirements-completed: [FLOW-02, FLOW-06]

# Metrics
duration: 2min
completed: 2026-06-10
---

# Phase 63 Plan 01: Journey Flow Data Foundation Summary

**Lean type contracts, vanilla Zustand store with cascade-delete edge safety, and upsert save route under 'Journey Flow:' prefix — the foundation every Phase 63 plan builds against.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-10T22:49:21Z
- **Completed:** 2026-06-10T22:51:44Z
- **Tasks:** 3
- **Files modified:** 4 (all new)

## Accomplishments
- Dependency-free types file with JourneyFlowNode/Edge/State, UiType + Priority unions, label maps, and DEFAULT_JOURNEY_FLOW_STATE
- Zustand store factory with 10 actions; deleteNode cascades edge removal preventing orphan-edge ReactFlow breakage
- Context provider + hooks (useJourneyFlowStore/useJourneyFlowStoreApi) matching feature-prioritization pattern exactly
- Save API route that upserts one `Journey Flow:%` JSON row per workshop and never writes empty state

## Task Commits

Each task was committed atomically:

1. **Task 1: Define Journey Flow types** - `e9bb0eb` (feat)
2. **Task 2: Create Zustand store and context provider** - `b938e8d` (feat)
3. **Task 3: Create save-journey-flow API route** - `d56e030` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/lib/journey-flow/types.ts` - JourneyFlowNode/Edge/State, UiType/Priority unions, label maps, DEFAULT constant
- `src/stores/journey-flow-store.ts` - createJourneyFlowStore vanilla factory, 10 actions, dirty tracking, cascade deleteNode
- `src/providers/journey-flow-store-provider.tsx` - JourneyFlowStoreProvider + useJourneyFlowStore + useJourneyFlowStoreApi
- `src/app/api/build-pack/save-journey-flow/route.ts` - POST upsert, auth+ownership, empty guard, 'Journey Flow:' prefix

## Decisions Made
- Kept 'Journey Flow:' title prefix distinct from 'Journey Map:' — the old mapper is parked not deleted; overwriting its build-pack row would be a silent data loss.
- deleteNode filters edges by sourceNodeId AND targetNodeId — this was identified in the plan brief as a known bug in the old mapper that must not be repeated.
- Workshop title fetched alongside ownership check in a single query (added `title` to select) rather than a second round-trip.
- Plain `db` client (not `dbWithRetry`) — consistent with both other save routes; fast-path writes on the established exception.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 contracts (types, store, provider, save route) are ready for Phase 63 Plan 02 (canvas shell + ReactFlow wiring) and Plan 03 (autosave hook wiring).
- No blockers.

---
*Phase: 63-journey-flow-editor-core*
*Completed: 2026-06-10*
