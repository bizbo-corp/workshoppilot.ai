---
phase: 23-ai-suggest-then-confirm-placement
plan: 02
subsystem: canvas-ui
tags: [preview-nodes, cell-highlighting, ui-components, suggest-confirm-flow]
dependency_graph:
  requires: [phase-23-01-data-layer, phase-22-dynamic-grid]
  provides: [preview-ui-rendering, cell-pulse-animation, confirm-reject-buttons]
  affects: [post-it-node, react-flow-canvas, grid-overlay, chat-panel, canvas-store]
tech_stack:
  added: []
  patterns: [preview-conditional-render, cross-component-store-state, css-animate-pulse, svg-group-animation]
key_files:
  created: []
  modified:
    - src/components/canvas/post-it-node.tsx
    - src/components/canvas/react-flow-canvas.tsx
    - src/components/canvas/grid-overlay.tsx
    - src/components/workshop/chat-panel.tsx
    - src/stores/canvas-store.ts
decisions:
  - title: "Preview nodes render as early return branch in PostItNode"
    rationale: "Conditional early return cleaner than scattered ternaries throughout JSX. Preview nodes share styling but have fundamentally different interaction model (buttons vs edit mode)."
  - title: "highlightedCell moved to canvas store for cross-component access"
    rationale: "Chat-panel and ReactFlowCanvas are sibling components. Store provides shared state without prop drilling through WorkshopStep parent."
  - title: "Yellow pulse animation uses Tailwind animate-pulse"
    rationale: "Built-in Tailwind animation (2s fade cycle) provides smooth attention-grabbing effect without custom keyframes. Yellow (#eab308 stroke, #fef3c7 fill) contrasts with blue drag-highlight."
  - title: "highlightedCell excluded from temporal partialize"
    rationale: "Cell highlighting is ephemeral UI state for suggestion flow, not canvas data that should participate in undo/redo history."
metrics:
  duration: "2m 54s"
  tasks_completed: 2
  files_modified: 5
  completed_date: 2026-02-11
---

# Phase 23 Plan 02: Preview Node UI and Cell Highlighting

**One-liner:** Semi-transparent preview nodes with Add/Skip buttons and yellow pulsing cell highlights for AI suggest-then-confirm placement flow

## What Was Built

Built the complete visual UX layer for suggest-then-confirm placement, connecting AI suggestions to interactive preview nodes with clear confirmation actions:

**Preview Node Rendering (PostItNode):**
- Extended PostItNodeData type with `isPreview`, `previewReason`, `onConfirm`, `onReject` fields
- Added early return conditional branch for preview nodes with:
  - `opacity-60` for semi-transparent appearance (distinguishes from permanent nodes)
  - `ring-2 ring-blue-400` always-visible outline (no selection needed)
  - `text-xs` for slightly smaller text to fit action buttons
  - Read-only display (no TextareaAutosize edit mode)
  - Add and Skip buttons with `nodrag nopan` classes and `stopPropagation` handlers
  - Optional `previewReason` text display (AI explanation for placement)

**ReactFlowCanvas Wiring:**
- Added `confirmPreview` and `rejectPreview` store selectors
- Created `handleConfirmPreview` and `handleRejectPreview` callbacks that clear highlighted cell
- Modified nodes useMemo to handle preview nodes:
  - `draggable: !isPreview` prevents drag on preview nodes
  - `selectable: !isPreview` prevents ReactFlow selection (no blue ring)
  - `isEditing: false` when preview prevents double-click edit mode
  - Conditional spread of preview-specific data fields (onConfirm/onReject callbacks)

**Cell Highlighting (GridOverlay):**
- Replaced static blue cell highlight with yellow pulsing animation:
  - Wrapped in `<g className="animate-pulse">` for Tailwind 2s fade cycle
  - Fill: `#fef3c7` (amber-100) at 0.3 opacity for subtle background
  - Stroke: `#eab308` (yellow-500) at 3px width for visible border
  - Two rects (filled + stroked) for layered visual definition
- Used `effectiveColumns` (not `config.columns`) in `getCellBounds` to respect dynamic column state

**Cross-Component State (canvas-store):**
- Added `highlightedCell: { row: number; col: number } | null` to CanvasState
- Added `setHighlightedCell` action to CanvasActions
- Initialized to `null` in DEFAULT_STATE
- Excluded from temporal `partialize` (ephemeral UI state, not canvas data)

**Chat-Panel Integration:**
- Added `setHighlightedCell` store selector
- Imported `getStepCanvasConfig` for gridConfig access
- Extended auto-add useEffect to highlight target cell for grid items:
  - Converts semantic row/col IDs to numeric indices
  - Calls `setHighlightedCell({ row: rowIndex, col: colIndex })`
  - Highlights LAST grid item's cell when multiple items added (acceptable UX)
- Moved highlightedCell from local state to store in ReactFlowCanvas

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**With Phase 23-01 (Data Layer):** Preview node data model (`isPreview`, `previewReason`) created in 23-01 now renders with visual UI in this plan. `confirmPreview`/`rejectPreview` actions wired to Add/Skip buttons.

**With Phase 22 (Dynamic Grid):** Cell highlighting respects dynamic columns via `effectiveColumns`. Delete column flow continues to work with preview nodes (migration applies to all postIts including previews).

**With Auto-Save System:** Preview confirmation/rejection triggers `isDirty: true` in store actions (from 23-01), causing auto-save. Cell highlighting does NOT trigger auto-save (ephemeral UI state).

**With Drag-and-Drop:** Preview nodes are non-draggable. Existing drag highlighting still uses `highlightedCell` from store (same API as AI suggestions). Drag-stop clears highlight.

## Testing Notes

**TypeScript compilation:** PASS (npx tsc --noEmit)
**Production build:** PASS (npm run build)

**Key verification points:**
- ✅ PostItNodeData includes isPreview, previewReason, onConfirm, onReject
- ✅ PostItNode renders preview branch with semi-transparent styling and buttons
- ✅ ReactFlowCanvas sets draggable: false, selectable: false for preview nodes
- ✅ confirmPreview/rejectPreview callbacks present in react-flow-canvas.tsx
- ✅ GridOverlay renders animate-pulse group with #eab308 yellow stroke
- ✅ highlightedCell in canvas-store.ts (state, action, initialization)
- ✅ setHighlightedCell called in chat-panel.tsx auto-add useEffect
- ✅ No local useState for highlightedCell in react-flow-canvas.tsx (uses store)
- ✅ effectiveColumns used in getCellBounds call (respects dynamic columns)

## Visual Design Decisions

**Preview Node Styling:**
- Semi-transparent (opacity-60) signals "not yet confirmed"
- Blue ring (ring-blue-400) matches Add button color for visual consistency
- Add button uses primary blue (bg-blue-500) for affirmative action prominence
- Skip button uses neutral gray (bg-gray-200) for secondary/dismissive action
- Button layout: flex gap-1.5, equal flex-1 for balanced width

**Cell Highlighting:**
- Yellow chosen for AI suggestions (contrasts with blue drag-highlight)
- Pulse animation grabs attention without being jarring (2s cycle, 100%→50%→100% opacity)
- Fill + stroke layers ensure visibility across varied post-it colors
- Highlight clears on confirm/reject/drag-stop for clean state transitions

## Next Steps

**Phase 24 (Canvas Retrofits):** Suggest-then-confirm pattern established here will extend to steps 2 & 4 if those steps adopt canvas overlays. Preview filtering and cell highlighting patterns are reusable.

**Future Enhancements:**
- Consider adding `previewReason` to AI prompt output (field exists but currently unpopulated)
- Preview expiration logic if users ignore previews across multiple AI turns
- Batch confirm/reject for multiple preview nodes (if AI suggests 5+ items)
- Preview node stacking/spacing adjustments in crowded cells

## Self-Check

Verifying all claimed files and commits exist:

```bash
# Check files
[ -f "src/components/canvas/post-it-node.tsx" ] && echo "FOUND: src/components/canvas/post-it-node.tsx" || echo "MISSING"
[ -f "src/components/canvas/react-flow-canvas.tsx" ] && echo "FOUND: src/components/canvas/react-flow-canvas.tsx" || echo "MISSING"
[ -f "src/components/canvas/grid-overlay.tsx" ] && echo "FOUND: src/components/canvas/grid-overlay.tsx" || echo "MISSING"
[ -f "src/components/workshop/chat-panel.tsx" ] && echo "FOUND: src/components/workshop/chat-panel.tsx" || echo "MISSING"
[ -f "src/stores/canvas-store.ts" ] && echo "FOUND: src/stores/canvas-store.ts" || echo "MISSING"

# Check commits
git log --oneline --all | grep -q "5fee5f0" && echo "FOUND: 5fee5f0" || echo "MISSING"
git log --oneline --all | grep -q "443f149" && echo "FOUND: 443f149" || echo "MISSING"
```

**Result:**

```
=== File Checks ===
FOUND: src/components/canvas/post-it-node.tsx
FOUND: src/components/canvas/react-flow-canvas.tsx
FOUND: src/components/canvas/grid-overlay.tsx
FOUND: src/components/workshop/chat-panel.tsx
FOUND: src/stores/canvas-store.ts

=== Commit Checks ===
FOUND: 5fee5f0
FOUND: 443f149
```

## Self-Check: PASSED

All claimed files and commits verified. Plan execution complete.
