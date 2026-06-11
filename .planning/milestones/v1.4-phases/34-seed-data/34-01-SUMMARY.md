---
phase: 34-seed-data
plan: 01
subsystem: dev-tools
tags: [seed-data, fixtures, canvas-state, mind-map, concept-cards, crazy-8s]
dependency-graph:
  requires: [canvas-store, mind-map-types, crazy-8s-types, concept-card-types]
  provides: [complete-seed-fixtures, step-8-canvas-data, step-9-canvas-data]
  affects: [seed-workshop-route, fixture-validation]
tech-stack:
  added: []
  patterns: [IIFE-for-id-generation, canvas-data-migration]
key-files:
  created: []
  modified:
    - src/app/api/dev/seed-workshop/fixtures.ts
    - src/app/api/dev/seed-workshop/route.ts
decisions:
  - Use IIFE pattern to generate stable IDs for mind map nodes/edges before array construction
  - Maintain legacy canvas field for backward compatibility while migrating to canvasData
  - Priority order: canvasData (new) → canvas (legacy) → no canvas data
metrics:
  duration: 276
  completed: 2026-02-12T22:49:05Z
---

# Phase 34 Plan 01: Expand Seed Fixtures with Canvas Data Summary

Expanded seed workshop fixtures with complete canvas state for Steps 8 (mind map + Crazy 8s) and Step 9 (concept cards), enabling full visual testing of ideation and concept development flows.

## Tasks Completed

### Task 1: Expand fixture type and add Step 8/9 canvas data
**Status:** Complete
**Commit:** 2afd673

Expanded the `StepFixture` type to support all canvas data types (mindMapNodes, mindMapEdges, crazy8sSlots, conceptCards) via a new `canvasData` field. Added comprehensive canvas representations for Steps 8 and 9:

**Step 8a - Mind Map:**
- Root node: "Intelligently-timed care nudges for multi-pet owners"
- 3 theme branches (level 1): Smart Routine Engine (blue), Unified Pet Dashboard (green), Care Delegation (purple)
- 8 child idea nodes (level 2) distributed across themes, inheriting parent colors
- 11 edges connecting root→themes and themes→ideas
- Used IIFE pattern to generate stable IDs upfront for proper edge connections

**Step 8b - Crazy 8s:**
- 8 titled slots matching the existing `crazyEightsIdeas` in the artifact
- Titles only (no imageUrl/drawingId since seed data has no actual drawings)

**Step 9 - Concept Cards:**
- 2 concept cards matching the 2 concepts in the artifact
- Card 1 ("PawPal Autopilot"): position {x:100, y:100}, full SWOT/feasibility/billboardHero
- Card 2 ("PawPal At-a-Glance"): position {x:130, y:130} with dealing-card offset
- Feasibility scores use nested structure: {score, rationale} per dimension

**Migration:**
- Steps 2, 4, and 6 migrated from `canvas: PostIt[]` to `canvasData: { postIts: [...] }` for consistency
- Kept legacy `canvas` field for backward compatibility

### Task 2: Update route canvas merge logic for all canvas data types
**Status:** Complete
**Commit:** fe763d1

Updated the seed workshop route's artifact data merge logic to handle the new `canvasData` field:

**Priority order:**
1. `fixture.canvasData` → merge full canvas state (mindMapNodes, edges, slots, cards)
2. `fixture.canvas` → legacy PostIt[] wrapped as `{ postIts: fixture.canvas }`
3. No canvas data → artifact only (Steps 1, 3, 5, 7, 10)

**Impact:**
- Steps 2/4/6: Use canvasData.postIts (new format) with legacy canvas as fallback
- Step 8: Use canvasData.mindMapNodes, mindMapEdges, crazy8sSlots
- Step 9: Use canvasData.conceptCards
- No breaking changes — legacy format still works

## Deviations from Plan

None - plan executed exactly as written.

## Verification

### TypeScript Compilation
```bash
npx tsc --noEmit
```
**Result:** ✓ Compiled successfully with no errors

### Build Success
```bash
npm run build
```
**Result:** ✓ Build succeeded (2.7s compilation, 14 routes generated)

### Canvas Data Structure
- ✓ `ideation.canvasData.mindMapNodes`: 13 nodes (1 root + 3 themes + 8 ideas)
- ✓ `ideation.canvasData.mindMapEdges`: 11 edges (3 root→theme + 8 theme→idea)
- ✓ `ideation.canvasData.crazy8sSlots`: 8 slots (slot-1 through slot-8 with titles)
- ✓ `concept.canvasData.conceptCards`: 2 cards (PawPal Autopilot + At-a-Glance)

## Self-Check: PASSED

### Files Created/Modified
✓ FOUND: `/Users/michaelchristie/devProjects/workshoppilot.ai/src/app/api/dev/seed-workshop/fixtures.ts` (modified)
✓ FOUND: `/Users/michaelchristie/devProjects/workshoppilot.ai/src/app/api/dev/seed-workshop/route.ts` (modified)

### Commits
✓ FOUND: 2afd673 (feat(34-01): expand seed fixtures with Step 8/9 canvas data)
✓ FOUND: fe763d1 (feat(34-01): update seed route to handle expanded canvas data types)

## Technical Notes

### Mind Map Node Structure
Each node includes:
- `id`: UUID for stable references
- `label`: Human-readable node text
- `level`: 0 (root) | 1 (theme) | 2 (idea)
- `parentId`: References parent node (undefined for root)
- `isRoot`: Boolean flag
- `themeColorId`, `themeColor`, `themeBgColor`: Visual theming

### Edge Structure
Each edge includes:
- `id`: UUID
- `source`, `target`: Node IDs
- `themeColor`: Inherits from source theme

### IIFE Pattern
Used immediately-invoked function expression to generate all node/edge IDs upfront:
```typescript
canvasData: (() => {
  const rootId = crypto.randomUUID();
  const theme1Id = crypto.randomUUID();
  // ... all IDs generated here
  return {
    mindMapNodes: [...], // uses IDs
    mindMapEdges: [...], // references IDs
  };
})()
```
This ensures edges can reference node IDs that don't exist yet in array construction order.

## Impact

### Developer Experience
- Seed workshop now includes complete visual canvas state for all steps
- Can test mind map auto-layout, Crazy 8s slot interactions, concept card positioning
- No more "empty canvas" when seeding to Steps 8 or 9

### Testing Coverage
Steps with canvas data:
- Step 2: Stakeholder mapping (quadrant PostIts)
- Step 4: Empathy map (quadrant PostIts)
- Step 6: Journey mapping (grid PostIts)
- Step 8a: Mind mapping (13 nodes, 11 edges)
- Step 8b: Crazy 8s (8 titled slots)
- Step 9: Concept cards (2 cards with full SWOT/feasibility)

### Next Steps
The seed data is now complete and ready for Phase 35 (E2E Testing) where we'll verify:
1. Mind map auto-layout with dagre
2. Crazy 8s slot title editing and drawing upload
3. Concept card dealing-card animation and SWOT editing
4. Canvas persistence across page refreshes
