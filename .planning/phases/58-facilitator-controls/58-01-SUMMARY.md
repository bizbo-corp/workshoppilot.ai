---
phase: 58-facilitator-controls
plan: 01
subsystem: ui
tags: [liveblocks, multiplayer, real-time, react, websocket, step-navigation, chat]

# Dependency graph
requires:
  - phase: 57-guest-auth
    provides: Guest auth, ReconnectionListener, GuestLobby polling — establishes multiplayer session infrastructure
  - phase: 56-live-presence
    provides: MultiplayerRoom, MultiplayerContext, PresenceBar — provides the context system being extended
  - phase: 54-liveblocks-foundation
    provides: Liveblocks config, global type augmentation, UserMeta with role field
provides:
  - RoomEvent union type in Liveblocks global interface (STEP_CHANGED, VIEWPORT_SYNC, TIMER_UPDATE, SESSION_ENDED)
  - isFacilitator boolean in MultiplayerContext derived from useSelf().info.role === 'owner'
  - StepChangedListener — routes participants to new step on STEP_CHANGED broadcast with 1s toast delay
  - StepAdvanceBroadcaster — bridges useBroadcastEvent to StepContainer via ref (safe solo/multiplayer split)
  - StepNavigation gated to facilitator only in multiplayer (participants see no nav buttons)
  - ChatPanel read-only mode for participants (no input, no confirm/revise, no auto-start)
  - Server-side ownership check in advanceToNextStep rejects non-owner Clerk users
affects: [58-02, 58-03, future-broadcast-events, timer-controls, viewport-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "StepAdvanceBroadcaster renderless component pattern — conditional mount (not conditional hook call) for Liveblocks hooks that require RoomProvider"
    - "Broadcast-ref bridge — expose useBroadcastEvent result via React.useRef for use in parent callbacks without violating hook rules"
    - "isFacilitator from context — role-based UI gating derived from Liveblocks UserMeta.info.role === 'owner'"
    - "Defense-in-depth broadcast guard — !isFacilitator check in StepChangedListener even though sender never receives own events"

key-files:
  created: []
  modified:
    - src/lib/liveblocks/config.ts
    - src/components/workshop/multiplayer-room.tsx
    - src/components/workshop/multiplayer-room-loader.tsx
    - src/components/workshop/step-container.tsx
    - src/components/workshop/step-navigation.tsx
    - src/components/workshop/chat-panel.tsx
    - src/actions/workshop-actions.ts
    - src/app/workshop/[sessionId]/step/[stepId]/page.tsx

key-decisions:
  - "StepAdvanceBroadcaster pattern chosen over conditional hook call — React hook rules prohibit calling useBroadcastEvent conditionally; conditionally MOUNTING a component that calls the hook is safe and correct"
  - "sessionId threaded through MultiplayerRoomLoader to MultiplayerRoom to enable StepChangedListener navigation"
  - "All four RoomEvent types defined upfront in config.ts to avoid re-opening the file in Phase 58 Plans 02-03"
  - "Server ownership check uses two DB queries to avoid JOIN — reads workshopType first, then checks ownership only for multiplayer workshops"
  - "isFacilitator defaults to false in MultiplayerContext — participants never see facilitator UI flash before Liveblocks resolves"

patterns-established:
  - "Conditional component mount pattern for Liveblocks hooks outside guaranteed RoomProvider"
  - "isReadOnly = isMultiplayer && !isFacilitator for read-only participant UI gating"

requirements-completed: [FACL-01, FACL-02]

# Metrics
duration: 25min
completed: 2026-02-28
---

# Phase 58 Plan 01: Facilitator Controls — Step Nav Gate and Chat Read-Only Summary

**Role-gated multiplayer UI: participants cannot advance steps or send AI messages — STEP_CHANGED broadcast navigates participants with 1s toast delay, server action rejects non-owner step advancement**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-28T00:00:00Z
- **Completed:** 2026-02-28T00:25:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Added RoomEvent union type (4 events) to global Liveblocks interface — all Phase 58 broadcast events defined upfront
- Extended MultiplayerContext with isFacilitator derived from Liveblocks UserMeta role, with StepChangedListener navigating participants
- Gated both StepNavigation render sites (mobile + desktop) to facilitator only, with StepAdvanceBroadcaster bridging the hook
- Made ChatPanel fully read-only for participants: input, rate limit banner, confirm/revise buttons, auto-start, and focus all gated
- Server-side ownership check in advanceToNextStep rejects non-owner Clerk users for multiplayer workshops

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RoomEvent to Liveblocks config and extend MultiplayerContext** - `2f396cb` (feat)
2. **Task 2: Gate step navigation to facilitator and add server-side auth check** - `c8d6eb1` (feat)
3. **Task 3: Make ChatPanel read-only for participants** - `301c8e6` (feat)

## Files Created/Modified
- `src/lib/liveblocks/config.ts` — Added RoomEvent union type to global Liveblocks interface
- `src/components/workshop/multiplayer-room.tsx` — Added isFacilitator to context, StepChangedListener component, sessionId prop threading
- `src/components/workshop/multiplayer-room-loader.tsx` — Added sessionId prop and pass-through
- `src/components/workshop/step-container.tsx` — Added useMultiplayerContext, StepAdvanceBroadcaster, isFacilitator/isMultiplayer gates on StepNavigation
- `src/components/workshop/step-navigation.tsx` — Added onBeforeAdvance callback prop, called before advanceToNextStep
- `src/components/workshop/chat-panel.tsx` — Added isReadOnly mode: hides input, rate limit banner, confirm buttons, prevents auto-start and focus
- `src/actions/workshop-actions.ts` — Added server-side ownership check rejecting non-owner Clerk users for multiplayer workshops
- `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` — Added sessionId prop to MultiplayerRoomLoader

## Decisions Made
- StepAdvanceBroadcaster pattern (conditional mount not conditional hook) chosen for hook rule compliance
- All 4 RoomEvent types (STEP_CHANGED, VIEWPORT_SYNC, TIMER_UPDATE, SESSION_ENDED) defined upfront in config.ts to avoid reopening it in Plans 02-03
- sessionId threaded from page through loader to MultiplayerRoom to enable StepChangedListener routing
- Server ownership uses 2 queries (workshopType check then ownership check) — only runs for multiplayer workshops
- isFacilitator defaults false in context so participants never see facilitator UI flash on room connection

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None — TypeScript passed cleanly on first attempt for all three tasks. Build passed on first run.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 58 Plan 02 can implement TIMER_UPDATE and VIEWPORT_SYNC broadcast events — RoomEvent types already defined
- isFacilitator is available via useMultiplayerContext() for any future facilitator-only controls
- All multiplayer gating infrastructure is in place

---
*Phase: 58-facilitator-controls*
*Completed: 2026-02-28*
