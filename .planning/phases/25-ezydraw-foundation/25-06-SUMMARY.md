---
phase: 25-ezydraw-foundation
plan: 06
subsystem: ui
tags: [konva, react-konva, drawing, export, undo-redo, event-system, debugging]

# Dependency graph
requires:
  - phase: 25-05
    provides: All drawing tools (pencil, shapes, select, text, eraser)
provides:
  - PNG export via stage.toDataURL with UI layer hiding
  - Undo/redo wired to toolbar buttons and keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)
  - Clear canvas with confirmation dialog
  - Verified end-to-end drawing experience
  - React synthetic event system for pointer handling (reliable inside Radix Dialog)
  - Defensive rendering guards for Line components with empty/invalid points
affects: [26-drawing-canvas-integration, 28-mind-map-crazy-8s]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React synthetic events (onPointerDown/Move/Up) instead of native addEventListener for Konva inside Radix Dialog"
    - "useCallback + refs for stable pointer handlers avoiding stale closures"
    - "Defensive guards on Line rendering (points.length >= 4) to prevent Konva bufferCanvas crash"
    - "No manual stage.destroy() — react-konva manages Konva lifecycle internally"

key-files:
  created:
    - src/lib/drawing/export.ts
  modified:
    - src/components/ezydraw/ezydraw-modal.tsx
    - src/components/ezydraw/ezydraw-stage.tsx
    - src/components/ezydraw/toolbar.tsx
    - src/components/ezydraw/tools/pencil-tool.tsx
    - src/components/ezydraw/tools/shapes-tool.tsx
    - src/components/layout/workshop-header.tsx

key-decisions:
  - "React synthetic events for pointer handling: native addEventListener fails inside Radix Dialog + dynamic imports due to event delegation conflicts"
  - "Removed manual stageRef.current.destroy() — conflicts with React strict mode double-invoke, leaves shapes detached from layer causing bufferCanvas null crash"
  - "Tool hooks accept PointerData ({x, y, pressure, pointerType}) not KonvaEventObject — decouples from Konva event system"
  - "Single hook instance per tool (called in stage, preview passed as props) avoids disconnected state from multiple hook instances"

patterns-established:
  - "React onPointerDown/Move/Up on wrapper div delegates to tool hooks via refs"
  - "Window pointerup listener for drag-release outside canvas bounds"
  - "forwardRef + useImperativeHandle to expose getStage() and toDataURL() to modal parent"
  - "Guard Line/Arrow rendering against empty points arrays to prevent Konva internal crashes"

# Metrics
duration: ~1800s (includes interactive debugging with user)
completed: 2026-02-12
---

# Phase 25 Plan 06: PNG Export, Undo/Redo, and Human Verification Summary

**Wired undo/redo and PNG export, then debugged and fixed critical event handling and Konva lifecycle issues through interactive testing with user**

## Performance

- **Duration:** ~30 min (includes interactive debugging across multiple test cycles)
- **Started:** 2026-02-12
- **Completed:** 2026-02-12
- **Tasks:** 2 (auto + human verification checkpoint)
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- PNG export generates 2x retina data URL via stage.toDataURL with UI layer hiding
- Undo/redo buttons wired to store with disabled states when history empty
- Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z) working via react-hotkeys-hook
- Clear canvas shows window.confirm() before clearing
- Fixed critical event handling: switched from native DOM addEventListener to React synthetic events (onPointerDown/Move/Up) which work reliably inside Radix Dialog modals
- Fixed Konva lifecycle crash: removed manual stage.destroy() that conflicted with React strict mode, causing "Cannot read properties of null (reading 'bufferCanvas')" crash
- Refactored tool hooks to accept simple PointerData instead of KonvaEventObject for cleaner decoupling
- Added defensive rendering guards on Line/Arrow elements to prevent Konva crashes from empty points arrays
- Added temporary EzyDraw test button in workshop header for verification
- Human verification passed: all tools draw correctly, undo/redo works, save exports PNG

## Issues Encountered & Fixes

### 1. Pointer events not firing (critical)
**Problem:** react-konva's event system (`onPointerDown` on Stage/Rect) never fired inside Radix Dialog modal with dynamically imported components.
**Root cause:** Multiple interacting issues: (a) react-konva's event prop system is unreliable inside Radix Dialog, (b) native addEventListener on stage.container() failed because stageRef was null at useEffect time due to next/dynamic timing.
**Fix:** Switched to React synthetic event props (onPointerDown/Move/Up) on the wrapper div. React's event delegation at the root reliably captures events regardless of Konva's internal canvas or Radix Dialog's event handling.

### 2. Konva bufferCanvas crash (critical)
**Problem:** `Uncaught TypeError: Cannot read properties of null (reading 'bufferCanvas')` crashed Konva rendering after first successful draw.
**Root cause:** `stageRef.current?.destroy()` in useEffect cleanup conflicted with React strict mode's double-invoke of effects. Destroying the stage left Line shapes detached from their layer — when Konva tried to draw them, `getLayer()` returned null.
**Fix:** Removed manual destroy call. react-konva manages its own Konva lifecycle internally. Added defensive guards on Line/Arrow rendering to skip elements with empty/invalid points arrays.

### 3. Disconnected hook instances
**Problem:** ShapesTool component called `useShapesTool()` internally, creating separate state from the instance in EzyDrawStage.
**Fix:** Refactored to single hook instance in stage, passing preview state as props to ShapesToolPreview component.

## Files Created/Modified

### Created
- `src/lib/drawing/export.ts` - PNG export utility using stage.toDataURL with UI layer hiding

### Modified
- `src/components/ezydraw/ezydraw-stage.tsx` - Major refactor: React synthetic events, removed stage.destroy(), defensive rendering guards, single hook instances for tools
- `src/components/ezydraw/ezydraw-modal.tsx` - Fullscreen dialog fixes (sm:max-w-[100vw])
- `src/components/ezydraw/toolbar.tsx` - Changed from fixed positioning to flex item, wired undo/redo/clear
- `src/components/ezydraw/tools/pencil-tool.tsx` - Refactored to hook + preview pattern accepting PointerData
- `src/components/ezydraw/tools/shapes-tool.tsx` - Refactored to hook + preview accepting props instead of internal hook
- `src/components/layout/workshop-header.tsx` - Added temporary EzyDraw test button

## Deviations from Plan

- **Event system rewrite:** Plan assumed react-konva events would work. Required fundamental switch to React synthetic events on wrapper div.
- **Stage lifecycle fix:** Plan specified "canvas memory cleaned up on modal close (destroy called)." Removed destroy call to fix crash — react-konva handles cleanup internally.
- **Tool hook refactor:** Plan didn't anticipate needing to refactor pencil-tool and shapes-tool hooks to accept PointerData instead of KonvaEventObject.

## Next Phase Readiness

**Ready for Phase 26 (Drawing-Canvas Integration):**
- EzyDraw modal fully functional with all 9 tools
- PNG export working via exportToPNG()
- Stage ref exposed via forwardRef + useImperativeHandle
- onSave callback passes data URL to consumer
- Foundation for re-edit: vector state in Zustand store, PNG on save

---

## Self-Check: PASSED

Verified:
- All drawing tools functional (pencil, rectangle, circle, arrow, line, diamond, text, select, eraser)
- Undo/redo working with keyboard shortcuts and toolbar buttons
- PNG export generates valid data URL
- Clear canvas shows confirmation dialog
- Human verification passed

---
*Phase: 25-ezydraw-foundation*
*Plan: 06*
*Completed: 2026-02-12*
