---
phase: 17-canvas-core-interactions
plan: 02
subsystem: canvas-interactions, canvas-toolbar, color-picker
tags: [multi-select, delete, undo-redo, pan-zoom, color-coding, keyboard-shortcuts]
dependency_graph:
  requires:
    - 17-01 (temporal store, COLOR_CLASSES, useCanvasStoreApi)
    - 15-02 (post-it creation and editing)
  provides:
    - Multi-select via Shift+click and drag-select box
    - Delete via Backspace/Delete with editing safety
    - Undo/redo via keyboard shortcuts and toolbar buttons
    - Color picker context menu for post-it color changes
    - ReactFlow Controls component for zoom UI
  affects:
    - 17-03 (grouping will use multi-select and color-coding)
tech_stack:
  added:
    - react-hotkeys-hook (keyboard shortcuts)
  patterns:
    - Temporal store subscription for reactive undo/redo state
    - Context menu with fixed positioning and click-outside-to-close
    - Conditional deleteKeyCode based on editingNodeId
key_files:
  created:
    - src/components/canvas/color-picker.tsx
  modified:
    - src/components/canvas/react-flow-canvas.tsx
    - src/components/canvas/canvas-toolbar.tsx
decisions:
  - "Shift for multi-select (not Ctrl) to avoid conflict with undo shortcut"
  - "mod+z maps to Cmd on Mac, Ctrl on Windows/Linux for cross-platform undo"
  - "deleteKeyCode conditionally null when editingNodeId set (prevents delete during text input)"
  - "Color picker uses fixed positioning at click coordinates (not flow coordinates)"
  - "Context menu closes on viewport change to prevent floating disconnected from post-it"
metrics:
  duration: 3m 12s
  completed: 2026-02-10
---

# Phase 17 Plan 02: Canvas Core Interactions - Multi-Select, Delete, Undo/Redo, Color Picker Summary

**One-liner:** Wired up full canvas interaction suite: Shift+click multi-select with drag-select box, Backspace/Delete deletion with editing safety, Zundo temporal undo/redo via mod+z keyboard shortcuts and toolbar buttons, and right-click color picker context menu with 5 preset colors.

## What Was Built

### 1. Multi-Select Functionality (CANV-06)
**ReactFlow props configured:**
- `selectionKeyCode="Shift"`: Hold Shift to add nodes to selection
- `multiSelectionKeyCode={null}`: Disabled Ctrl multi-select (conflicts with undo)
- `selectionOnDrag={true}`: Enable drag-select box on empty canvas
- `selectionMode={SelectionMode.Partial}`: Select if any overlap with box

**Why Shift over Ctrl:** Ctrl/Cmd are reserved for undo/redo. Using Shift avoids shortcut conflicts and matches industry standards for multi-select.

### 2. Delete Functionality (CANV-03)
**Implementation:**
```typescript
deleteKeyCode={editingNodeId ? null : ["Backspace", "Delete"]}
onNodesDelete={handleNodesDelete}
```

**Safety mechanism:** Delete keys disabled when `editingNodeId` is set, preventing accidental deletion while typing in post-it textarea.

**Batch deletion:** `handleNodesDelete` calls `batchDeletePostIts(ids)` for efficient multi-node deletion.

### 3. Undo/Redo Integration (CANV-05)
**Temporal store access:**
```typescript
const storeApi = useCanvasStoreApi();
const temporalStore = storeApi.temporal;
```

**Keyboard shortcuts via react-hotkeys-hook:**
- `mod+z`: Undo (Cmd on Mac, Ctrl on Windows/Linux)
- `mod+shift+z` or `ctrl+y`: Redo
- `enableOnFormTags: false`: Prevents shortcuts from firing in textareas

**Reactive toolbar state:**
- `useEffect` subscribes to `temporalStore.subscribe((state) => {...})`
- Updates `canUndo` and `canRedo` based on `pastStates.length` and `futureStates.length`
- Toolbar buttons show disabled state (opacity-50, cursor-not-allowed) when unavailable

**Toolbar buttons:**
- Added undo/redo buttons to `CanvasToolbar` with `onUndo`, `onRedo`, `canUndo`, `canRedo` props
- Buttons styled consistently with existing "+ Add Post-it" button
- Disabled state prevents clicks when no history available

### 4. Pan/Zoom Configuration (CANV-07)
**Explicit ReactFlow props:**
- `panOnDrag={true}`: Drag canvas to pan
- `zoomOnScroll={true}`: Scroll to zoom
- `zoomOnPinch={true}`: Pinch gesture for touch devices
- `zoomOnDoubleClick={false}`: Already set (conflicts with post-it creation)
- `minZoom={0.3}`, `maxZoom={2}`: Existing limits preserved

**Controls component:**
```typescript
<Controls
  showInteractive={false}
  className="!shadow-md"
/>
```
Provides zoom in/out/fit buttons with consistent shadow styling.

### 5. Color Picker Context Menu (CANV-08)
**ColorPicker component created:**
- Fixed positioning at right-click coordinates (`position: { x, y }`)
- 5 color swatches (yellow, pink, blue, green, orange) using COLOR_CLASSES
- Current color highlighted with `border-gray-800` and `ring-2 ring-gray-400`
- Transparent backdrop (`fixed inset-0 z-40`) for click-outside-to-close
- Hover scale animation (`hover:scale-110`) for visual feedback

**Context menu state:**
```typescript
const [contextMenu, setContextMenu] = useState<{
  nodeId: string;
  x: number;
  y: number;
  currentColor: PostItColor;
} | null>(null);
```

**Integration with ReactFlow:**
- `onNodeContextMenu={handleNodeContextMenu}`: Right-click handler
- `onMoveStart={handleMoveStart}`: Close menu on pan/zoom
- `handlePaneClick` updated to close menu on canvas click

**Color selection flow:**
1. Right-click post-it → `handleNodeContextMenu` sets `contextMenu` state
2. ColorPicker renders at click position
3. User clicks color swatch → `handleColorSelect` calls `updatePostIt(id, { color })`
4. Menu closes automatically after selection

**Close triggers:**
- Color selection
- Click outside (backdrop)
- Viewport pan/zoom (`onMoveStart`)
- Pane click (canvas background)

## Deviations from Plan

None - plan executed exactly as written. All features implemented according to spec with no blocking issues or architectural changes required.

## Verification Results

### TypeScript Compilation
```bash
npx tsc --noEmit
# PASSED: No errors
```

### Feature Verification
- [x] `selectionKeyCode="Shift"` in ReactFlow props
- [x] `SelectionMode.Partial` imported and used
- [x] `onNodesDelete` handler present
- [x] `deleteKeyCode` conditional on editingNodeId
- [x] `useHotkeys` imported and configured for mod+z, mod+shift+z
- [x] `Controls` component rendered
- [x] Toolbar undo/redo buttons with disabled state
- [x] ColorPicker component created
- [x] `onNodeContextMenu` handler present
- [x] `onMoveStart` closes context menu
- [x] ColorPicker renders conditionally based on contextMenu state

## Self-Check

### Created Files
```bash
[ -f "src/components/canvas/color-picker.tsx" ] && echo "FOUND: src/components/canvas/color-picker.tsx" || echo "MISSING"
# FOUND: src/components/canvas/color-picker.tsx
```

### Modified Files
```bash
[ -f "src/components/canvas/react-flow-canvas.tsx" ] && echo "FOUND: src/components/canvas/react-flow-canvas.tsx" || echo "MISSING"
# FOUND: src/components/canvas/react-flow-canvas.tsx

[ -f "src/components/canvas/canvas-toolbar.tsx" ] && echo "FOUND: src/components/canvas/canvas-toolbar.tsx" || echo "MISSING"
# FOUND: src/components/canvas/canvas-toolbar.tsx
```

### Commits Exist
```bash
git log --oneline --all | grep -q "1e2a363" && echo "FOUND: 1e2a363" || echo "MISSING"
# FOUND: 1e2a363

git log --oneline --all | grep -q "f524515" && echo "FOUND: f524515" || echo "MISSING"
# FOUND: f524515
```

## Self-Check: PASSED

All files created/modified as expected, all commits present, all verification commands pass.

## What's Next

### Immediate Dependencies (Plan 03)
- **Grouping:** Use multi-select + color-coding to create visual groupings
- **Hierarchy:** Use parentId field to establish post-it relationships
- **Group management:** Delete groups should batch-delete children

### Phase 17 Completion Path
- Plan 03: Grouping and hierarchy (final plan for Phase 17)

### Known Limitations
- Multi-select currently only visual (no grouping actions yet) — Plan 03 dependency
- Color picker position may overflow viewport on right/bottom edges — acceptable for v1.1, improve in v1.2 if user feedback warrants

## Testing Notes

### Manual Testing Checklist
When testing this plan:
1. **Multi-select:**
   - Hold Shift, click multiple post-its → verify all selected (blue ring)
   - Drag on empty canvas → verify selection box appears
   - Release → verify overlapping post-its selected
2. **Delete:**
   - Select post-its, press Backspace or Delete → verify removed from canvas
   - Double-click to edit, press Delete while typing → verify text deleted, NOT post-it
3. **Undo/Redo:**
   - Create post-it, press Cmd+Z (or Ctrl+Z) → verify post-it removed
   - Press Cmd+Shift+Z → verify post-it restored
   - Click toolbar Undo/Redo buttons → verify same behavior
   - Verify buttons disabled when no history
4. **Pan/Zoom:**
   - Drag canvas (not on post-it) → verify pans
   - Scroll → verify zooms in/out
   - Click Controls zoom buttons → verify zoom changes
5. **Color picker:**
   - Right-click post-it → verify color menu appears at cursor
   - Click color swatch → verify post-it background changes
   - Right-click, then pan canvas → verify menu closes
   - Right-click, then click outside menu → verify menu closes

### Edge Cases to Verify
- Multi-select with edit mode active → should still work (selection and editing are independent)
- Delete key during edit mode → should delete text, NOT post-it
- Undo after color change → should revert to previous color
- Context menu near viewport edge → may overflow (acceptable for v1.1)
- Undo/redo button spam → should handle gracefully (pastStates/futureStates guard)

## Technical Notes

### Why mod+z Instead of ctrl+z
`react-hotkeys-hook`'s `mod` key maps to:
- **Cmd** on macOS
- **Ctrl** on Windows/Linux

This provides cross-platform consistency without manual OS detection.

### Why Temporal Subscription for canUndo/canRedo
Direct selectors like `useCanvasStore(s => s.temporal.pastStates)` don't work because:
1. Zundo's temporal state is separate from main store state
2. Temporal updates don't trigger main store subscriptions

Solution: Subscribe directly to temporal store via `storeApi.temporal.subscribe()` for reactive updates.

### Color Picker Positioning Strategy
Uses **fixed positioning** (not absolute) because:
- Context menu renders OUTSIDE ReactFlow (in wrapper div)
- Fixed positioning uses viewport coordinates (matches `event.clientX/Y`)
- Absolute would require manual offset calculation from wrapper position

### Delete Key Safety Mechanism
Conditional `deleteKeyCode` prevents accidental deletion during text input:
```typescript
deleteKeyCode={editingNodeId ? null : ["Backspace", "Delete"]}
```
When `editingNodeId` is set, ReactFlow ignores Delete key → key events bubble to textarea.

---

**Plan execution:** 3m 12s
**Commits:** 1e2a363, f524515
**Status:** COMPLETE - Ready for Plan 03 (grouping and hierarchy)
