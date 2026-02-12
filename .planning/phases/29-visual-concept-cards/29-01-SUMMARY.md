---
phase: 29-visual-concept-cards
plan: 01
subsystem: visual-ideation
tags: [canvas, reactflow, concept-cards, swot, feasibility]
dependency_graph:
  requires: [post-it-node, mind-map-node, canvas-store, concept-sheet-view]
  provides: [concept-card-node, concept-card-types, concept-card-crud]
  affects: [canvas-store, step-9-integration]
tech_stack:
  added: [concept-card-types]
  patterns: [collapsible-sections, semantic-swot-colors, feasibility-dots, inline-editing-blur]
key_files:
  created:
    - src/lib/canvas/concept-card-types.ts
    - src/components/canvas/concept-card-node.tsx
  modified:
    - src/stores/canvas-store.ts
decisions:
  - "Used type alias (not interface) for ConceptCardData to satisfy ReactFlow Record<string, unknown> constraint"
  - "Grouped feasibility score+rationale in ConceptCardData (vs flat schema fields) for cleaner component API"
  - "Only header section expanded by default (per research: reduce cognitive load)"
  - "Used optional chaining for all callbacks to support rendering without store wiring"
  - "Added conceptCards to temporal partialize for undo/redo support"
metrics:
  duration: 329s
  tasks: 2
  commits: 2
  files_created: 2
  files_modified: 1
  lines_added: ~500
  completed: 2026-02-12
---

# Phase 29 Plan 01: ConceptCardNode Foundation

**One-liner:** ConceptCardNode custom ReactFlow component with 6 collapsible sections (header, sketch, pitch, SWOT, feasibility, billboard), ConceptCardData type, and canvas store CRUD actions.

## Overview

Built the foundational ConceptCardNode component that will be the building block for Phase 29's visual concept development workflow. This node is significantly more complex than previous canvas nodes (PostItNode, MindMapNode) with multi-section collapsible layout, semantic SWOT colors, feasibility dot ratings, and inline editing across all fields.

## Tasks Completed

### Task 1: Create ConceptCardData type and ConceptCardNode component
**Commit:** `707fa7d`
**Duration:** ~200s
**Files:** `src/lib/canvas/concept-card-types.ts`, `src/components/canvas/concept-card-node.tsx`

Created the ConceptCardData type definition with:
- Canvas-specific fields: `id`, `position`, `sketchSlotId`, `sketchImageUrl`
- Core concept fields: `conceptName`, `ideaSource`, `elevatorPitch`, `usp`
- Structured SWOT with exactly 3 items per quadrant
- Feasibility grouped as `{ score, rationale }` per dimension (vs flat schema)
- Optional `billboardHero` section
- Factory function `createDefaultConceptCard()` with sensible defaults

Implemented ConceptCardNode component with:
- **6 collapsible sections:** Header (always visible), Sketch Thumbnail (conditional), Elevator Pitch, SWOT Grid, Feasibility Assessment, Billboard Hero (conditional)
- **Semantic SWOT colors:** Exact match to concept-sheet-view.tsx (green/red/blue/amber with dark mode support)
- **Feasibility dots:** 1-5 clickable dots with color coding (>=4 green, 3 amber, <=2 red)
- **Inline editing:** `defaultValue` + `onBlur` pattern on all inputs (no `value` + `onChange` to avoid ReactFlow re-render thrashing)
- **All interactive elements** have `nodrag nopan` class (16 occurrences verified)
- **Hidden handles:** Opacity-0 top and bottom for future edge connections
- **Responsive width:** `max-w-[400px] w-full` (not fixed width for mobile support)
- **FeasibilityDimension sub-component** for DRY rendering of 3 feasibility dimensions

**Type system fix:** Changed `ConceptCardData` from `interface` to `type` alias to satisfy ReactFlow's `Record<string, unknown>` constraint on node data.

### Task 2: Add concept card CRUD actions to canvas store
**Commit:** `16ca75e`
**Duration:** ~129s
**Files:** `src/stores/canvas-store.ts`

Extended canvas store with:
- Added `conceptCards: ConceptCardData[]` to CanvasState
- Added 4 CRUD actions to CanvasActions:
  - `addConceptCard`: Assigns UUID, appends to array, sets isDirty
  - `updateConceptCard`: Maps over array, merges updates, sets isDirty
  - `deleteConceptCard`: Filters by id, sets isDirty
  - `setConceptCards`: Replaces entire array (for DB load, no isDirty)
- Updated `createCanvasStore` initState parameter to accept `conceptCards?: ConceptCardData[]`
- Initialized `conceptCards: initState?.conceptCards || []` in DEFAULT_STATE
- Added `conceptCards: state.conceptCards` to temporal `partialize` for undo/redo tracking

**No changes** to existing postIts, drawingNodes, mindMapNodes, crazy8sSlots code.

## Verification Results

✅ TypeScript compilation passes with zero errors
✅ Production build succeeds
✅ All input/textarea/button elements have `nodrag nopan` class (verified via grep)
✅ ConceptCardData type exports from concept-card-types.ts
✅ ConceptCardNode component exports from concept-card-node.tsx
✅ Canvas store has `conceptCards` in CanvasState
✅ Canvas store has all 4 CRUD actions in CanvasActions
✅ `conceptCards` appears in:
  - CanvasState type (line 68)
  - createCanvasStore initState parameter (line 113)
  - DEFAULT_STATE initialization (line 120)
  - addConceptCard action (line 474-475)
  - updateConceptCard action (line 486)
  - deleteConceptCard action (line 494)
  - setConceptCards action (line 500)
  - temporal partialize function (line 517)

## Deviations from Plan

None - plan executed exactly as written.

## Key Technical Details

**Collapsible state management:**
```typescript
const [expandedSections, setExpandedSections] = useState<Set<string>>(
  new Set(['header'])
);
```
Only header expanded by default to reduce cognitive load (per research pitfall).

**SWOT color mapping:**
- Strengths: `bg-green-50 dark:bg-green-950/20`, `border-green-500/30`
- Weaknesses: `bg-red-50 dark:bg-red-950/20`, `border-red-500/30`
- Opportunities: `bg-blue-50 dark:bg-blue-950/20`, `border-blue-500/30`
- Threats: `bg-amber-50 dark:bg-amber-950/20`, `border-amber-500/30`

Exact semantic match to concept-sheet-view.tsx for consistency.

**Feasibility dots:**
```typescript
const getScoreColor = (s: number) => {
  if (s >= 4) return 'bg-green-500';
  if (s === 3) return 'bg-amber-500';
  return 'bg-red-500';
};
```
5 clickable dots per dimension, color-coded by score threshold.

**Callback pattern:**
```typescript
onFieldChange?: (id: string, field: string, value: string) => void;
onSWOTChange?: (id: string, quadrant: string, index: number, value: string) => void;
onFeasibilityChange?: (id: string, dimension: string, score?: number, rationale?: string) => void;
```
All optional with `?.()` invocations to support rendering without store wiring during development.

## Impact

This plan establishes the foundational building block for Phase 29. All remaining plans depend on:
1. **ConceptCardNode** existing as a custom ReactFlow node type
2. **ConceptCardData** type for data modeling
3. **Canvas store CRUD actions** for state management

Next plans will:
- Wire the node to ReactFlow (29-02)
- Implement AI concept generation from Crazy 8s sketches (29-03)
- Integrate with Step 9 container (29-04)

## Self-Check

Verified all claims:

✅ **Files created:**
```bash
[ -f "src/lib/canvas/concept-card-types.ts" ] && echo "FOUND: concept-card-types.ts"
[ -f "src/components/canvas/concept-card-node.tsx" ] && echo "FOUND: concept-card-node.tsx"
```
Output:
```
FOUND: concept-card-types.ts
FOUND: concept-card-node.tsx
```

✅ **Commits exist:**
```bash
git log --oneline --all | grep -E "(707fa7d|16ca75e)"
```
Output:
```
16ca75e feat(29-01): add concept card CRUD actions to canvas store
707fa7d feat(29-01): create ConceptCardNode component and types
```

✅ **TypeScript exports:**
```bash
grep -E "export (type|function|const)" src/lib/canvas/concept-card-types.ts
grep -E "export (type|const)" src/components/canvas/concept-card-node.tsx
```
Confirmed: `ConceptCardData`, `createDefaultConceptCard`, `ConceptCardNodeRendererData`, `ConceptCardNodeType`, `ConceptCardNode`

✅ **Store actions:**
```bash
grep "conceptCards" src/stores/canvas-store.ts | wc -l
```
Output: `8` (state, initState, default, 4 actions, partialize)

## Self-Check: PASSED

All files created, commits exist, types export correctly, store has all CRUD actions.

---

*Completed: 2026-02-12 | Duration: 329s | Commits: 707fa7d, 16ca75e*
