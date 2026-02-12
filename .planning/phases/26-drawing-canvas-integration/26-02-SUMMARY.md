---
phase: 26-drawing-canvas-integration
plan: 02
subsystem: canvas
tags: [canvas, drawing, reactflow, node-types]
dependency_graph:
  requires: [26-01]
  provides: [DrawingImageNode, drawing-node-crud]
  affects: [canvas-store, react-flow-canvas]
tech_stack:
  added: []
  patterns: [css-background-image, reactflow-custom-nodes, canvas-node-crud]
key_files:
  created:
    - src/components/canvas/drawing-image-node.tsx
  modified:
    - src/stores/canvas-store.ts
    - src/components/canvas/react-flow-canvas.tsx
decisions:
  - PNG display via CSS background-image eliminates 600KB Konva import in this layer
  - Width capped at 400px with proportional scaling for canvas performance
  - Drawing nodes use same drag/select/delete patterns as PostIt nodes for UX consistency
  - Temporal undo/redo includes drawingNodes alongside postIts for unified history
metrics:
  duration: 180s
  tasks_completed: 2
  files_created: 1
  files_modified: 2
  commits: 2
  completed_date: 2026-02-12
---

# Phase 26 Plan 02: DrawingImageNode & Canvas Integration Summary

**One-liner:** DrawingImageNode ReactFlow component displays PNG drawings on canvas with full drag/select/delete CRUD, zero Konva imports.

## What Was Built

Created the DrawingImageNode custom ReactFlow node component and integrated it with the canvas-store for complete drawing node lifecycle management on the ReactFlow canvas.

### DrawingImageNode Component

- **Pure React component** using CSS `background-image` for PNG display (no Konva imports)
- **Data structure:** `imageUrl` (Vercel Blob CDN), `drawingId` (stepArtifacts reference), `width`, `height`
- **Display rules:** Width capped at 400px, height scaled proportionally to preserve aspect ratio
- **Visual affordance:** Pencil icon appears on hover in bottom-right corner (for future re-edit flow)
- **Selection state:** Blue ring on selection, blue hover ring matching PostItNode pattern
- **Hidden handles:** Top target and bottom source handles for future edge connections
- **Component pattern:** Uses `memo()` wrapper and `displayName` for React DevTools

### Canvas Store Integration

Added `DrawingNode` type to canvas state:

```typescript
export type DrawingNode = {
  id: string;
  drawingId: string;   // ID in stepArtifacts.drawings array
  imageUrl: string;    // Vercel Blob CDN URL
  position: { x: number; y: number };
  width: number;
  height: number;
};
```

Added four CRUD actions:
- `addDrawingNode(node)` — generates UUID, appends to array, sets isDirty
- `updateDrawingNode(id, updates)` — updates specific node, sets isDirty
- `deleteDrawingNode(id)` — filters out by id, sets isDirty
- `setDrawingNodes(nodes)` — for DB loading (does NOT set isDirty)

**Temporal undo/redo support:** Added `drawingNodes` to `partialize` alongside `postIts` and `gridColumns` for unified history tracking.

### ReactFlow Canvas Integration

- **nodeTypes registration:** Added `drawingImage: DrawingImageNode` to nodeTypes constant
- **Node rendering:** Drawing nodes convert to ReactFlow nodes in `nodes` useMemo alongside postIt nodes
- **Position updates:** `handleNodesChange` detects drawing nodes and applies snap-to-grid via `updateDrawingNode`
- **Deletion:** Both `handleNodesDelete` (Delete/Backspace key) and `handleDeleteSelected` (toolbar button) handle drawing nodes
- **Selection:** Drawing nodes participate in multi-select with Shift+drag like PostIt nodes

## Deviations from Plan

None — plan executed exactly as written.

## Technical Decisions

### CSS Background-Image vs Konva Layer

**Decision:** Use CSS `background-image` for PNG display instead of Konva Image layer.

**Rationale:**
- Preserves 600KB bundle budget (INTEG-05 requirement)
- DrawingImageNode is purely for display — no drawing operations needed at this layer
- ReactFlow nodes already render as DOM elements, so CSS is the natural fit
- Future re-edit flow will open EzyDraw modal, not inline edit the node

**Trade-off:** Cannot apply Konva filters/effects to drawing images on canvas, but this was never a requirement.

### 400px Width Cap with Proportional Scaling

**Decision:** Cap display width at 400px and scale height proportionally.

**Rationale:**
- Large drawings (e.g., 800x600) would dominate canvas and obscure other artifacts
- Consistent with PostIt node size constraint (120x120)
- Proportional scaling preserves aspect ratio for visual fidelity
- Original dimensions stored in data for future use (zoom, export, re-edit)

**Trade-off:** Very wide drawings (e.g., 1200x400) will be scaled down significantly, but users can click to re-edit for full-size view.

### Unified Node Type Handling

**Decision:** Drawing nodes share drag/select/delete handlers with PostIt nodes.

**Rationale:**
- Consistent UX — users don't need to learn separate interaction patterns
- Simpler implementation — single `handleNodesChange` pipeline
- Multi-select works across node types (Shift+drag selects postIts and drawings together)

**Trade-off:** Some drawing-specific behaviors (e.g., rotation, resize handles) deferred to future work.

## Integration Points

### Upstream Dependencies (26-01)

- **EzyDraw modal** produces PNG via `exportPNG()` utility
- **stepArtifacts.drawings** array stores vector JSON + PNG URL (this plan consumes PNG URL)

### Downstream Dependencies (Future Plans)

- **26-03** will implement double-click re-edit flow using `drawingId` to load saved vector data
- **AI placement logic** (later plan) will call `addDrawingNode` to place AI-suggested drawings on canvas

## Success Criteria Met

- ✅ DrawingImageNode renders PNG via CSS background-image
- ✅ Zero Konva imports in `drawing-image-node.tsx`
- ✅ Component uses memo() and has displayName
- ✅ Hidden Handle elements present for target and source
- ✅ Canvas store exports DrawingNode type and all four CRUD actions (add/update/delete/set)
- ✅ nodeTypes includes `drawingImage: DrawingImageNode`
- ✅ Drawing nodes render in ReactFlow canvas alongside postIts
- ✅ Drawing nodes support drag with snap-to-grid
- ✅ Drawing nodes support selection and deletion (keyboard + toolbar)
- ✅ Temporal undo/redo includes drawingNodes
- ✅ TypeScript compiles with zero errors

## Self-Check

Verifying created files and commits exist:

**Files created:**
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/components/canvas/drawing-image-node.tsx`

**Files modified:**
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/stores/canvas-store.ts`
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/components/canvas/react-flow-canvas.tsx`

**Commits:**
- ✅ `44ba7e4` — feat(26-02): create DrawingImageNode custom ReactFlow node
- ✅ `ee2eb45` — feat(26-02): add drawing node CRUD to canvas store and register DrawingImageNode

## Self-Check: PASSED

All files and commits verified. Plan execution complete.

---

**Status:** Complete
**Next Plan:** 26-03 (Drawing Edit Flow — double-click to re-open EzyDraw with saved vector data)
