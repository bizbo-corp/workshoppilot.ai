---
phase: 57-guest-auth-and-join-flow
plan: 01
subsystem: auth
tags: [hmac, cookie, guest-auth, multiplayer, share-link, next.js, drizzle]

# Dependency graph
requires:
  - phase: 54-liveblocks-foundation
    provides: workshopSessions and sessionParticipants schema tables, PARTICIPANT_COLORS
  - phase: 55-multiplayer-canvas
    provides: workshopType field on workshops, shareToken on workshopSessions
provides:
  - HMAC-SHA256 signed HttpOnly guest cookie utility (signGuestCookie / verifyGuestCookie)
  - POST /api/guest-join endpoint: validates shareToken, creates sessionParticipant, sets 8-hour cookie
  - /join/[token] RSC page with server-side token validation
  - GuestJoinModal: full-screen overlay name entry (2-30 chars, blocks all workshop content)
  - GuestJoinFlow: sessionStorage-backed auto-rejoin for page refresh recovery
  - ShareButton in WorkshopHeader for multiplayer workshops (clipboard copy + sonner toast)
  - Clerk middleware updated: /join(.*), /api/guest-join, /api/session-status(.*) all public
affects:
  - 57-02: Liveblocks guest auth reads the wp_guest cookie via verifyGuestCookie
  - Plan 02: lobby real-time presence replaces the static "Waiting for facilitator" placeholder

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HMAC-SHA256 cookie signing using Node.js built-in crypto (no external library)
    - timingSafeEqual for timing-attack-safe signature comparison
    - sessionStorage for browser-tab-scoped guest name persistence (auto-rejoin)
    - GuestJoinFlow state machine: loading → modal | auto_rejoining → joined

key-files:
  created:
    - src/lib/auth/guest-cookie.ts
    - src/app/api/guest-join/route.ts
    - src/app/join/[token]/page.tsx
    - src/app/join/[token]/guest-join-flow.tsx
    - src/components/guest/guest-join-modal.tsx
  modified:
    - src/proxy.ts
    - src/components/layout/workshop-header.tsx
    - src/app/workshop/[sessionId]/layout.tsx

key-decisions:
  - "Node.js built-in crypto used for HMAC-SHA256 cookie signing — no jose/iron-session overhead"
  - "sameSite: 'lax' on guest cookie — 'strict' drops the cookie on navigation from the external share link"
  - "sessionStorage (not localStorage) for guest name persistence — tab-scoped, clears on tab close"
  - "GuestJoinFlow auto-rejoin re-calls /api/guest-join rather than trusting the cookie alone — handles cookie expiry"
  - "Label component not available in UI kit — plain HTML label element used in GuestJoinModal"
  - "workshopSession fetched in layout only for multiplayer workshops to avoid unnecessary DB queries for solo workshops"

patterns-established:
  - "Guest identity pattern: HttpOnly signed cookie (wp_guest) + sessionStorage name cache"
  - "ShareButton inline component pattern: state-only Share2/Check icon swap with sonner toast feedback"
  - "RSC token validation + client join flow split: RSC validates, GuestJoinFlow manages interactive state"

requirements-completed: [SESS-02, SESS-03, INFR-04]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 57 Plan 01: Guest Auth and Join Flow Summary

**HttpOnly HMAC-SHA256 guest cookie auth with /join/[token] RSC page, GuestJoinModal full-screen overlay, sessionStorage auto-rejoin, and multiplayer ShareButton in workshop header**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-27T00:01:29Z
- **Completed:** 2026-02-27T00:05:36Z
- **Tasks:** 2
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments

- Guest identity established via HMAC-SHA256 signed HttpOnly cookie using Node.js crypto (no extra package) — token is `base64url(JSON).base64url(sig)` for URL-safe storage
- `/join/[token]` RSC validates shareToken server-side; GuestJoinFlow client component manages loading, name-entry modal, auto-rejoin from sessionStorage, and post-join lobby state
- ShareButton added to WorkshopHeader (conditional on `workshopType === 'multiplayer'`) with clipboard copy and sonner toast feedback
- Clerk middleware updated to pass /join(.*), /api/guest-join, and /api/session-status(.*) without redirecting guests to sign-in

## Task Commits

Each task was committed atomically:

1. **Task 1: Create guest cookie utility and /api/guest-join endpoint** - `c0b2415` (feat)
2. **Task 2: Build /join/[token] page with GuestJoinModal and ShareButton** - `280f555` (feat)

**Plan metadata:** (to be committed with this SUMMARY)

## Files Created/Modified

- `src/lib/auth/guest-cookie.ts` — HMAC-SHA256 cookie sign/verify using Node.js crypto; exports signGuestCookie, verifyGuestCookie, COOKIE_NAME, GuestCookiePayload
- `src/app/api/guest-join/route.ts` — POST endpoint: validates shareToken + displayName (2-30 chars), creates sessionParticipants record with color slot, sets 8-hour HttpOnly sameSite=lax cookie
- `src/app/join/[token]/page.tsx` — RSC: queries workshopSessions by shareToken via Drizzle, fetches facilitator name, renders GuestJoinFlow
- `src/app/join/[token]/guest-join-flow.tsx` — client component: sessionStorage auto-rejoin on mount, shows GuestJoinModal or lobby placeholder
- `src/components/guest/guest-join-modal.tsx` — full-screen overlay (bg-black/60 backdrop-blur-sm), workshop title + facilitator name, name input, Join Workshop button with Loader2 spinner
- `src/proxy.ts` — added /join(.*), /api/guest-join, /api/session-status(.*) to isPublicRoute
- `src/components/layout/workshop-header.tsx` — added ShareButton (inline component), Share2/Check icons, sonner toast; renders when workshopType === 'multiplayer' && shareToken
- `src/app/workshop/[sessionId]/layout.tsx` — fetch workshopSession for multiplayer workshops; pass shareToken + workshopType to WorkshopHeader

## Decisions Made

- Node.js built-in `crypto` used instead of `jose` or `iron-session` — sufficient for HMAC-SHA256, no external dependency
- `sameSite: 'lax'` on the guest cookie — `sameSite: 'strict'` would silently drop the cookie on the initial navigation from the share link (cross-origin top-level navigation), breaking first-load auth
- `sessionStorage` for name persistence (not `localStorage`) — tab-scoped aligns with session semantics; closing the tab clears identity
- Auto-rejoin re-calls `/api/guest-join` rather than trusting the existing cookie — handles expired cookies and creates a fresh participant record cleanly
- `Label` component not in UI kit — plain `<label>` HTML element used with equivalent Tailwind classes
- workshopSession DB query in layout wrapped in `if (workshopType === 'multiplayer')` guard — avoids unnecessary DB round-trip for solo workshops

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.**

The guest cookie signing requires a secret key:

```bash
# Generate a 32-byte random secret
openssl rand -hex 32
```

Add to `.env.local`:
```
GUEST_COOKIE_SECRET=<generated-value>
```

Also add to Vercel environment variables (Production + Preview).

## Next Phase Readiness

- Guest cookie utility (`signGuestCookie` / `verifyGuestCookie`) ready for Plan 02 to use in `/api/liveblocks-auth` guest path
- `sessionParticipants` records created with `liveblocksUserId` (guest_ prefix), `color`, `displayName` — all fields needed for Liveblocks token issuance
- `/join/[token]` lobby placeholder ready for Plan 02 real-time lobby (Liveblocks RoomProvider + presence)
- Clerk middleware public routes already include `/api/session-status(.*)` for Plan 02 lobby polling

---
*Phase: 57-guest-auth-and-join-flow*
*Completed: 2026-02-27*
