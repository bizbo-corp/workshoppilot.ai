---
phase: 24-output-to-canvas-retrofit
plan: 01
subsystem: canvas-layouts
tags: [ring-layout, empathy-zones, spatial-algorithms, migration-helpers]
dependency_graph:
  requires: [step-canvas-config, canvas-position, grid-layout]
  provides: [ring-layout, empathy-zones, migration-helpers]
  affects: [stakeholder-mapping-step, sense-making-step]
tech_stack:
  added: []
  patterns: [pure-functions, radial-distribution, rectangular-zones, importance-scoring]
key_files:
  created:
    - src/lib/canvas/ring-layout.ts
    - src/lib/canvas/empathy-zones.ts
    - src/lib/canvas/migration-helpers.ts
  modified:
    - src/lib/canvas/step-canvas-config.ts
    - src/lib/canvas/canvas-position.ts
decisions:
  - Ring layout uses concentric circles at 320px, 520px, 720px radii for 3 importance tiers
  - Empathy zone layout follows classic empathy map structure (4 quadrants + 2 strips)
  - Stakeholder importance scoring: power + interest (each 1-3), total range 2-6
  - Ring assignment thresholds: >=5 inner, >=3 middle, else outer
  - Empathy themes distributed round-robin across 4 quadrant zones (says/thinks/feels/does)
  - Zone colors: pains=pink, gains=green, others=yellow (default)
  - Migration helpers are pure functions (no side effects, no store access)
metrics:
  duration_seconds: 164
  tasks_completed: 2
  files_created: 3
  files_modified: 2
  commits: 2
  completed_date: 2026-02-11
---

# Phase 24 Plan 01: Ring Layout & Empathy Zones Summary

**One-liner:** Radial ring distribution for stakeholder importance and 6-zone empathy map layout with pure-function migration helpers.

## What Was Built

Created the spatial layout foundation for Steps 2 & 4 canvas retrofit:

1. **Ring Layout Module** (`ring-layout.ts`):
   - `RingConfig` type for concentric ring configurations
   - `distributeCardsOnRing()`: Evenly spaces cards around a ring circumference using trigonometry (start from top, angle stepping)
   - `detectRing()`: Calculates Euclidean distance from center to determine which ring a position belongs to
   - Handles edge cases: 0 cards (empty array), very close to center (inner ring), beyond all rings (outer ring)

2. **Empathy Zone Layout Module** (`empathy-zones.ts`):
   - `EmpathyZone` type: 6 zones (says, thinks, feels, does, pains, gains)
   - `EmpathyZoneConfig` type: Rectangular bounds for each zone
   - `getZoneForPosition()`: Simple rectangular bounds checking
   - `distributeCardsInZone()`: Tidy grid layout within zone bounds with padding and label header space

3. **Step Canvas Config Updates** (`step-canvas-config.ts`):
   - Extended `StepCanvasConfig` with `hasRings`, `ringConfig`, `hasEmpathyZones`, `empathyZoneConfig`
   - **Replaced** stakeholder-mapping config: `hasQuadrants: false`, `hasRings: true`
   - 3 rings: inner (320px, blue), middle (520px, purple), outer (720px, indigo)
   - **Replaced** sense-making config: `hasQuadrants: false`, `hasEmpathyZones: true`
   - 6 zones: Classic empathy map layout with 4 quadrants (800x680px) + 2 horizontal strips for pains/gains

4. **Canvas Position Extensions** (`canvas-position.ts`):
   - Added ring-based branch: Detects `hasRings` flag, finds ring from metadata.quadrant, distributes cards radially
   - Added empathy-zone branch: Detects `hasEmpathyZones` flag, finds zone from metadata.quadrant, distributes cards in grid
   - New branches execute BEFORE existing quadrant branch (takes priority for Steps 2 & 4)
   - Added `ZONE_COLORS` mapping for empathy zone post-it colors

5. **Migration Helpers** (`migration-helpers.ts`):
   - `migrateStakeholdersToCanvas()`: Converts Step 2 stakeholder artifact to ring-assigned post-its
     - Importance scoring: power (high=3, med=2, low=1) + interest (same scale) = 2-6 range
     - Ring assignment: >=5 inner, >=3 middle, else outer
     - Calls `distributeCardsOnRing()` per ring group
   - `migrateEmpathyToCanvas()`: Converts Step 4 empathy artifact to zone-assigned post-its
     - Distributes themes round-robin across 4 quadrant zones (says, thinks, feels, does)
     - Theme evidence items become individual cards
     - Maps pains array → pains zone, gains array → gains zone
     - Calls `distributeCardsInZone()` per zone group
     - Applies zone-specific colors (pink for pains, green for gains)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

**Ring Distribution Algorithm:**
- Uses polar coordinates: `angle = startAngle + i * (2π / cardCount)`
- Start from top (`-π/2`) for visual balance
- Convert from card center to top-left corner for rendering
- Handles cardCount=0 gracefully (returns empty array)

**Empathy Zone Grid Algorithm:**
- Calculates max columns: `floor((zoneBounds.width - 2*padding) / (cardSize.width + padding))`
- Reserves 40px header height for zone label
- Lays out cards left-to-right, top-to-bottom in rows
- Returns top-left corner positions for each card

**Importance Scoring:**
- Power dimension: high=3, medium=2, low=1
- Interest dimension: high=3, medium=2, low=1
- Total score range: 2 (low+low) to 6 (high+high)
- Ring assignment: >=5 inner (most important), >=3 middle, <3 outer

**Migration Helpers Design:**
- Pure functions: no side effects, no store mutations
- Take artifact data (from JSONB) → return array of `Omit<PostIt, 'id'>`
- Called at page/container level, result passed to canvas store
- Store generates UUIDs when adding post-its

## Verification Results

All verification steps passed:

- ✅ `npx tsc --noEmit` — zero TypeScript errors
- ✅ New files exist: ring-layout.ts, empathy-zones.ts, migration-helpers.ts
- ✅ step-canvas-config.ts has `hasRings: true` for stakeholder-mapping
- ✅ step-canvas-config.ts has `hasEmpathyZones: true` for sense-making
- ✅ canvas-position.ts handles ring and empathy-zone branches (priority before quadrant branch)
- ✅ Migration helpers produce valid PostIt arrays with correct zone assignments

## Files Created/Modified

**Created (3 files):**
- `src/lib/canvas/ring-layout.ts` (93 lines)
- `src/lib/canvas/empathy-zones.ts` (96 lines)
- `src/lib/canvas/migration-helpers.ts` (193 lines)

**Modified (2 files):**
- `src/lib/canvas/step-canvas-config.ts` (replaced quadrant configs with ring/empathy-zone configs)
- `src/lib/canvas/canvas-position.ts` (added ring/zone branches, ZONE_COLORS mapping)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 7f0d6c2 | Create ring layout and empathy zone layout modules, update step canvas config |
| 2    | e8cdbcd | Extend canvas position for ring/zone placement, create migration helpers |

## Key Decisions

1. **Ring radii chosen for visual hierarchy:** 320px (inner), 520px (middle), 720px (outer) - 200px spacing between rings
2. **Empathy zone layout follows classic empathy map:** 4 quadrants in 2x2 grid (800x680px total) + 2 horizontal strips below (840x250px each)
3. **Importance scoring is additive:** Power + interest, each dimension 1-3, total 2-6 for clear tier separation
4. **Theme distribution is round-robin:** Ensures even spread across 4 quadrant zones (says, thinks, feels, does)
5. **Migration helpers are pure functions:** No store access, no side effects - better testability and separation of concerns
6. **Zone colors use existing PostItColor type:** Pains=pink, gains=green leverage existing color palette

## Next Steps

This plan establishes the pure-function data layer. Next plans will:

1. Create ring overlay and empathy zone overlay UI components (SVG-based)
2. Add interactive canvas controls (add post-it, drag between zones/rings)
3. Implement migration strategy for existing workshops (feature flag + rollout)
4. Wire up migration helpers to page-level components

## Self-Check: PASSED

✅ All created files exist:
- FOUND: src/lib/canvas/ring-layout.ts
- FOUND: src/lib/canvas/empathy-zones.ts
- FOUND: src/lib/canvas/migration-helpers.ts

✅ All modified files updated:
- FOUND: src/lib/canvas/step-canvas-config.ts
- FOUND: src/lib/canvas/canvas-position.ts

✅ All commits exist:
- FOUND: 7f0d6c2
- FOUND: e8cdbcd

✅ TypeScript compiles without errors
✅ All verification criteria met
