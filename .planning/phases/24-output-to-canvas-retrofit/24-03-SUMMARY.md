---
phase: 24-output-to-canvas-retrofit
plan: 03
subsystem: canvas-ui-integration
tags: [canvas-only-layout, lazy-migration, ring-placement, zone-placement, split-screen]
dependency_graph:
  requires: [24-01, 24-02]
  provides: [canvas-only-step-rendering, lazy-migration-flow, zone-aware-add-to-whiteboard]
  affects: [step-2-stakeholder-mapping, step-4-sense-making]
tech_stack:
  added: []
  patterns: [conditional-rendering, lazy-client-side-migration, color-priority-mapping]
key_files:
  created: []
  modified:
    - src/components/workshop/step-container.tsx
    - src/app/workshop/[sessionId]/step/[stepId]/page.tsx
    - src/components/workshop/chat-panel.tsx
decisions:
  - Canvas-only steps (2 & 4) render split-screen: chat left (25%), canvas right (75%)
  - CANVAS_ONLY_STEPS constant defines which steps skip output panel
  - Migration is lazy (client-side) - post-its passed as initialPostIts to CanvasStoreProvider
  - Migration does NOT set isDirty - persistence only happens on user interaction
  - UUIDs generated at page level for migrated post-its (not in migration helpers)
  - Color priority for Add to Whiteboard: category > zone > default yellow
  - Pains zone uses pink, gains zone uses green (Step 4)
metrics:
  duration_seconds: 146
  tasks_completed: 2
  files_created: 0
  files_modified: 3
  commits: 2
  completed_at: "2026-02-11T23:48:10Z"
---

# Phase 24 Plan 03: Canvas-Only Layout & Migration Summary

**One-liner:** Split-screen canvas-only rendering for Steps 2 & 4 with lazy artifact-to-canvas migration and zone-aware Add to Whiteboard

## What Was Built

Completed the user-facing integration for the output-to-canvas retrofit:

1. **Step Container Canvas-Only Rendering** - Modified `step-container.tsx`:
   - Added `CANVAS_ONLY_STEPS` constant: `['stakeholder-mapping', 'sense-making']`
   - Conditionally render `CanvasWrapper` instead of `RightPanel` for canvas-only steps
   - Applied pattern to 3 rendering contexts:
     - Desktop resizable panels (75% canvas width)
     - Chat-collapsed full-width view
     - Mobile tab layout
   - Added collapse button for canvas-only view
   - Output accordion and Extract Output button automatically hidden for canvas-only steps
   - Steps 1, 3, 5, 6, 7-10 unchanged (still render RightPanel with output)

2. **Lazy Migration at Page Level** - Modified `page.tsx`:
   - Import migration helpers (`migrateStakeholdersToCanvas`, `migrateEmpathyToCanvas`)
   - Detect condition: `initialCanvasPostIts.length === 0 && initialArtifact && step`
   - For Step 2 (stakeholder-mapping): call `migrateStakeholdersToCanvas(initialArtifact)`
   - For Step 4 (sense-making): call `migrateEmpathyToCanvas(initialArtifact)`
   - Generate UUIDs and add type defaults for migrated post-its
   - Pass migrated post-its to `CanvasStoreProvider` as `initialPostIts`
   - Migration is lazy - no DB write, only client-side seeding

3. **Zone-Aware Add to Whiteboard** - Modified `chat-panel.tsx`:
   - Import `ZONE_COLORS` from canvas-position module
   - Updated color priority logic: `category > zone > default yellow`
   - Ensures pains zone cards are pink, gains zone cards are green
   - Ring items remain yellow (no zone color mapping for rings)
   - Existing `computeCanvasPosition` already handles ring/zone placement (from Plan 01)
   - Auto-zoom via `setPendingFitView(true)` already in place

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

**Canvas-Only Rendering Pattern:**
- Check if `step && CANVAS_ONLY_STEPS.includes(step.id)`
- If true: render `<CanvasWrapper>` with collapse button
- If false: render `<RightPanel>` (existing behavior)
- Pattern applied consistently across desktop/mobile/collapsed states

**Lazy Migration Flow:**
1. Page loads → check for existing canvas state
2. If no canvas state BUT artifact exists → run migration helper
3. Migration helper returns `Omit<PostIt, 'id'>[]`
4. Page level generates UUIDs: `crypto.randomUUID()`
5. Page level adds defaults: `color: 'yellow'`, `type: 'postIt'`
6. Pass to `CanvasStoreProvider` as `initialPostIts`
7. Store initializes with these post-its (NOT marked dirty)
8. User drags/adds → `isDirty` becomes true → autosave triggers

**Color Priority Logic:**
```typescript
const color = (item.category && CATEGORY_COLORS[item.category])
  || (item.quadrant && ZONE_COLORS[item.quadrant])
  || 'yellow';
```
- Step 5 persona items: category colors (goals=blue, pains=pink, gains=green)
- Step 4 empathy items: zone colors (pains=pink, gains=green, others=yellow)
- Step 2 ring items: all yellow (ZONE_COLORS has no ring mappings)
- Step 6 grid items: default yellow

## Verification Results

All verification steps passed:

- ✅ `npx tsc --noEmit` — zero TypeScript errors
- ✅ Canvas-only steps render split-screen (chat left, canvas right)
- ✅ No output panel for Steps 2 & 4
- ✅ Migration logic added at page level
- ✅ Zone color mapping added to Add to Whiteboard
- ✅ Steps 1, 3, 5, 6, 7-10 unaffected

## Files Modified

**Modified (3 files):**
- `src/components/workshop/step-container.tsx` (+52 lines, -0 lines) - Canvas-only rendering logic
- `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` (+16 lines, -1 line) - Lazy migration
- `src/components/workshop/chat-panel.tsx` (+3 lines, -1 line) - Zone color priority

## Commits

| Task | Commit | Description | Files |
|------|--------|-------------|-------|
| 1    | 1bfc937 | Render canvas-only layout for Steps 2 & 4 | step-container.tsx |
| 2    | 0eb1e7b | Implement lazy migration and zone-aware Add to Whiteboard | page.tsx, chat-panel.tsx |

## Key Decisions

1. **Canvas-only steps skip RightPanel entirely:** Cleaner UX, no output accordion confusion
2. **Migration is lazy (client-side only):** No DB writes until user interaction prevents unnecessary persistence
3. **UUID generation at page level:** Migration helpers remain pure functions without crypto dependencies
4. **Color priority is explicit fallback chain:** Category → Zone → Yellow ensures correct colors for all step types
5. **Mobile rendering also canvas-only:** Consistent UX across all viewports

## Integration Notes

**How it all connects:**
1. User visits Step 2 with completed stakeholder output but no canvas state
2. Page detects: `initialCanvasPostIts.length === 0 && initialArtifact`
3. Page calls: `migrateStakeholdersToCanvas(initialArtifact)`
4. Migration helper uses ring layout from Plan 01: distributes by importance score
5. Page generates UUIDs, passes to CanvasStoreProvider
6. StepContainer renders canvas-only (no output panel)
7. Canvas displays ring overlay from Plan 02
8. User drags post-it → ring detection from Plan 02 updates cellAssignment.row
9. Store marks dirty, autosave persists to DB
10. AI suggests new items → Add to Whiteboard uses ring placement from Plan 01
11. Auto-zoom fits all cards into view

**For Step 4 (empathy zones):**
- Same flow, but uses empathy zone layout (6 zones)
- Zone detection on drag
- Zone colors (pains=pink, gains=green)

## Next Steps

This completes the canvas-first retrofit for Steps 2 & 4. Remaining plans in Phase 24:
1. AI agent behavior updates (system prompts, context assembly)
2. Testing and edge case handling
3. Feature flag rollout strategy

## Self-Check: PASSED

✅ All modified files exist:
- FOUND: src/components/workshop/step-container.tsx
- FOUND: src/app/workshop/[sessionId]/step/[stepId]/page.tsx
- FOUND: src/components/workshop/chat-panel.tsx

✅ All commits exist:
- FOUND: 1bfc937
- FOUND: 0eb1e7b

✅ TypeScript compiles without errors
✅ All verification criteria met
✅ No deviations from plan
✅ All tasks complete
