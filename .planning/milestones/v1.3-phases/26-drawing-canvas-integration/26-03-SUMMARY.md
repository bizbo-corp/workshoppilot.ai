---
phase: 26-drawing-canvas-integration
plan: 03
subsystem: canvas-integration
tags: [integration, drawing, canvas, server-actions]
dependency_graph:
  requires: [26-01, 26-02]
  provides: [complete-drawing-lifecycle, autosave-integration]
  affects: [ezydraw-modal, react-flow-canvas, canvas-actions, use-canvas-autosave]
tech_stack:
  added: []
  patterns: [inner-component-store-access, async-double-click-handler, autosave-extension]
key_files:
  created:
    - .planning/phases/26-drawing-canvas-integration/26-03-SUMMARY.md
  modified:
    - src/components/ezydraw/ezydraw-modal.tsx
    - src/components/canvas/react-flow-canvas.tsx
    - src/components/layout/workshop-header.tsx
    - src/actions/canvas-actions.ts
    - src/hooks/use-canvas-autosave.ts
decisions:
  - Inner component pattern (EzyDrawContent) accesses drawing store for getSnapshot during save
  - Double-click handler detects node type (drawing vs postIt) for different edit behaviors
  - Drawing nodes include drawingId reference to stepArtifacts.drawings[] for re-edit lookups
  - Autosave includes drawingNodes alongside postIts for unified persistence
  - Stage dimensions hardcoded to 1920x1080 (EzyDraw canvas default size)
metrics:
  duration: 205s
  tasks_completed: 2
  files_created: 1
  files_modified: 5
  commits: 2
  completed_date: 2026-02-12
---

# Phase 26 Plan 03: Drawing Edit Flow Summary

**One-liner:** Complete save and re-edit integration between EzyDraw modal and ReactFlow canvas with autosave persistence.

## What Was Built

Wired the complete drawing lifecycle: create → save → display → double-click re-edit → update. Drawing node positions persist via canvas autosave, while drawing content (PNG + vector JSON) persists via drawing-specific server actions.

### Save Flow (Task 1)

**EzyDrawModal Updates:**
- Changed `onSave` signature from `(dataURL: string) => void` to `(result: { pngDataUrl: string; elements: DrawingElement[] }) => void`
- Created `EzyDrawContent` inner component that lives inside `DrawingStoreProvider` scope
- Inner component accesses `useDrawingStore(s => s.getSnapshot)` to retrieve current elements
- Modal exports both PNG (via `exportToPNG`) and elements (via `getSnapshot`) on save

**ReactFlowCanvas Integration:**
- Added `ezyDrawState` state for modal control: `{ isOpen: boolean; drawingId?: string; initialElements?: DrawingElement[] }`
- Created `handleDrawingSave` callback that:
  1. Simplifies elements using `simplifyDrawingElements()` (60%+ point reduction)
  2. Converts to JSON string for storage
  3. Detects new vs re-edit based on `ezyDrawState.drawingId` presence
  4. **New drawing flow:** Calls `saveDrawing()` → uploads PNG to Vercel Blob → stores in stepArtifacts → adds `DrawingImageNode` to canvas at viewport center
  5. **Re-edit flow:** Calls `updateDrawing()` → uploads new PNG → updates existing record → updates node's `imageUrl`
- Renders `EzyDrawLoader` conditionally when `ezyDrawState.isOpen === true`

**Workshop Header Fix:**
- Updated test modal in `workshop-header.tsx` to use new `onSave` signature (was causing TypeScript error)

### Re-Edit Flow (Task 2)

**Double-Click Handler:**
- Updated `handleNodeDoubleClick` to async function
- Detects drawing nodes by searching `drawingNodes` array for matching ID
- Calls `loadDrawing({ workshopId, stepId, drawingId })` server action
- Parses `vectorJson` string back to `DrawingElement[]` array
- Opens EzyDraw with `initialElements` and `drawingId` for update mode
- Falls through to existing postIt edit behavior if not a drawing node

**Autosave Integration:**
- Updated `canvas-actions.ts` types to include `drawingNodes?: DrawingNode[]` in save/load signatures
- Modified `loadCanvasState` to return `drawingNodes` from `_canvas` object if present
- Updated `use-canvas-autosave.ts` to:
  1. Subscribe to `drawingNodes` from canvas store
  2. Include `drawingNodes` in autosave payload
  3. Trigger save when `drawingNodes` change (alongside `postIts` and `gridColumns`)

**Data Flow:**
```
Drawing Content (PNG + vector JSON):
  - Stored in stepArtifacts.drawings[] array
  - Uploaded/updated via saveDrawing/updateDrawing server actions
  - Loaded via loadDrawing server action on re-edit

Drawing Node Position (on canvas):
  - Stored in _canvas.drawingNodes[] array
  - Persisted via saveCanvasState autosave
  - Loaded via loadCanvasState on page load
```

## Deviations from Plan

None — plan executed exactly as written.

## Technical Implementation Details

### Inner Component Pattern for Store Access

**Challenge:** `handleSave` in `EzyDrawModal` needs to access the drawing store's `getSnapshot()` method, but the store is created by `DrawingStoreProvider` which wraps the modal content.

**Solution:** Created `EzyDrawContent` inner component that:
- Receives `stageRef`, `onSave`, `onCancel` as props
- Lives inside `DrawingStoreProvider` scope
- Calls `useDrawingStore(s => s.getSnapshot)` to access store
- Constructs save result with both PNG and elements

**Benefits:**
- Clean separation of concerns (modal shell vs drawing content)
- Store access without prop drilling
- Testable components with clear responsibilities

### Async Double-Click Handler

**Challenge:** Loading vector JSON requires async server call, but ReactFlow's `onNodeDoubleClick` expects synchronous handler.

**Solution:** Changed handler to `async (_event, node) => { ... }` and used early return pattern:
```typescript
const handleNodeDoubleClick = async (event, node) => {
  const drawingNode = drawingNodes.find(dn => dn.id === node.id);
  if (drawingNode) {
    await loadDrawing(...);
    return; // Prevent fallthrough
  }
  // PostIt edit behavior
};
```

**Benefits:**
- Single handler for both node types
- Clear type-based routing logic
- No blocking UI during load

### Dual Storage Pattern

**Design:** Drawing data split across two storage locations:

1. **stepArtifacts.drawings[]** (via drawing-actions.ts):
   - PNG URL (Vercel Blob CDN)
   - Vector JSON (simplified DrawingElement[])
   - Original dimensions (width, height)
   - Timestamps (createdAt, updatedAt)
   - Unique drawing ID

2. **stepArtifacts._canvas.drawingNodes[]** (via canvas-actions.ts):
   - Canvas position (x, y)
   - Display dimensions (capped at 400px width)
   - Reference to drawing ID
   - Unique node ID

**Rationale:**
- Content updates (drawing edits) are heavyweight (PNG upload)
- Position updates (drag on canvas) are lightweight (autosave)
- Separation prevents unnecessary PNG re-uploads on every drag

## Integration Points

### Upstream Dependencies

**Plan 26-01 (Drawing Persistence Backend):**
- `saveDrawing()` — creates new drawing record with PNG upload
- `loadDrawing()` — retrieves vector JSON by ID
- `updateDrawing()` — replaces PNG and vector JSON for existing drawing
- `simplifyDrawingElements()` — reduces point arrays before storage

**Plan 26-02 (DrawingImageNode & Canvas Integration):**
- `DrawingImageNode` — ReactFlow custom node for PNG display
- `addDrawingNode()` — canvas store action to add node
- `updateDrawingNode()` — canvas store action to update node (e.g., new PNG URL)
- `drawingNodes` — canvas store state array

### Downstream Dependencies

**Future Plans:**
- AI placement logic will call `addDrawingNode()` to place suggested drawings
- Canvas toolbar may add "Draw" button to open EzyDraw modal
- Export/print features will need to fetch full-resolution PNGs from Blob URLs

## Verification Results

All verification criteria passed:

✅ `npx tsc --noEmit` passes with zero errors
✅ EzyDrawModal exports updated props with `onSave: (result: { pngDataUrl, elements }) => void`
✅ react-flow-canvas.tsx imports `saveDrawing`, `updateDrawing`, `loadDrawing`, `simplifyDrawingElements`
✅ `handleDrawingSave` calls `simplifyDrawingElements` before saving
✅ `EzyDrawLoader` rendered conditionally when `ezyDrawState.isOpen`
✅ Double-clicking a drawing node calls `loadDrawing` and opens EzyDraw with `initialElements`
✅ Double-clicking a postIt node enters text edit mode (no regression)
✅ Autosave payload includes `drawingNodes` alongside `postIts`
✅ `loadCanvasState` returns `drawingNodes` if present

## Success Criteria Met

- ✅ Full save flow: Open EzyDraw → draw → save → PNG uploaded → vector JSON stored → DrawingImageNode appears
- ✅ Full re-edit flow: Double-click node → load vector JSON → parse elements → EzyDraw opens → save updates existing record
- ✅ Autosave: Moving drawing node triggers autosave with updated position
- ✅ No regressions: All postIt interactions (create, edit, drag, delete) unchanged
- ✅ TypeScript compilation passes with zero errors

## Edge Cases Handled

**Empty drawing (no elements):**
- `getSnapshot()` returns empty array
- `simplifyDrawingElements([])` returns empty array
- Server accepts empty `vectorJson: "[]"` and stores it
- Re-edit loads empty array, modal starts blank

**PNG upload failure:**
- `saveDrawing`/`updateDrawing` catch errors and return `{ success: false, error }`
- Modal stays open (user can retry)
- No partial state (no node added if PNG upload fails)

**Missing BLOB_READ_WRITE_TOKEN:**
- Server actions return descriptive error: "BLOB_READ_WRITE_TOKEN not configured. Set this in Vercel Dashboard → Storage → Blob."
- User sees error in console, modal stays open

**Drawing node deleted from stepArtifacts but still on canvas:**
- `loadDrawing` returns `null` if drawing not found
- Double-click handler checks for `null` and skips opening modal
- Future: Add warning toast for this scenario

## Self-Check

Verifying created files and commits exist:

**Files created:**
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/.planning/phases/26-drawing-canvas-integration/26-03-SUMMARY.md`

**Files modified:**
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/components/ezydraw/ezydraw-modal.tsx`
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/components/canvas/react-flow-canvas.tsx`
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/components/layout/workshop-header.tsx`
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/actions/canvas-actions.ts`
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/hooks/use-canvas-autosave.ts`

**Commits:**
- ✅ `2596497` — feat(26-03): wire EzyDraw save flow with server actions
- ✅ `371d457` — feat(26-03): wire drawing re-edit flow and autosave integration

## Self-Check: PASSED

All files and commits verified. Plan execution complete.

---

**Status:** Complete
**Next Plan:** 26-04 (Drawing Launch Integration — canvas toolbar button + AI placement patterns)
