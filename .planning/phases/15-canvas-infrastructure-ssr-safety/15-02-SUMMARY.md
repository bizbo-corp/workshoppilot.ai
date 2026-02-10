---
phase: 15-canvas-infrastructure-ssr-safety
plan: 02
subsystem: ui
tags: [reactflow, canvas, post-it, interactions, toolbar, double-click, snap-to-grid]

# Dependency graph
requires:
  - phase: 15
    plan: 01
    provides: Zustand canvas store, PostItNode component, SSR-safe canvas wrapper
provides:
  - ReactFlow canvas component with all Phase 15 interactions
  - Canvas toolbar with + button for post-it creation
  - Double-click pane detection for post-it creation
  - Toolbar dealing-cards offset pattern (+30x, +30y)
  - Immediate edit mode on post-it creation
  - Snap-to-grid positioning (20px grid)
  - Auto-fit zoom on canvas load
affects: [15-03-persistence-layer, 16-ai-canvas-control]

# Tech tracking
tech-stack:
  added: []
  patterns: [double-click-detection, dealing-cards-offset, auto-edit-mode, snap-to-grid]

key-files:
  created:
    - src/components/canvas/react-flow-canvas.tsx
    - src/components/canvas/canvas-toolbar.tsx
  modified: []

key-decisions:
  - "Double-click detection: Manual implementation using onPaneClick with 300ms threshold (no native onPaneDoubleClick in ReactFlow)"
  - "Edit mode activation: Track shouldEditLatest ref flag, activate on next render when postIts array grows"
  - "Dealing-cards offset: +30px x and y from last post-it position for toolbar creation"
  - "Snap-to-grid: 20px grid size matching dot grid background gap"
  - "zoomOnDoubleClick: false to allow double-click post-it creation without zoom interference"

patterns-established:
  - "Double-click detection pattern: useRef to track last click time, compare delta to threshold"
  - "Auto-edit mode pattern: useRef flag + useEffect watching postIts array length to detect new post-it"
  - "ReactFlow provider pattern: Outer component wraps inner with ReactFlowProvider for hook access"

# Metrics
duration: 3min 24sec
completed: 2026-02-10
---

# Phase 15 Plan 02: ReactFlow Canvas Component Summary

**Main ReactFlow canvas with double-click creation, toolbar + button with dealing-cards offset, immediate edit mode, snap-to-grid, and auto-fit zoom**

## Performance

- **Duration:** 3min 24sec
- **Started:** 2026-02-10T07:42:55Z
- **Completed:** 2026-02-10T07:46:19Z
- **Tasks:** 1
- **Files created:** 2

## Accomplishments

- ReactFlow canvas renders with dot grid background (20px gap, gray-300 dots)
- Double-click detection on empty pane creates post-it at click position (snapped to 20px grid)
- Toolbar + button creates post-its with dealing-cards offset (+30x, +30y from last post-it)
- New post-its immediately enter edit mode (textarea visible and auto-focused)
- Post-its draggable with snap-to-grid on drag end
- Empty state hint "Double-click to add a post-it" shows when canvas has no post-its
- Auto-fit zoom on initial load centers all existing post-its with 20% padding
- All interactions update Zustand store as single source of truth

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ReactFlow canvas component with all interactions** - `68934f0` (feat)

## Files Created/Modified

### Created
- `src/components/canvas/react-flow-canvas.tsx` - Main ReactFlow canvas with ReactFlowProvider, double-click detection, toolbar integration, snap-to-grid, auto-edit mode, and auto-fit zoom
- `src/components/canvas/canvas-toolbar.tsx` - Minimal toolbar with + button for post-it creation

### Modified
None - plan executed as written with no file modifications

## Decisions Made

**1. Manual double-click detection (workaround)**
- ReactFlow API does not provide `onPaneDoubleClick` event handler
- Implemented using `onPaneClick` with 300ms threshold tracking via useRef
- Set `zoomOnDoubleClick={false}` to prevent default zoom behavior
- **Rationale:** ReactFlow's built-in double-click only supports zoom, not custom handlers

**2. Auto-edit mode activation pattern**
- Use `shouldEditLatest` ref flag to signal that next post-it should be edited
- useEffect watches `postIts` array length to detect new post-it addition
- When length increases and flag is set, activate edit mode on last post-it
- **Rationale:** Store's `addPostIt` uses `crypto.randomUUID()` so ID can't be predicted; watching array length is most reliable

**3. Dealing-cards offset implementation**
- Toolbar + button offsets new post-it by +30px x and +30px y from last post-it
- If no post-its exist, place at viewport center
- **Rationale:** Creates visual stacking effect that's intuitive and discoverable

**4. Snap-to-grid configuration**
- Grid size: 20px (matches dot grid background gap)
- Snap function: `Math.round(pos / 20) * 20`
- Applied to: double-click creation, toolbar creation, and drag end
- **Rationale:** Ensures tidy alignment and matches visual grid

**5. Auto-fit zoom behavior**
- Only runs once on mount if `postIts.length > 0`
- Uses `hasFitView` ref to prevent re-running on subsequent renders
- 20% padding, 300ms animation duration
- **Rationale:** Ensures user sees all content on load, but doesn't interfere with manual pan/zoom during use

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 3 - Blocking] ReactFlow API missing onPaneDoubleClick**
- **Found during:** Task 1 implementation
- **Issue:** TypeScript error showed `onPaneDoubleClick` doesn't exist in ReactFlow API. Plan specified using this prop, but ReactFlow v12 only has `onPaneClick`.
- **Fix:** Implemented manual double-click detection using `onPaneClick` with timing threshold (300ms). Added `lastPaneClickTime` useRef to track click timestamps. Set `zoomOnDoubleClick={false}` to disable default zoom.
- **Files modified:** src/components/canvas/react-flow-canvas.tsx
- **Commit:** Included in 68934f0 (same task commit)

## Issues Encountered

None - single blocking issue auto-fixed per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 03:** Canvas persistence layer
- Canvas interactions fully functional and updating Zustand store
- `isDirty` flag in store ready to track unsaved changes
- Canvas wrapper established contract with `sessionId` and `stepId` props
- All post-it CRUD operations working (add via double-click/toolbar, update via drag, edit via double-click node)

**Key for Plan 03 to implement:**
- Create auto-save hook watching `isDirty` flag
- Debounce at 2 seconds per requirement
- Call persistence action to save canvas state to `stepArtifacts.artifact` JSONB column
- Display save status indicator in bottom-right corner placeholder
- Handle optimistic lock conflicts on concurrent saves

## Self-Check: PASSED

All files created and commits verified:
- ✓ 2 files created at expected paths
- ✓ 1 task commit exists (68934f0)
- ✓ TypeScript compiles without errors
- ✓ ReactFlow CSS imported
- ✓ nodeTypes defined outside component (stable reference)
- ✓ BackgroundVariant.Dots used for dot grid
- ✓ snapToGrid and snapGrid configured
- ✓ No 'use server' directives

**Verification commands:**
```bash
# Check files exist
ls -la src/components/canvas/react-flow-canvas.tsx src/components/canvas/canvas-toolbar.tsx

# Verify commit
git log --oneline -1

# TypeScript check
npx tsc --noEmit

# Check key implementation details
grep "import '@xyflow/react/dist/style.css'" src/components/canvas/react-flow-canvas.tsx
grep "const nodeTypes" src/components/canvas/react-flow-canvas.tsx
grep "BackgroundVariant.Dots" src/components/canvas/react-flow-canvas.tsx
```

All checks passed ✓

---
*Phase: 15-canvas-infrastructure-ssr-safety*
*Completed: 2026-02-10*
