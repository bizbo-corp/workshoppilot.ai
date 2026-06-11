---
phase: 24-output-to-canvas-retrofit
plan: 02
subsystem: canvas-ui
tags: [overlay-components, ring-layout, empathy-zones, drag-detection, viewport-awareness]
dependency_graph:
  requires: [24-01]
  provides: [ring-overlay-ui, empathy-zone-overlay-ui, ring-drag-behavior, zone-drag-behavior]
  affects: [step-2-canvas, step-4-canvas]
tech_stack:
  added: []
  patterns: [viewport-aware-svg, reactflow-store-subscription, conditional-overlay-rendering]
key_files:
  created:
    - src/components/canvas/concentric-rings-overlay.tsx
    - src/components/canvas/empathy-map-overlay.tsx
  modified:
    - src/components/canvas/react-flow-canvas.tsx
decisions: []
metrics:
  duration_seconds: 170
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  commits: 2
  completed_at: "2026-02-11T23:43:31Z"
---

# Phase 24 Plan 02: Ring & Zone Overlay Components Summary

**One-liner:** Viewport-aware SVG overlays for concentric rings (Step 2) and empathy zones (Step 4) with auto-assignment on drag-and-drop

## What Was Built

Created two new overlay components and integrated them into the ReactFlow canvas with full ring/zone-aware drag-and-drop behavior:

1. **ConcentricRingsOverlay** - Renders 3 concentric rings with:
   - Color-coded background tints (opacity 0.06)
   - Dashed boundaries for outer rings, solid for inner ring
   - Center "Most Important" label in foreignObject
   - Full viewport pan/zoom awareness via ReactFlow store subscription

2. **EmpathyMapOverlay** - Renders 6 empathy zones with:
   - Color-coded rectangular zone backgrounds (opacity 0.08)
   - Rounded corners (rx=8) for Miro/FigJam aesthetic
   - Persistent zone header labels (Says, Thinks, Feels, Does, Pains, Gains)
   - Bold red/emerald text for pains/gains strips
   - Dashed zone boundaries with thicker borders for important strips

3. **ReactFlowCanvas integration** - Added:
   - Conditional overlay rendering for ring and empathy zone steps
   - Ring detection on drag end using `detectRing()` → auto-assigns cellAssignment.row
   - Zone detection on drag end using `getZoneForPosition()` → auto-assigns cellAssignment.row
   - Ring/zone detection on double-click creation
   - Ring/zone detection on toolbar "+" creation
   - Ring/zone detection on emotion post-it creation
   - Viewport initialization: rings at 0.7 zoom, empathy zones at 0.6 zoom

## Technical Implementation

**Viewport-aware SVG pattern (same as QuadrantOverlay):**
- Uses `useStore as useReactFlowStore` from `@xyflow/react`
- Subscribes to viewport via `viewportSelector` for reactive transform updates
- Converts canvas coordinates to screen coordinates using `toScreen()` helper
- All SVG elements scale/translate with viewport pan and zoom

**Miro/FigJam aesthetic details:**
- Soft color tints with low opacity (0.06-0.08)
- Dashed boundaries for visual separation without clutter
- Rounded corners on zone rectangles
- Clean sans-serif labels with semantic color coding
- White/semi-transparent label backgrounds for readability

**Auto-assignment flow:**
1. User drags post-it and drops at new position
2. Position snapped to grid (20px)
3. Card center calculated (position + half of card dimensions)
4. Ring/zone detection function determines assignment
5. cellAssignment.row updated with ring ID or zone key
6. Store persists assignment for AI context and migration

## Deviations from Plan

None - plan executed exactly as written.

## How to Verify

**Visual verification:**
1. `npm run dev` and navigate to Step 2 (Stakeholder Mapping)
2. Should see 3 concentric ring boundaries with "Most Important" center label on empty canvas
3. Double-click inside a ring → creates post-it at that position
4. Drag post-it between rings → cellAssignment.row auto-updates to new ring
5. Navigate to Step 4 (Sense Making)
6. Should see 6 zones (Says, Thinks, Feels, Does, Pains, Gains) with headers on empty canvas
7. Double-click inside a zone → creates post-it at that position
8. Drag post-it between zones → cellAssignment.row auto-updates to new zone
9. Pan/zoom viewport → overlays scale and translate correctly

**Type verification:**
```bash
npx tsc --noEmit
```
Passes with zero errors.

**No regressions:**
- Step 6 (Journey Mapping) grid layout still works correctly
- Step 5 (Persona canvas) standard layout still works correctly
- Other canvas features (toolbar, colors, undo/redo) unaffected

## Files Changed

**Created:**
- `src/components/canvas/concentric-rings-overlay.tsx` (90 lines) - Ring overlay component
- `src/components/canvas/empathy-map-overlay.tsx` (108 lines) - Empathy zone overlay component

**Modified:**
- `src/components/canvas/react-flow-canvas.tsx` (+145 lines) - Integrated overlays and ring/zone-aware behavior

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| e099e98 | feat(24-02): create ConcentricRingsOverlay and EmpathyMapOverlay components | concentric-rings-overlay.tsx, empathy-map-overlay.tsx |
| fe49c04 | feat(24-02): integrate ring/zone overlays and auto-assignment in ReactFlowCanvas | react-flow-canvas.tsx |

## Next Steps

Plan 24-03 will implement the AI agent behavior for Steps 2 & 4, generating positioned post-its using the ring and empathy zone layouts created in this plan.

---

## Self-Check: PASSED

**Created files exist:**
```bash
[ -f "src/components/canvas/concentric-rings-overlay.tsx" ] && echo "FOUND"
[ -f "src/components/canvas/empathy-map-overlay.tsx" ] && echo "FOUND"
```
✓ Both files found

**Modified files exist:**
```bash
[ -f "src/components/canvas/react-flow-canvas.tsx" ] && echo "FOUND"
```
✓ File found

**Commits exist:**
```bash
git log --oneline --all | grep -q "e099e98" && echo "FOUND: e099e98"
git log --oneline --all | grep -q "fe49c04" && echo "FOUND: fe49c04"
```
✓ Both commits found

All claims verified. Plan 24-02 complete.
