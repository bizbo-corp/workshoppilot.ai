---
phase: 22-dynamic-grid-structure
plan: 02
subsystem: canvas-grid-ui
tags: [grid, canvas, ux-polish, column-management]
dependency_graph:
  requires: [22-01-grid-foundation]
  provides: [editable-column-headers, add-column-ui, delete-column-confirmation]
  affects: [journey-mapping-canvas, grid-overlay]
tech_stack:
  added: []
  patterns: [foreignObject-svg-html-hybrid, inline-editing, confirmation-dialogs]
key_files:
  created:
    - src/components/canvas/editable-column-header.tsx
    - src/components/canvas/add-column-button.tsx
    - src/components/dialogs/delete-column-dialog.tsx
  modified:
    - src/components/canvas/grid-overlay.tsx
    - src/components/canvas/react-flow-canvas.tsx
decisions:
  - decision: "foreignObject for interactive column headers in SVG overlay"
    rationale: "SVG text elements don't support inline editing - foreignObject embeds HTML components with full event handling"
  - decision: "Delete empty columns immediately without dialog"
    rationale: "No risk of data loss - confirmation only needed when cards would be affected"
  - decision: "Maximum 12 columns enforced at UI level"
    rationale: "Journey maps beyond 12 stages become unwieldy - practical UX constraint"
metrics:
  duration_minutes: 3.8
  tasks_completed: 2
  commits: 2
  files_modified: 2
  files_created: 3
  completed_date: 2026-02-11
---

# Phase 22 Plan 02: Column Management UI Summary

**One-liner:** Built fully interactive column management UI with inline-editable headers, +Add Stage button, delete confirmation dialog with card migration preview, completing dynamic grid structure.

## What Was Built

### Task 1: Create Column UI Components
**Commit:** `27fb4be`

**EditableColumnHeader component:**
- Controlled input with inline editing on click
- Enter key saves changes, Escape reverts
- onBlur auto-saves valid changes
- Auto-focus and text selection on edit mode entry
- Max length 30 characters, empty input reverts to original
- Syncs editValue from prop changes when not editing
- CSS classes: `nodrag nopan` to prevent ReactFlow interference
- Hover styles: gray background with rounded corners
- Edit styles: blue bottom border, white background

**AddColumnButton component:**
- PlusCircle icon from lucide-react
- Default state: button with "Add Stage" text
- Click enters inline input mode with placeholder "Stage name..."
- Enter or onBlur creates column if trimmed value non-empty
- Escape cancels and resets state
- disabled prop shows muted style with tooltip "Maximum 12 stages"
- Auto-focus on input when entering adding state

**DeleteColumnDialog component:**
- Follows reset-step-dialog.tsx pattern exactly
- Props: open, onOpenChange, onConfirm, columnLabel, affectedCardCount, migrationTarget
- Dynamic description based on card count:
  - 0 cards: "This column is empty and can be safely removed."
  - >0 with target: "This column contains {N} card(s). Cards will be moved to **{target}**."
  - >0 without target: "This column contains {N} card(s). Cards will lose their column assignment."
- Footer: Cancel (outline) + Delete Column (destructive) buttons
- onConfirm called then dialog closed on delete click

### Task 2: Wire Dynamic Columns Into Grid Overlay and Canvas
**Commit:** `adc4fc0`

**GridOverlay dynamic rendering:**
- Added store subscriptions: `gridColumns`, `postIts`, `updateGridColumn`, `addGridColumn`
- `effectiveColumns = gridColumns.length > 0 ? gridColumns : config.columns` (backward compat)
- All column position calculations use `effectiveColumns` instead of `config.columns`
- Column header rendering replaced SVG `<text>` with `<foreignObject>` for HTML embedding
- foreignObject dimensions: x = midpoint - width/2, y = headerPos.y - 12, width = max(160, colWidth * zoom), height = 28
- foreignObject className: `pointer-events-auto overflow-visible` (parent SVG has `pointer-events-none`)
- Header content wrapped in `<div>` with `group` class for hover-based delete button reveal
- EditableColumnHeader wired to `updateGridColumn(col.id, { label })` on save
- Delete button (X icon) only shows if `effectiveColumns.length > 1` (can't delete last column)
- Delete button has `opacity-0 group-hover:opacity-100` transition
- Card count calculated: `postIts.filter(p => p.cellAssignment?.col === col.id).length`
- Migration target determined: `leftAdjacentLabel || rightAdjacentLabel` (prefers left)
- +Add Stage button positioned at `lastColRight + 30` from grid origin
- Max 12 columns check: `effectiveColumns.length >= MAX_COLUMNS` disables button
- Add button calls `addGridColumn(\`Stage ${effectiveColumns.length + 1}\`)` with default name

**ReactFlowCanvas initialization and wiring:**
- Added imports: DeleteColumnDialog, GridColumn type, GridConfig type
- Added store selectors: `gridColumns`, `setGridColumns`, `removeGridColumn`
- Added deleteColumnDialog state: `{ open, columnId, columnLabel, affectedCardCount, migrationTarget } | null`
- **Grid initialization useEffect:** Runs when `stepConfig.hasGrid && stepConfig.gridConfig && gridColumns.length === 0`
  - Maps `stepConfig.gridConfig.columns` to `GridColumn[]` format
  - Calls `setGridColumns(initialColumns)` to seed store on first load
- **Dynamic gridConfig useMemo:** Constructs `GridConfig` with `columns: gridColumns` from store
  - Returns `undefined` if grid not enabled or gridColumns empty
  - Spreads `stepConfig.gridConfig` base config, overrides `columns` field
- **All grid operations updated to use dynamicGridConfig:**
  - `createPostItAtPosition` - snapToCell and positionToCell calls
  - `handleToolbarAdd` - snapToCell and positionToCell calls
  - `handleNodesChange` - snapToCell and positionToCell calls
  - `handleNodeDrag` - positionToCell call for cell highlighting
  - `handleInit` - grid check uses dynamicGridConfig
  - GridOverlay rendering - passes dynamicGridConfig as config prop
  - All guards changed from `stepConfig.gridConfig` to `dynamicGridConfig`
- **handleDeleteColumn callback:**
  - If `affectedCardCount === 0`: calls `removeGridColumn(columnId, dynamicGridConfig)` immediately
  - If `affectedCardCount > 0`: sets deleteColumnDialog state to show confirmation
- **handleConfirmDelete callback:**
  - Calls `removeGridColumn(deleteColumnDialog.columnId, dynamicGridConfig)`
  - Clears deleteColumnDialog state
- **GridOverlay updated props:** Added `onDeleteColumn={handleDeleteColumn}`
- **DeleteColumnDialog rendering:** Conditional render after context menu, before empty state hint

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

- ✓ `npx tsc --noEmit` — zero TypeScript errors
- ✓ `npm run build` — production build succeeded
- ✓ GridOverlay imports EditableColumnHeader, PlusCircle, X icons
- ✓ GridOverlay subscribes to gridColumns, postIts, updateGridColumn, addGridColumn
- ✓ effectiveColumns used for all column position calculations
- ✓ Column headers rendered with foreignObject containing EditableColumnHeader + delete button
- ✓ +Add Stage button positioned at right edge with max 12 columns enforcement
- ✓ ReactFlowCanvas imports DeleteColumnDialog, GridColumn, GridConfig types
- ✓ gridColumns initialization useEffect exists and maps stepConfig columns
- ✓ dynamicGridConfig useMemo constructs GridConfig from store state
- ✓ All grid operation references updated from stepConfig.gridConfig to dynamicGridConfig
- ✓ handleDeleteColumn and handleConfirmDelete callbacks implemented
- ✓ DeleteColumnDialog rendered conditionally
- ✓ GridOverlay receives onDeleteColumn prop

## Success Criteria

1. ✓ User can add columns via +Add Stage button with a name (DCOL-01)
2. ✓ User can inline-edit column headers with Enter/Escape/blur handling (DCOL-03)
3. ✓ User can remove columns with confirmation dialog showing affected card count and migration target (DCOL-02)
4. ✓ Cards in deleted columns migrate to adjacent column automatically (DCOL-02)
5. ✓ Column operations complete with smooth UI feedback (foreignObject transitions, hover effects)
6. ✓ Maximum 12 columns enforced at UI level
7. ✓ All operations persist via auto-save (isDirty flag set) and participate in undo/redo (temporal middleware)
8. ✓ TypeScript compilation and production build both pass

## Key Architecture Notes

**foreignObject pattern for SVG + HTML hybrid:**
- Parent SVG has `pointer-events-none` to allow panning through overlay
- foreignObject elements need `pointer-events-auto` class to receive clicks
- foreignObject dimensions calculated in screen space (zoom applied)
- HTML components inside foreignObject behave normally (CSS, events, React state)
- This is the standard React + SVG interactive overlay pattern

**Dynamic grid initialization:**
- gridColumns array in store starts empty
- On first render with grid step, useEffect seeds gridColumns from stepConfig
- After seeding, gridColumns becomes source of truth
- stepConfig.gridConfig remains static (template for new workshops)
- dynamicGridConfig is ephemeral, reconstructed on each render from store state

**Column deletion immediate vs confirmation:**
- Empty columns deleted immediately without dialog (no data loss risk)
- Non-empty columns show confirmation with card count and migration target
- Migration target calculated from adjacent columns (left preferred per 22-01 decision)
- removeGridColumn in store handles card reassignment and position recalculation

**Store actions participate in temporal middleware:**
- addGridColumn, updateGridColumn, removeGridColumn all set `isDirty: true`
- All included in zundo temporal `partialize` (defined in 22-01)
- Undo/redo works for all column operations
- Auto-save triggered via isDirty flag

## Files Modified

| File | Changes |
|------|---------|
| src/components/canvas/editable-column-header.tsx | NEW - Controlled input component with Enter/Escape/blur handlers, auto-focus/select, max length 30, hover/edit styles |
| src/components/canvas/add-column-button.tsx | NEW - PlusCircle button with inline input mode, Enter/Escape/blur handlers, disabled state, max length 30 |
| src/components/dialogs/delete-column-dialog.tsx | NEW - Confirmation dialog with dynamic description based on affected card count and migration target |
| src/components/canvas/grid-overlay.tsx | Added store subscriptions (gridColumns, postIts, updateGridColumn, addGridColumn), effectiveColumns logic, replaced SVG text headers with foreignObject HTML components (EditableColumnHeader + delete button), added +Add Stage button foreignObject, updated all column calculations to use effectiveColumns |
| src/components/canvas/react-flow-canvas.tsx | Added imports (DeleteColumnDialog, GridColumn, GridConfig), store selectors (gridColumns, setGridColumns, removeGridColumn), deleteColumnDialog state, gridColumns initialization useEffect, dynamicGridConfig useMemo, updated all grid operations to use dynamicGridConfig, added handleDeleteColumn and handleConfirmDelete callbacks, wired onDeleteColumn to GridOverlay, added DeleteColumnDialog rendering |

## Next Steps

Phase 22 is now complete. All dynamic grid structure requirements fulfilled:
- ✓ DCOL-01: Add columns dynamically
- ✓ DCOL-02: Remove columns with card migration
- ✓ DCOL-03: Inline-edit column labels

Phase 23 will continue v1.2 Canvas Whiteboard work with remaining features.

## Self-Check: PASSED

**Created files verified:**
- ✓ FOUND: src/components/canvas/editable-column-header.tsx
- ✓ FOUND: src/components/canvas/add-column-button.tsx
- ✓ FOUND: src/components/dialogs/delete-column-dialog.tsx

**Modified files verified:**
- ✓ FOUND: src/components/canvas/grid-overlay.tsx
- ✓ FOUND: src/components/canvas/react-flow-canvas.tsx

**Commits verified:**
- ✓ FOUND: 27fb4be (Task 1: add column UI components)
- ✓ FOUND: adc4fc0 (Task 2: wire dynamic columns into grid overlay and canvas)

All artifacts present and verified.
