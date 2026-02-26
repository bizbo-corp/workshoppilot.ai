---
phase: 56-live-presence
plan: 01
subsystem: ui
tags: [liveblocks, reactflow, multiplayer, presence, cursors, real-time]

# Dependency graph
requires:
  - phase: 55-core-canvas-sync
    provides: RoomProvider tree, MultiplayerContext, Liveblocks Presence type with cursor field, ReactFlowCanvasInner with workshopType prop
  - phase: 54-liveblocks-foundation
    provides: liveblocksClient createClient, UserMeta with name/color/role, global Liveblocks type augmentation
provides:
  - Live cursor broadcasting: CursorBroadcaster populates handlersRef on mount; ReactFlow onMouseMove/onMouseLeave delegate to ref
  - Live cursor rendering: LiveCursors renders remote cursors inside ViewportPortal in flow coordinates
  - Facilitator cursor distinction: Crown icon in CursorLabel for role === 'owner'
  - 50ms throttle: createClient configured with throttle: 50 for PRES-01 compliance
affects:
  - 56-live-presence/56-02 (participant roster, avatar list — same Presence type)
  - 57-session-management (guest auth flow affects UserMeta.info.name displayed in cursor labels)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ref-based handler bridge: CursorBroadcaster populates a MutableRefObject with mouse handlers; parent ReactFlow reads from ref via optional chaining (no-op when null in solo mode) — avoids conditional hook violations"
    - "ViewportPortal for flow-coordinate overlays: remote cursors mounted inside ViewportPortal so they track pan/zoom without coordinate conversion"
    - "CSS transition for cursor smoothing: 80ms linear transform transition provides smooth interpolation between 50ms presence updates, zero dependencies"

key-files:
  created:
    - src/components/canvas/live-cursors.tsx
  modified:
    - src/lib/liveblocks/config.ts
    - src/components/canvas/react-flow-canvas.tsx

key-decisions:
  - "Ref-based handler bridge chosen over custom hook for CursorBroadcaster — hook approach would require conditional calling (violates React rules); component-conditional-mount approach is safe since CursorBroadcaster only mounts when RoomProvider is active"
  - "80ms CSS transition chosen for cursor smoothing — zero-dependency, works well with 50ms presence update rate, no interpolation library needed"
  - "throttle: 50 on createClient caps all presence broadcasts at 20fps — sufficient for 6-person sessions per research, avoids Liveblocks rate limit exposure"

patterns-established:
  - "Multiplayer-conditional component mount: {workshopType === 'multiplayer' && <Component />} — ensures Liveblocks hooks only called inside RoomProvider tree"
  - "cursorHandlersRef pattern for ReactFlow mouse event delegation: ref starts null (solo no-op), populated by CursorBroadcaster on mount"

requirements-completed: [PRES-01, PRES-02, PRES-05]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 56 Plan 01: Live Presence Summary

**Liveblocks cursor presence layer with colored SVG arrows, crown-badged facilitator, and flow-coordinate rendering inside ViewportPortal at 50ms throttle**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T21:08:49Z
- **Completed:** 2026-02-26T21:10:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `live-cursors.tsx` with `CursorBroadcaster` (renderless, wires mouse handlers via ref) and `LiveCursors` (renders remote cursors in ViewportPortal using `useOthersMapped` + `shallow`)
- Wired both components conditionally into `ReactFlowCanvasInner` for multiplayer-only mounting — solo workshops completely unaffected
- Configured `throttle: 50` on `createClient` for PRES-01 compliance (50ms = 20fps broadcast rate)
- Facilitator cursors distinguished with Crown icon in the colored name-pill label

## Task Commits

Each task was committed atomically:

1. **Task 1: Add throttle to Liveblocks createClient** - `62cc933` (chore)
2. **Task 2: Create LiveCursors and CursorBroadcaster, wire into ReactFlowCanvasInner** - `60a2f26` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/canvas/live-cursors.tsx` - CursorBroadcaster (renderless handler bridge), LiveCursors (ViewportPortal renderer), CursorArrow (SVG), CursorLabel (colored pill + Crown)
- `src/lib/liveblocks/config.ts` - Added `throttle: 50` to createClient
- `src/components/canvas/react-flow-canvas.tsx` - Import + cursorHandlersRef + CursorBroadcaster/LiveCursors conditional mounts + ReactFlow onMouseMove/onMouseLeave delegation

## Decisions Made
- **Ref-based handler bridge for CursorBroadcaster:** A custom hook approach would require conditional calling (violates React rules). Component-conditional-mount with a MutableRefObject is safe — CursorBroadcaster only mounts inside the RoomProvider tree when `workshopType === 'multiplayer'`, and `cursorHandlersRef.current` is null in solo mode so `?.` calls are no-ops.
- **80ms CSS transition for smoothing:** Zero-dependency approach. At 50ms update rate, 80ms linear interpolation provides visually smooth cursor tracking without any interpolation library.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Live cursor presence fully functional for multiplayer workshops
- `useOthersMapped` pattern with `shallow` established for Plan 02 (participant roster/avatar list)
- `CursorLabel` colored-pill pattern can be reused in roster avatars

---
*Phase: 56-live-presence*
*Completed: 2026-02-27*
