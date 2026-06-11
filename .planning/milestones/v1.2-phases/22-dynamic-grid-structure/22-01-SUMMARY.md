---
phase: 22-dynamic-grid-structure
plan: 01
subsystem: canvas-grid-foundation
tags: [grid, canvas, store, ux-polish]
dependency_graph:
  requires: [phase-21-grid-foundation]
  provides: [dynamic-column-state, enlarged-grid-cells, post-it-auto-size, drag-feedback]
  affects: [journey-mapping-canvas, canvas-store]
tech_stack:
  added: [react-textarea-autosize]
  patterns: [zustand-temporal-state, grid-column-crud]
key_files:
  created: []
  modified:
    - src/lib/canvas/step-canvas-config.ts
    - src/stores/canvas-store.ts
    - src/providers/canvas-store-provider.tsx
    - src/components/canvas/post-it-node.tsx
    - src/components/canvas/react-flow-canvas.tsx
decisions:
  - decision: "Column width default set to 240px for all columns"
    rationale: "Provides comfortable spacing for post-it cards (120px) with generous margins"
  - decision: "removeGridColumn prefers left-adjacent column for post-it reassignment"
    rationale: "Left-to-right reading order makes left neighbor more intuitive fallback"
  - decision: "Post-it height set to auto with TextareaAutosize growing vertically"
    rationale: "Avoids scrolling within cards, improves readability"
metrics:
  duration_minutes: 3.6
  tasks_completed: 2
  commits: 2
  files_modified: 5
  completed_date: 2026-02-11
---

# Phase 22 Plan 01: Grid Foundation with Dynamic Columns Summary

**One-liner:** Enlarged journey map grid cells to 240×150px, added dynamic column state with CRUD actions to canvas store, and polished post-it UX with auto-sizing text and drag opacity feedback.

## What Was Built

### Task 1: Enlarged Grid Cells & Dynamic Column State
**Commit:** `0448979`

**Grid dimension changes (journey-mapping config):**
- Column widths: 200px → 240px (all columns)
- Row heights: 120px → 150px (all rows except emotions)
- Emotions row: 100px → 120px
- Cell padding: 10px → 15px
- Origin Y: 50px → 60px (header breathing room)

**Canvas store extensions:**
- Added `GridColumn` type export with `id`, `label`, `width` fields
- Extended `CanvasState` with `gridColumns: GridColumn[]` array
- Added column actions: `addGridColumn`, `updateGridColumn`, `removeGridColumn`, `setGridColumns`
- Included `gridColumns` in temporal `partialize` for undo/redo support
- Updated `createCanvasStore` signature to accept optional `gridColumns` in `initState`

**removeGridColumn behavior:**
- Finds deleted column index and determines adjacent target (prefers left, falls back to right)
- Filters out deleted column from `gridColumns` array
- For each post-it with `cellAssignment.col` matching deleted column:
  - If target column exists: updates `cellAssignment.col` to target ID, recalculates position using `getCellBounds` with filtered columns array
  - If no target (last column deleted): clears `cellAssignment` to undefined
- Sets `isDirty: true` to trigger autosave

**Canvas store provider:**
- Added `initialGridColumns?: GridColumn[]` prop
- Passes to `createCanvasStore` during initialization

### Task 2: Auto-Size Post-Its & Drag Feedback
**Commit:** `735b585`

**Post-it auto-sizing:**
- Replaced `<textarea>` with `<TextareaAutosize>` from `react-textarea-autosize` package (already installed)
- Configured: `minRows={3}`, `maxRows={10}`, `overflow: hidden`
- Post-it height style changed from fixed `120px` to `auto` for vertical growth

**Drag visual feedback:**
- Added `dragging?: boolean` to `PostItNodeData` type
- Added `cursor-pointer` class to post-it outer div
- Conditional opacity: `opacity: data.dragging ? 0.6 : 1` with `transition: opacity 150ms ease`
- ReactFlowCanvas tracks `draggingNodeId` state
- Added `handleNodeDragStart` to set dragging state
- Clears `draggingNodeId` on drag stop (in `handleNodesChange` position change with `dragging === false`)
- Passes `dragging: draggingNodeId === postIt.id` to PostItNode data
- Added `className={draggingNodeId ? 'cursor-grabbing' : ''}` to ReactFlow component

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

- ✓ `npx tsc --noEmit` — zero TypeScript errors
- ✓ `npm run build` — production build succeeded
- ✓ Journey mapping grid config shows 240px columns, 150px rows (120px emotions), 15px padding, 60px origin.y
- ✓ Canvas store exports `GridColumn` type
- ✓ `CanvasState` includes `gridColumns` array
- ✓ Three column actions (`addGridColumn`, `updateGridColumn`, `removeGridColumn`) implemented
- ✓ `gridColumns` included in temporal `partialize`
- ✓ PostItNode imports `TextareaAutosize` from `react-textarea-autosize`
- ✓ `draggingNodeId` state tracked in ReactFlowCanvas
- ✓ `onNodeDragStart` handler wired to ReactFlow
- ✓ `dragging` boolean passed to PostItNode data

## Success Criteria

1. ✓ Grid cells in step-canvas-config.ts are enlarged (240px wide, 150px/120px tall, 15px padding)
2. ✓ Canvas store has gridColumns state with add/update/remove actions participating in undo/redo
3. ✓ Post-it textarea auto-sizes with no scrollbar, grows to fit content
4. ✓ Dragging a post-it reduces opacity to 0.6, hovering shows pointer cursor
5. ✓ TypeScript compilation and production build both pass

## Key Architecture Notes

**Column CRUD operations:**
- All column mutations set `isDirty: true` to trigger autosave
- Column operations participate in undo/redo via existing zundo temporal middleware
- `removeGridColumn` performs cascading updates to post-it positions using `getCellBounds` with filtered columns array

**Post-it auto-sizing:**
- TextareaAutosize already installed as project dependency (v8.5.9)
- No new packages required for this implementation
- Post-it height now dynamic (`height: 'auto'` in node style) instead of fixed 120px

**Drag feedback pattern:**
- Separate state (`draggingNodeId`) from editing state to avoid conflicts
- Drag start sets state, drag end (detected via `change.dragging === false` in `onNodesChange`) clears state
- Opacity transition provides smooth visual feedback without interrupting drag interaction

## Files Modified

| File | Changes |
|------|---------|
| src/lib/canvas/step-canvas-config.ts | Updated journey-mapping gridConfig dimensions (columns 240px, rows 150px, padding 15px, origin.y 60px) |
| src/stores/canvas-store.ts | Added GridColumn type, gridColumns state, 4 column actions (add/update/remove/set), temporal partialize update, createCanvasStore signature change |
| src/providers/canvas-store-provider.tsx | Added initialGridColumns prop, passed to createCanvasStore |
| src/components/canvas/post-it-node.tsx | Added TextareaAutosize import, dragging prop to PostItNodeData, cursor-pointer class, conditional opacity, replaced textarea with TextareaAutosize |
| src/components/canvas/react-flow-canvas.tsx | Added draggingNodeId state, handleNodeDragStart handler, drag state clearing in handleNodesChange, dragging prop in nodes useMemo, cursor-grabbing className, onNodeDragStart prop on ReactFlow |

## Next Steps

Plan 22-02 will build on this foundation to add:
- Column header UI with add/remove/edit controls
- Column width resizing handles
- Visual column deletion confirmation
- Dynamic grid overlay rendering from `gridColumns` state

This plan establishes the data layer (canvas store) and UX polish that Plan 02's UI components will build upon.

## Self-Check: PASSED

**Created files:** None (all modifications to existing files)

**Modified files verified:**
- ✓ FOUND: src/lib/canvas/step-canvas-config.ts
- ✓ FOUND: src/stores/canvas-store.ts
- ✓ FOUND: src/providers/canvas-store-provider.tsx
- ✓ FOUND: src/components/canvas/post-it-node.tsx
- ✓ FOUND: src/components/canvas/react-flow-canvas.tsx

**Commits verified:**
- ✓ FOUND: 0448979 (Task 1: enlarge grid cells and add dynamic column state)
- ✓ FOUND: 735b585 (Task 2: auto-sizing textarea and drag visual feedback)

All artifacts present and verified.
