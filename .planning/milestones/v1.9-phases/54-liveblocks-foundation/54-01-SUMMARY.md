---
phase: 54-liveblocks-foundation
plan: 01
subsystem: infra
tags: [liveblocks, real-time, websocket, typescript, presence, storage]

# Dependency graph
requires: []
provides:
  - "@liveblocks/client, @liveblocks/react, @liveblocks/node at v3.14.0"
  - "Global Liveblocks type augmentation: Presence, Storage, UserMeta"
  - "liveblocksClient singleton (authEndpoint: /api/liveblocks-auth)"
  - "getRoomId(workshopId) -> 'workshop-{id}' naming convention"
  - "CanvasElementStorable type (LsonObject-compatible)"
  - "LIVEBLOCKS_SECRET_KEY and LIVEBLOCKS_WEBHOOK_SECRET env validation"
affects: [55-multiplayer-canvas, 56-liveblocks-auth, 57-guest-auth, 58-ai-multiplayer]

# Tech tracking
tech-stack:
  added:
    - "@liveblocks/client@3.14.0"
    - "@liveblocks/react@3.14.0"
    - "@liveblocks/node@3.14.0"
  patterns:
    - "Global interface augmentation for Liveblocks types (not createRoomContext)"
    - "LsonObject-compatible data fields using JsonObject instead of Record<string, unknown>"
    - "Fail-fast env validation with format checks (sk_ prefix) and prod/dev key checks"

key-files:
  created:
    - "src/lib/liveblocks/config.ts"
  modified:
    - "scripts/verify-env.ts"
    - "package.json"
    - "package-lock.json"

key-decisions:
  - "JsonObject used for CanvasElementStorable.data instead of Record<string, unknown> to satisfy LsonObject constraint"
  - "Global interface augmentation (declare global) chosen over createRoomContext (removed in Liveblocks v2+)"
  - "role: 'owner' | 'participant' in UserMeta replaces boolean isOwner for cleaner downstream role checks"
  - "cursor: null (not absent) in Presence when mouse leaves canvas — explicit null semantics"

patterns-established:
  - "Liveblocks room ID pattern: getRoomId(workshopId) => 'workshop-{id}'"
  - "Env validation: format check (startsWith prefix) + prod/dev environment check"

requirements-completed: [INFR-01]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 54 Plan 01: Liveblocks Foundation — SDK Install and Type Config

**@liveblocks/client, react, node at v3.14.0 installed with global Presence/Storage/UserMeta type augmentation, typed client singleton, getRoomId helper, and env var validation**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-26T08:20:49Z
- **Completed:** 2026-02-26T08:23:35Z
- **Tasks:** 2
- **Files modified:** 4 (config.ts created, verify-env.ts updated, package.json, package-lock.json)

## Accomplishments

- Installed all three Liveblocks packages at exactly v3.14.0 — no version drift between packages
- Created `src/lib/liveblocks/config.ts` with global type augmentation, typed client, and room naming helper
- Updated `scripts/verify-env.ts` with Liveblocks env var requirements, format checks, and production key validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Liveblocks packages and create typed config** - `0cc21f1` (feat)
2. **Task 2: Add Liveblocks env vars to verify-env.ts** - `ddc368e` (feat)

## Files Created/Modified

- `src/lib/liveblocks/config.ts` - liveblocksClient singleton, getRoomId helper, global Liveblocks type augmentation (Presence/Storage/UserMeta), CanvasElementStorable type
- `scripts/verify-env.ts` - Added LIVEBLOCKS_SECRET_KEY (sk_ format check, sk_prod_ in production) and LIVEBLOCKS_WEBHOOK_SECRET (whsec_ format check) validation
- `package.json` / `package-lock.json` - @liveblocks/* packages at v3.14.0

## Decisions Made

- **JsonObject for data field**: `CanvasElementStorable.data` uses `JsonObject` (from `@liveblocks/client`) instead of `Record<string, unknown>`. TypeScript rejected `unknown` because it is not assignable to `Lson` — `JsonObject` is the correct LsonObject-compatible type.
- **Global interface augmentation**: Used `declare global { interface Liveblocks { ... } }` per Liveblocks v2+ API. `createRoomContext()` was removed in v2.0 and is unavailable in v3.14.0.
- **role over isOwner**: `UserMeta.info.role: 'owner' | 'participant'` is cleaner for downstream role checks in auth, canvas controls, and step progression phases.
- **cursor: null semantics**: Explicit `cursor: { x; y } | null` where null means "mouse not on canvas" — clearer than absent/undefined.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CanvasElementStorable.data type to satisfy LsonObject constraint**
- **Found during:** Task 1 (TypeScript compilation verification)
- **Issue:** `data: Record<string, unknown>` failed TS2344 — `unknown` is not assignable to `Lson` as required by `LiveObject<O extends LsonObject>`
- **Fix:** Changed to `data: JsonObject` (imported from `@liveblocks/client`) which is a valid Lson-compatible type
- **Files modified:** `src/lib/liveblocks/config.ts`
- **Verification:** `npx tsc --noEmit` produces zero errors from config.ts
- **Committed in:** `0cc21f1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type correctness)
**Impact on plan:** Fix essential for TypeScript compilation. LsonObject constraint is a Liveblocks invariant — not optional. No scope creep.

## Issues Encountered

- Running `npx tsc --strict src/lib/liveblocks/config.ts` (without project tsconfig) surfaced false positives from Liveblocks node_modules private field syntax. Used `npx tsc --noEmit` with project tsconfig (skipLibCheck: true) instead — the correct approach for Next.js projects.

## User Setup Required

**External services require manual configuration:**

- `LIVEBLOCKS_SECRET_KEY`: Liveblocks Dashboard -> Project -> API keys -> Secret key (starts with `sk_`)
- `LIVEBLOCKS_WEBHOOK_SECRET`: Liveblocks Dashboard -> Project -> Webhooks -> Create endpoint pointing to `https://workshoppilot.ai/api/webhooks/liveblocks` with `StorageUpdated` event -> copy signing secret (starts with `whsec_`)

Add both to `.env.local` and Vercel environment variables before running `scripts/verify-env.ts`.

## Next Phase Readiness

- Phase 55 (Multiplayer Canvas): `src/lib/liveblocks/config.ts` provides all types needed for Zustand + Liveblocks middleware integration
- Phase 56 (Liveblocks Auth): `liveblocksClient` is wired to `/api/liveblocks-auth` — endpoint needs to be implemented
- Phase 57 (Guest Auth): `UserMeta.info.role` and `id: 'guest-{uuid}'` pattern established in UserMeta type
- No blockers for Phase 55 from this plan

---

*Phase: 54-liveblocks-foundation*
*Completed: 2026-02-26*
