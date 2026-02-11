---
phase: 21-grid-foundation-coordinate-system
plan: 01
subsystem: canvas
tags: [reactflow, grid, coordinate-system, journey-mapping, swimlane]

# Dependency graph
requires:
  - phase: 20-canvas-coordinates-and-layout
    provides: ReactFlow canvas foundation, quadrant detection system
provides:
  - Grid coordinate system types (GridConfig, CellCoordinate, CellBounds)
  - Pure coordinate transform functions (getCellBounds, positionToCell, snapToCell, getGridDimensions)
  - Step 6 journey-mapping grid configuration with 7 swimlane rows
  - PostIt cellAssignment metadata field for grid positioning
affects: [22-grid-overlay-rendering, 23-grid-interaction, 24-step-2-4-canvas-retrofit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure coordinate functions with no React/Zustand coupling for testability
    - Cell padding (10px) prevents nodes from touching cell borders
    - Semantic row/column IDs (not array indices) for reordering resilience

key-files:
  created:
    - src/lib/canvas/grid-layout.ts
  modified:
    - src/lib/canvas/step-canvas-config.ts
    - src/stores/canvas-store.ts

key-decisions:
  - "Use semantic IDs (strings) for rows/columns instead of array indices to survive reordering"
  - "Custom snap logic required due to ReactFlow snapGrid multi-select bug (issue #1579)"
  - "Position is source of truth, cellAssignment is derived metadata"
  - "140px x-origin for row labels to fit 'Moments of Truth' without truncation"
  - "5 default columns for Step 6 journey mapping (awareness → onboarding)"

patterns-established:
  - "Grid coordinate functions are pure (no side effects, easily testable)"
  - "GridConfig defines origin point, allowing flexible grid placement on canvas"
  - "cellPadding in config prevents hard-coded spacing magic numbers"

# Metrics
duration: 15min
completed: 2026-02-11
---

# Phase 21 Plan 01: Grid Foundation Coordinate System Summary

**Pure coordinate system with grid types, transform functions, Step 6 journey-mapping config (7 rows × 5 columns), and extended PostIt cellAssignment field**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-11T04:47:49Z
- **Completed:** 2026-02-11T05:02:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Grid coordinate system foundation with type-safe GridConfig, CellCoordinate, CellBounds types
- Four pure coordinate transform functions for cell detection and snapping
- Step 6 journey-mapping configuration with 7 semantic swimlane rows and 5 default journey stage columns
- PostIt type extended with optional cellAssignment metadata (backward compatible)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create grid-layout.ts with types and coordinate transform functions** - `e02fa11` (feat)
2. **Task 2: Extend step-canvas-config.ts and PostIt type with grid support** - `36135ad` (feat)

## Files Created/Modified
- `src/lib/canvas/grid-layout.ts` - Grid types and pure coordinate functions (getCellBounds, positionToCell, snapToCell, getGridDimensions)
- `src/lib/canvas/step-canvas-config.ts` - Added hasGrid/gridConfig fields, journey-mapping step config with 7×5 grid
- `src/stores/canvas-store.ts` - Extended PostIt type with optional cellAssignment field

## Decisions Made

- **Semantic IDs over indices:** Rows/columns use string IDs (e.g., 'actions', 'awareness') not array indices, allowing future reordering without breaking references
- **140px x-origin:** Wider left margin (vs typical 100px) to accommodate "Moments of Truth" label without truncation
- **5 default columns:** Journey stages (awareness, consideration, decision, purchase, onboarding) provide sensible starting grid for Step 6
- **Cell padding in config:** 10px padding stored in GridConfig prevents magic numbers in snap logic
- **Position as source of truth:** cellAssignment is derived metadata, position remains authoritative per research

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 22 (Grid Overlay Rendering):**
- Grid coordinate system types and functions available for import
- Step 6 journey-mapping config ready to consume
- PostIt type supports cellAssignment metadata
- All TypeScript compilation passes

**No blockers or concerns.**

## Self-Check: PASSED

All claims verified:
- ✓ src/lib/canvas/grid-layout.ts exists
- ✓ Commit e02fa11 exists (Task 1)
- ✓ Commit 36135ad exists (Task 2)
- ✓ hasGrid field in step-canvas-config.ts
- ✓ cellAssignment field in canvas-store.ts
- ✓ journey-mapping config in step-canvas-config.ts

---
*Phase: 21-grid-foundation-coordinate-system*
*Completed: 2026-02-11*
