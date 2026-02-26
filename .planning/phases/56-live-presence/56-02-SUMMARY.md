---
phase: 56-live-presence
plan: 02
subsystem: multiplayer-presence
tags: [liveblocks, presence, avatar-stack, idle-detection, toast-notifications]
dependency_graph:
  requires: [56-01]
  provides: [presence-bar, join-leave-toasts]
  affects: [multiplayer-room]
tech_stack:
  added: []
  patterns: [useOthersListener, useOthers-selector-with-shallow, fixed-overlay-component]
key_files:
  created:
    - src/components/workshop/presence-bar.tsx
  modified:
    - src/components/workshop/multiplayer-room.tsx
decisions:
  - "Fixed top-right positioning (z-50) chosen so PresenceBar floats above all canvas panels regardless of layout"
  - "useIdleStatus hook tracks cursor-based activity only — non-cursor presence updates (e.g. editingDrawingNodeId) do not reset idle timer"
  - "JoinLeaveListener kept in multiplayer-room.tsx (not presence-bar.tsx) to isolate toast concerns from display concerns"
  - "Self is never shown as idle — idle status only applies to others"
metrics:
  duration: "~10 minutes"
  completed: "2026-02-27"
  tasks: 2
  files: 2
---

# Phase 56 Plan 02: Presence Bar and Join/Leave Notifications Summary

**One-liner:** Avatar stack with idle detection and join/leave toasts using Liveblocks useOthers/useOthersListener hooks wired into MultiplayerRoomInner.

## What Was Built

### PresenceBar component (`src/components/workshop/presence-bar.tsx`)

A fixed top-right overlay component that shows all connected workshop participants as an avatar stack. Key features:

- **Avatar stack:** Overlapping colored circles with two-letter initials (`-space-x-1` overlap, `ring-2 ring-background` separation). Self shown first.
- **Expanded list:** Click toggles a dropdown card with full name, online/idle dot, and a Crown icon for the facilitator (role=owner). Closes on click-outside via `mousedown` document listener.
- **Idle detection:** `useIdleStatus` custom hook tracks cursor activity per connectionId. Idle threshold = 2 minutes (120,000ms). Re-evaluated every 30 seconds via `setInterval`. Idle participants show 50% opacity avatar and a yellow dot.
- **Liveblocks integration:** `useOthers` with selector + `shallow` equality for memo-safe re-renders; `useSelf` for current user; `useOthersListener` for enter/leave/update events.

### JoinLeaveListener + wiring (`src/components/workshop/multiplayer-room.tsx`)

- **JoinLeaveListener:** Renderless component (`return null`) that uses `useOthersListener` to fire `toast('Name joined', { duration: 3000 })` and `toast('Name left', { duration: 3000 })` on enter/leave events. Plain `toast()` (neutral style) per context decision; no batching.
- **MultiplayerRoomInner updated:** Now renders `<PresenceBar />` and `<JoinLeaveListener />` as siblings before `{children}`, both inside the RoomProvider tree.
- **Solo workshops unaffected:** Both components only mount when `MultiplayerRoom` is used (workshopType === 'multiplayer').

## Verification Results

1. `npx tsc --noEmit` — PASS (zero type errors)
2. `presence-bar.tsx` exports `PresenceBar` with avatar stack and expanded list — CONFIRMED
3. `useOthers`, `useSelf`, `useOthersListener` all used correctly — CONFIRMED
4. IDLE_THRESHOLD_MS = 120,000ms, interval = 30,000ms — CONFIRMED
5. `JoinLeaveListener` uses `useOthersListener` on enter/leave — CONFIRMED
6. `toast()` with `duration: 3000` — CONFIRMED
7. Both rendered inside `MultiplayerRoomInner` — CONFIRMED
8. Crown icon for role === 'owner' — CONFIRMED
9. Solo workshops unchanged — CONFIRMED

## Deviations from Plan

None - plan executed exactly as written.

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create PresenceBar component with avatar stack, expanded list, and idle detection | c7fd4c5 |
| 2 | Wire PresenceBar and JoinLeaveListener into MultiplayerRoomInner | 32ecda0 |

## Self-Check: PASSED

- [x] `src/components/workshop/presence-bar.tsx` — FOUND
- [x] `src/components/workshop/multiplayer-room.tsx` modified — CONFIRMED
- [x] Commit c7fd4c5 — FOUND
- [x] Commit 32ecda0 — FOUND
- [x] TypeScript compiles cleanly — CONFIRMED
