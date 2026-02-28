---
phase: 57-guest-auth-and-join-flow
plan: 02
subsystem: auth, multiplayer
tags: [liveblocks, guest-auth, lobby, polling, reconnection, next.js, drizzle]

# Dependency graph
requires:
  - phase: 57-01
    provides: verifyGuestCookie, COOKIE_NAME, sessionParticipants records with liveblocksUserId/color/displayName
  - phase: 54-liveblocks-foundation
    provides: workshopSessions, sessionParticipants schema, getLiveblocksClient pattern
  - phase: 55-multiplayer-canvas
    provides: MultiplayerRoom component, multiplayer-room.tsx structure
provides:
  - Guest path in /api/liveblocks-auth: HMAC-verified cookie → Liveblocks token with role:'participant'
  - GET /api/session-status/[token]: public polling endpoint returns status, workshop title, participant list
  - GuestLobby component: 3s polling, live participant list, fade-out auto-transition to canvas
  - ReconnectionListener: toast-based disconnect/reconnect/failure UX inside MultiplayerRoom
  - proxy.ts allows guest access to all /workshop/:path*/step/:stepId pages
affects:
  - Phase 57 completion: full guest join experience (Plan 01 name entry + Plan 02 lobby/canvas)
  - Phase 58: AI facilitation for multiplayer workshops

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Shared request body parsing pattern: request.json() called once at top of POST handler, both Clerk and guest paths share parsed value
    - Public polling endpoint pattern: no-auth GET endpoint with Cache-Control: no-store for lobby freshness
    - Renderless component pattern: ReconnectionListener and JoinLeaveListener in same file, rendered inside RoomProvider tree
    - Ref-based toast ID tracking: useRef for toast ID in ReconnectionListener to dismiss/replace toasts across events
    - Fade-out transition pattern: transitioning state → opacity-0 class → 500ms timeout → router.push

key-files:
  created:
    - src/components/guest/guest-lobby.tsx
    - src/app/api/session-status/[token]/route.ts
  modified:
    - src/app/api/liveblocks-auth/route.ts
    - src/app/join/[token]/page.tsx
    - src/app/join/[token]/guest-join-flow.tsx
    - src/components/workshop/multiplayer-room.tsx
    - src/lib/liveblocks/config.ts
    - src/proxy.ts

key-decisions:
  - "Request body parsed once at top of /api/liveblocks-auth handler — request.json() can only be called once; both Clerk path and guest path share the parsed room value"
  - "proxy.ts /workshop/:path*/step/:stepId added to isPublicRoute for guest canvas access — safe because workshop page requires valid session ID and Liveblocks room requires valid token"
  - "3-second polling interval for lobby — balances freshness vs. server load for 2-5 person sessions"
  - "lostConnectionTimeout: 30_000 in createClient matches user decision of 30+ seconds before 'failed' event fires"
  - "Late joiners auto-redirect after 2 seconds to provide visual feedback before abrupt navigation"

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 57 Plan 02: Guest Auth, Lobby, and Reconnection Summary

**Guest Liveblocks auth via HMAC-verified cookie, real-time lobby with 3s polling and fade-out auto-transition to canvas, and renderless ReconnectionListener with toast-based disconnect/reconnect feedback**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-27T10:28:44Z
- **Completed:** 2026-02-27T10:32:43Z
- **Tasks:** 2
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments

- `/api/liveblocks-auth` now handles guests: reads `wp_guest` HttpOnly cookie, verifies HMAC-SHA256 signature via `verifyGuestCookie`, looks up `sessionParticipants` record, issues Liveblocks token with `role: 'participant'` — no Clerk required
- Restructured handler to parse `request.json()` once at the top (request body can only be read once); both Clerk path and guest path share the parsed `room` value
- Created `/api/session-status/[token]` public polling endpoint: returns `{ status, workshopTitle, participantCount, participants }` with `Cache-Control: no-store`
- `GuestLobby` component polls every 3 seconds, shows live participant list with color avatars and "You" badge, "Waiting for facilitator" / "Workshop in progress" status, CSS-only pulse/bounce animations
- Auto-transition: when `status` becomes `'active'`, interval clears, `transitioning` state triggers `opacity-0` CSS fade, then `router.push` navigates to canvas after 500ms
- Late joiner path: if `initialStatus === 'active'` on mount, shows "Workshop in progress..." for 2 seconds then redirects
- `ReconnectionListener` renderless component added to `MultiplayerRoomInner` alongside `JoinLeaveListener` — uses `useLostConnectionListener` to show "Reconnecting..." (persistent), "Reconnected" (3s), or "Connection lost. Refresh to rejoin." (persistent error) toasts
- `lostConnectionTimeout: 30_000` added to `createClient()` in `config.ts` — 30s before `failed` event fires per user decision (INFR-03)
- `proxy.ts` updated to add `/workshop/:path*/step/:stepId` to public routes, enabling guest canvas access without Clerk redirect

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement guest Liveblocks auth path and session status endpoint** - `7d6dec6` (feat)
2. **Task 2: Build GuestLobby with auto-transition and ReconnectionListener** - `ec09808` (feat)

## Files Created/Modified

- `src/app/api/liveblocks-auth/route.ts` — Added guest path: cookie read → HMAC verify → DB participant lookup → Liveblocks token issuance; moved body parse to top of handler
- `src/app/api/session-status/[token]/route.ts` — New public GET endpoint: workshopSessions join workshop, active sessionParticipants query, returns status + participants with no-store headers
- `src/components/guest/guest-lobby.tsx` — New GuestLobby 'use client' component: 3s polling, participant list with color avatars + role badges + "You" badge, pulse/bounce CSS animations, fade-out auto-transition, late-joiner path, 3-failure toast warning
- `src/app/join/[token]/page.tsx` — Added AI session and active workshopStep queries; passes `aiSessionId` and `currentStepOrder` to GuestJoinFlow
- `src/app/join/[token]/guest-join-flow.tsx` — Replaced placeholder "joined" state with `<GuestLobby>` render; added `aiSessionId` and `currentStepOrder` props; removed unused `sessionId` from destructuring
- `src/components/workshop/multiplayer-room.tsx` — Added `ReconnectionListener` renderless component with `useLostConnectionListener` and `useRef` for toast ID tracking; rendered inside `MultiplayerRoomInner`
- `src/lib/liveblocks/config.ts` — Added `lostConnectionTimeout: 30_000` to `createClient()` options
- `src/proxy.ts` — Added `/workshop/:path*/step/:stepId` to `isPublicRoute` for guest canvas access

## Decisions Made

- Request body parsed once at top of `/api/liveblocks-auth` POST handler — `request.json()` is a streaming read that can only be called once; both auth paths share the result
- `/workshop/:path*/step/:stepId` added to `isPublicRoute` — without this, Clerk redirects guests to sign-in when the lobby transitions to the canvas; safe because the workshop page requires a valid session ID and Liveblocks requires a valid token
- 3-second polling interval for the lobby — balanced for 2-5 person sessions; reduces server load vs. 1s while staying responsive enough that participants see others join within ~3 seconds
- `lostConnectionTimeout: 30_000` set to 30s to match user decision that "extended failure" threshold is 30+ seconds
- Late joiners auto-redirect after 2 seconds to show the "Workshop in progress..." message briefly as visual feedback before navigation

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Self-Check: PASSED

**Files verified:**
- `src/components/guest/guest-lobby.tsx` — FOUND
- `src/app/api/session-status/[token]/route.ts` — FOUND
- `src/app/api/liveblocks-auth/route.ts` — FOUND (modified)
- `src/components/workshop/multiplayer-room.tsx` — FOUND (modified)
- `src/lib/liveblocks/config.ts` — FOUND (modified)

**Commits verified:**
- `7d6dec6` — Task 1 commit FOUND
- `ec09808` — Task 2 commit FOUND

---
*Phase: 57-guest-auth-and-join-flow*
*Completed: 2026-02-27*
