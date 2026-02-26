---
phase: 54-liveblocks-foundation
plan: 03
subsystem: infra
tags: [liveblocks, auth, webhook, multiplayer, next-dynamic, clerk]

# Dependency graph
requires:
  - phase: 54-liveblocks-foundation/54-01
    provides: "Liveblocks v3.14.0 installed, typed config, getRoomId helper"
  - phase: 54-liveblocks-foundation/54-02
    provides: "workshop_sessions and session_participants schema tables"
provides:
  - "POST /api/liveblocks-auth — issues Liveblocks access tokens for Clerk-authenticated users"
  - "POST /api/webhooks/liveblocks — HMAC-verified StorageUpdated handler, logs room state"
  - "MultiplayerRoomLoader — lazy-loaded multiplayer wrapper (zero bundle impact on solo workshops)"
  - "multiplayer-room.tsx placeholder for Phase 55 canvas implementation"
affects: [55-multiplayer-canvas, 57-guest-auth, 58-ai-multiplayer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy singleton initialization: null-checked module-level cache defers env var validation to request time"
    - "Liveblocks auth: prepareSession + session.allow(room, FULL_ACCESS) + session.authorize()"
    - "Liveblocks webhook: raw body via request.text(), WebhookHandler.verifyRequest(), 400/500/200 pattern"
    - "next/dynamic with ssr: false in 'use client' file — zero bundle split for solo workshops"

key-files:
  created:
    - src/app/api/liveblocks-auth/route.ts
    - src/app/api/webhooks/liveblocks/route.ts
    - src/components/workshop/multiplayer-room-loader.tsx
    - src/components/workshop/multiplayer-room.tsx
  modified: []

key-decisions:
  - "Lazy initialization of Liveblocks and WebhookHandler clients — module-level constructors fail at build time without env vars; lazy getters defer to request time"
  - "No proxy.ts changes needed for /api/liveblocks-auth — Clerk middleware's existing /api/* protected route coverage handles it"
  - "webhook handler returns 200 for all unhandled event types — avoids Liveblocks dashboard delivery failures"

patterns-established:
  - "Lazy singleton pattern: let _client = null; function getClient() { if (!_client) _client = new Client(env!); return _client; }"
  - "Liveblocks webhook pattern mirrors Stripe: raw body, HMAC verify, 400/500/200 return codes"

requirements-completed: [INFR-01, INFR-02, INFR-05]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 54 Plan 03: API Routes and Lazy Loader — Liveblocks Auth, Webhook, and Dynamic Import

**Liveblocks auth endpoint issues Clerk-authenticated session tokens; StorageUpdated webhook verifies HMAC and logs room state; MultiplayerRoomLoader zero-bundles multiplayer components from solo workshops via next/dynamic ssr: false**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-26T08:26:21Z
- **Completed:** 2026-02-26T08:29:41Z
- **Tasks:** 2 (+ 1 auto-fix deviation)
- **Files created:** 4

## Accomplishments

- Created `POST /api/liveblocks-auth` that authenticates Clerk users via `auth()` + `currentUser()`, then uses `liveblocks.prepareSession()` + `session.allow(room, FULL_ACCESS)` + `session.authorize()` to issue short-lived Liveblocks room tokens. Guest path returns 401 with Phase 57 stub.
- Created `POST /api/webhooks/liveblocks` following the established Stripe webhook pattern: raw body via `request.text()`, HMAC-verified via `WebhookHandler.verifyRequest()`, fetches Liveblocks REST storage snapshot on `storageUpdated` events, logs payload size, returns 400/500/200 appropriately.
- Created `MultiplayerRoomLoader` using `next/dynamic` with `ssr: false` in a `'use client'` file — guarantees zero `@liveblocks/react` bundle impact on solo workshop code paths.
- Created `multiplayer-room.tsx` placeholder to prevent build-time TypeScript errors from the dynamic import path.
- `npm run build` succeeds with both new routes visible in the output route list.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement /api/liveblocks-auth route** - `25e36d9` (feat)
2. **Task 2: Implement webhook handler and multiplayer loader** - `ffed37f` (feat)
3. **Deviation fix: Lazy-initialize Liveblocks clients** - `8f9e426` (fix)

## Files Created/Modified

- `src/app/api/liveblocks-auth/route.ts` — POST handler: Clerk auth check, currentUser resolution, room extraction from request body, prepareSession + allow + authorize
- `src/app/api/webhooks/liveblocks/route.ts` — POST handler: raw body HMAC verification, storageUpdated handler with REST API fetch and byte logging, Phase 55 Drizzle TODO
- `src/components/workshop/multiplayer-room-loader.tsx` — 'use client' file with dynamic() import, ssr: false, loading state, MultiplayerRoomLoader component
- `src/components/workshop/multiplayer-room.tsx` — Build-safe placeholder for Phase 55 implementation

## Decisions Made

- **Lazy singleton initialization**: `new Liveblocks()` and `new WebhookHandler()` validate the secret key format immediately at construction. Module-level initialization fails during `npm run build` when `LIVEBLOCKS_SECRET_KEY` / `LIVEBLOCKS_WEBHOOK_SECRET` are not set in the build environment. Solution: lazy getters with null-checked module-level cache (`let _client = null; function getClient() { ... }`). Matches Next.js convention for environment-dependent server modules.
- **No proxy.ts changes**: `/api/liveblocks-auth` is called by authenticated users (Clerk cookie sent automatically by browser). The existing Clerk middleware covers all `/api/*` paths. Only webhook endpoints need the public route matcher — already covered by `/api/webhooks(.*)`.
- **200 for unhandled webhook events**: Liveblocks sends many event types (presence, comment, etc.). Returning 400 causes delivery failures in the Liveblocks dashboard. Returning 200 for unhandled types is the correct approach.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lazy-initialize Liveblocks and WebhookHandler constructors**
- **Found during:** Post-task build verification (`npm run build`)
- **Issue:** `new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! })` at module scope throws `"Invalid value for field 'secret'. Secret keys must start with 'sk_'"` during Next.js page data collection at build time, when the env var is not present in the build environment.
- **Fix:** Extracted both constructors into lazy getter functions with null-checked module-level cache. Clients are created on first request and reused across subsequent requests (same Node.js process lifetime).
- **Files modified:** `src/app/api/liveblocks-auth/route.ts`, `src/app/api/webhooks/liveblocks/route.ts`
- **Commit:** `8f9e426`

---

**Total deviations:** 1 auto-fixed (Rule 1 — build-time initialization failure)
**Impact on plan:** Essential fix for production builds. Lazy initialization is a standard pattern for env-dependent modules in Next.js.

## Issues Encountered

- Running `npx tsc --noEmit [specific file]` (without project tsconfig) surfaced false positives from node_modules private field syntax — same pattern as Plan 54-01. Used `npx tsc --noEmit` with full project config (skipLibCheck: true).

## User Setup Required

None beyond what was documented in 54-01:
- `LIVEBLOCKS_SECRET_KEY` must be set in `.env.local` and Vercel before the auth endpoint will issue tokens
- `LIVEBLOCKS_WEBHOOK_SECRET` must be set before the webhook handler will verify signatures
- The Liveblocks webhook endpoint URL to register in the dashboard: `https://workshoppilot.ai/api/webhooks/liveblocks` with `StorageUpdated` event type

## Next Phase Readiness

- Phase 55 (Core Canvas Sync): Auth endpoint ready. Webhook has clear TODO comment for Drizzle upsert integration. `MultiplayerRoomLoader` is the entry point — Phase 55 implements `multiplayer-room.tsx` replacing the placeholder.
- Phase 57 (Guest Auth): Auth endpoint has TODO comment with exact implementation plan for HttpOnly signed cookie guest path.
- Phase 58 (AI Multiplayer): Webhook handler has clear integration point for step-context-aware persistence.

## Self-Check: PASSED

Files verified:
- `src/app/api/liveblocks-auth/route.ts` — FOUND
- `src/app/api/webhooks/liveblocks/route.ts` — FOUND
- `src/components/workshop/multiplayer-room-loader.tsx` — FOUND
- `src/components/workshop/multiplayer-room.tsx` — FOUND

Commits verified:
- `25e36d9` (Task 1: liveblocks-auth) — FOUND
- `ffed37f` (Task 2: webhook + loader) — FOUND
- `8f9e426` (fix: lazy init) — FOUND

Build: `npm run build` succeeds — `/api/liveblocks-auth` and `/api/webhooks/liveblocks` appear in route output.

---
*Phase: 54-liveblocks-foundation*
*Completed: 2026-02-26*
