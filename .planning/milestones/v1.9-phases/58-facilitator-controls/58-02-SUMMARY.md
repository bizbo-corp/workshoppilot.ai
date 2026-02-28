---
phase: 58-facilitator-controls
plan: 02
subsystem: ui
tags: [liveblocks, react, multiplayer, websockets, web-audio-api, react-flow, drizzle]

# Dependency graph
requires:
  - phase: 58-01
    provides: RoomEvent types (VIEWPORT_SYNC, TIMER_UPDATE, SESSION_ENDED), isFacilitator context, RoomProvider tree structure
provides:
  - Facilitator viewport sync (broadcasts current ReactFlow viewport to all participants with 500ms animation)
  - Countdown timer system (facilitator-side controls + participant-side display via TIMER_UPDATE broadcasts)
  - Session end flow (endWorkshopSession server action, confirmation modal, canvas snapshot, SESSION_ENDED broadcast)
  - SessionEndedOverlay (full-screen overlay for participants with "Return to Dashboard")
  - Facilitator crown badge in collapsed presence bar avatar stack
affects: [any future facilitator features, multiplayer room features, step-container]

# Tech tracking
tech-stack:
  added: [Web Audio API (zero-bundle chime synthesis)]
  patterns: [Custom DOM event bridge for ReactFlow cross-component communication, Renderless listener components inside RoomProvider]

key-files:
  created:
    - src/actions/session-actions.ts
    - src/components/workshop/facilitator-controls.tsx
    - src/components/workshop/countdown-timer.tsx
    - src/components/workshop/session-ended-overlay.tsx
  modified:
    - src/components/workshop/multiplayer-room.tsx
    - src/components/workshop/step-container.tsx
    - src/components/canvas/react-flow-canvas.tsx
    - src/components/workshop/presence-bar.tsx

key-decisions:
  - "Custom DOM event bridge ('facilitator-viewport-sync') chosen for viewport sync — avoids threading getViewport() through multiple prop layers; FacilitatorControls dispatches, FacilitatorViewportCapture inside ReactFlow tree receives and broadcasts"
  - "FacilitatorViewportCapture and ViewportSyncReceiver placed inside ReactFlowCanvasInner (inside ReactFlowProvider) — only location where useReactFlow() is available"
  - "SessionEndedListener placed in MultiplayerRoomInner — does not need ReactFlow access, just renders an overlay on SESSION_ENDED event"
  - "CountdownTimer is participant-only display — facilitator manages timer state locally in FacilitatorControls to avoid state sync complexity"
  - "endWorkshopSession snapshots canvas via Liveblocks REST API (same pattern as webhook), but never throws on snapshot failure — session must always end regardless of canvas state"
  - "SESSION_ENDED broadcast fires client-side after endWorkshopSession returns — ensures Neon write is committed before participants react"

patterns-established:
  - "DOM event bridge pattern for cross-hierarchy ReactFlow communication: component A dispatches document event, component B (inside ReactFlow tree) handles it"
  - "Listener components gated by workshopType === 'multiplayer' so Liveblocks hooks never execute in solo mode"

requirements-completed: [FACL-03, FACL-04, FACL-05, SESS-05]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 58 Plan 02: Facilitator Controls — Viewport Sync, Timer, Session End Summary

**Viewport sync via DOM event bridge, countdown timer with Web Audio chime, session end flow with Liveblocks canvas snapshot and full-screen participant overlay**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-27T23:53:23Z
- **Completed:** 2026-02-27T23:57:44Z
- **Tasks:** 2
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments
- `endWorkshopSession` server action: auth check, Liveblocks REST API canvas snapshot, marks workshopSessions.status = 'ended' — mirrors existing webhook upsert pattern
- `FacilitatorControls` toolbar: viewport sync button, countdown timer with 1/3/5/10min presets + custom input + pause/resume/cancel, End Session with confirmation dialog
- `CountdownTimer`: participant-side display driven by TIMER_UPDATE broadcasts, local 1s interval for smooth countdown between broadcasts
- `SessionEndedOverlay`: full-screen overlay on SESSION_ENDED broadcast; facilitator redirects to workshop detail page instead
- `FacilitatorViewportCapture` + `ViewportSyncReceiver` inside `ReactFlowCanvasInner`: viewport sync bridge using custom DOM event so getViewport()/setViewport() are available
- Crown badge on facilitator avatar in collapsed presence bar (was already in expanded list, now also in avatar stack)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create endWorkshopSession, FacilitatorControls, SessionEndedOverlay** - `d9638f9` (feat)
2. **Task 2: Wire CountdownTimer, viewport sync, session end flow, presence bar** - `4e898dc` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified
- `src/actions/session-actions.ts` - endWorkshopSession server action (auth, snapshot, DB update)
- `src/components/workshop/facilitator-controls.tsx` - Viewport sync, timer, end session toolbar (facilitator-only)
- `src/components/workshop/countdown-timer.tsx` - Participant-side timer display via TIMER_UPDATE broadcast
- `src/components/workshop/session-ended-overlay.tsx` - Full-screen overlay for participants on session end
- `src/components/workshop/multiplayer-room.tsx` - Added SessionEndedListener and CountdownTimer to room tree
- `src/components/workshop/step-container.tsx` - Added FacilitatorControls render alongside StepAdvanceBroadcaster
- `src/components/canvas/react-flow-canvas.tsx` - Added FacilitatorViewportCapture and ViewportSyncReceiver inside ReactFlowProvider
- `src/components/workshop/presence-bar.tsx` - Crown badge on facilitator avatar in collapsed stack

## Decisions Made
- Custom DOM event bridge for viewport sync: `FacilitatorControls` dispatches `new Event('facilitator-viewport-sync')` on document; `FacilitatorViewportCapture` (inside ReactFlow tree) listens and calls `getViewport()` + `useBroadcastEvent()`. Avoids prop-threading `getViewport` through 4+ component levels.
- `FacilitatorViewportCapture` and `ViewportSyncReceiver` placed inside `ReactFlowCanvasInner` (inside `ReactFlowProvider`) — this is the only tree location where `useReactFlow()` is callable without throwing.
- Canvas snapshot in `endWorkshopSession` never throws — session end must succeed even if Liveblocks REST API is unavailable.
- `SESSION_ENDED` broadcast fires client-side after the server action returns to guarantee Neon write is committed before participants see the overlay.

## Deviations from Plan

None — plan executed exactly as written. The plan itself provided extensive discussion of the viewport sync architecture problem and arrived at the custom DOM event bridge approach, which was implemented as specified.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 58 Plan 02 complete — all facilitator controls fully functional
- Phase 58 is the final phase in v1.9 Multiplayer Collaboration
- Full stack: RoomEvent types, isFacilitator context, StepNav gate, ChatPanel read-only, viewport sync, countdown timer, session end flow, presence bar facilitator indicator
- Ready for milestone completion/UAT

---
*Phase: 58-facilitator-controls*
*Completed: 2026-02-27*
