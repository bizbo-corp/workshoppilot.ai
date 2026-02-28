---
phase: 55-core-canvas-sync
plan: 01
subsystem: multiplayer
tags: [liveblocks, zustand, multiplayer, dashboard, store-factory, canvas]

# Dependency graph
requires:
  - phase: 54-liveblocks-foundation/54-01
    provides: "Liveblocks v3.14.0 installed, typed config, getRoomId helper, liveblocksClient"
  - phase: 54-liveblocks-foundation/54-02
    provides: "workshops.workshopType column, workshopSessions table schema"
  - phase: 54-liveblocks-foundation/54-03
    provides: "Liveblocks auth endpoint, webhook handler"
provides:
  - "createMultiplayerCanvasStore factory — liveblocks() middleware with 11-field storageMapping"
  - "MultiplayerCanvasStoreApi type export"
  - "Solo vs Multiplayer mode toggle in NewWorkshopDialog"
  - "createWorkshopSession creates workshopSessions record for multiplayer workshops"
  - "WorkshopCard multiplayer badge indicator"
affects: [55-02-core-canvas-sync, 56-presence, 57-guest-auth]

# Tech tracking
tech-stack:
  added:
    - "@liveblocks/zustand@3.14.0"
    - "zustand@5.0.1 (upgraded from 4.5.7 transitive dep)"
  patterns:
    - "liveblocks() middleware as outer wrapper, OpaqueClient cast to satisfy TypeScript type constraints"
    - "storageMapping excludes ephemeral state (isDirty, selectedStickyNoteIds, highlightedCell, pendingFitView, pendingHmwChipSelection)"
    - "markClean/markDirty are no-ops in multiplayer store — Liveblocks Storage is authoritative"
    - "randomBytes(18).toString('base64url') for 24-char URL-safe shareToken generation"

key-files:
  created:
    - src/stores/multiplayer-canvas-store.ts
  modified:
    - package.json
    - package-lock.json
    - src/components/dialogs/new-workshop-dialog.tsx
    - src/actions/workshop-actions.ts
    - src/components/dashboard/workshop-card.tsx
    - src/components/dashboard/workshop-grid.tsx
    - src/app/dashboard/page.tsx

key-decisions:
  - "temporal removed from multiplayer store — liveblocks() + temporal() composition fails TypeScript type constraints (IUserInfo vs custom UserMeta mismatch). Fallback: liveblocks-only store, undo/redo disabled for multiplayer per STATE.md fallback decision"
  - "liveblocksClient cast as OpaqueClient — global UserMeta augmentation (color, role fields) is incompatible with internal IUserInfo type used by @liveblocks/zustand. Runtime behavior unchanged."
  - "workshopType defaults to 'solo' on createWorkshopSession — backward compatible with all existing workshops"
  - "maxParticipants set to 15 for multiplayer workshops, null for solo"
  - "shareToken generated with randomBytes(18).toString('base64url') — 24 URL-safe chars, no additional package needed"

requirements-completed: [SESS-01]

# Metrics
duration: 8min
completed: 2026-02-26
---

# Phase 55 Plan 01: Multiplayer Store Factory + Workshop Creation Flow

**@liveblocks/zustand@3.14.0 installed, zustand upgraded to v5, createMultiplayerCanvasStore factory created with 11-field storageMapping, multiplayer workshop creation wired end-to-end from dialog to DB, multiplayer badge added to dashboard cards**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-26T09:18:08Z
- **Completed:** 2026-02-26T09:26:29Z
- **Tasks:** 2 (+ 1 auto-fix deviation)
- **Files created:** 1
- **Files modified:** 6

## Accomplishments

- Installed `@liveblocks/zustand@3.14.0` and upgraded `zustand` to `5.0.1` (from transitive 4.5.7). Both packages install clean with no peer dep conflicts.
- Created `src/stores/multiplayer-canvas-store.ts` with `createMultiplayerCanvasStore` factory. Uses `liveblocks()` middleware with 11-field `storageMapping` covering all durable canvas state. Ephemeral fields (`isDirty`, `selectedStickyNoteIds`, `highlightedCell`, `pendingFitView`, `pendingHmwChipSelection`) excluded from mapping. `markClean`/`markDirty` are no-ops. Exports `MultiplayerCanvasStoreApi` type.
- Modified `NewWorkshopDialog` to present a Solo vs Multiplayer mode toggle — two card buttons with icons (MessageSquare / Users from lucide-react), selected state with `ring-2 ring-primary` highlight, resets to solo on dialog open. Hidden input passes `workshopType` to server action.
- Modified `createWorkshopSession` to extract `workshopType` from formData, set it on the workshops insert with `maxParticipants: 15` for multiplayer, and create a `workshopSessions` record (liveblocksRoomId, shareToken, status=waiting) when multiplayer.
- Added `workshopType` prop to `WorkshopCard` with a subtle multiplayer badge (Users icon + "Multiplayer" text pill) rendered when `workshopType === 'multiplayer'`.
- Threaded `workshopType` through `WorkshopGrid` → `WorkshopCard` and from `dashboard/page.tsx`'s workshops query.

## Task Commits

1. **Task 1: Install packages and create createMultiplayerCanvasStore** - `6991632` (feat)
2. **Task 2: Multiplayer workshop creation flow and dashboard badge** - `bccab10` (feat)

## Files Created/Modified

- `src/stores/multiplayer-canvas-store.ts` — NEW: createMultiplayerCanvasStore factory with liveblocks() middleware, 11-field storageMapping, all CanvasStore actions, no-op markClean/markDirty
- `package.json` — @liveblocks/zustand@3.14.0 and zustand@5.0.1 added
- `src/components/dialogs/new-workshop-dialog.tsx` — Solo vs Multiplayer mode toggle, workshopType state, hidden input
- `src/actions/workshop-actions.ts` — workshopType extraction, workshops insert updated, workshopSessions creation for multiplayer
- `src/components/dashboard/workshop-card.tsx` — workshopType prop, multiplayer badge
- `src/components/dashboard/workshop-grid.tsx` — workshopType in WorkshopData interface, passed to WorkshopCard
- `src/app/dashboard/page.tsx` — workshopType threaded through workshopsWithProgress and into WorkshopGrid

## Decisions Made

- **temporal removed from multiplayer store**: `liveblocks()` + `temporal()` middleware composition fails TypeScript type constraints — the `WithLiveblocks<CanvasStore>` outer type requires the inner `StateCreator` to return `WithLiveblocks<CanvasStore>`, but `temporal()` returns `CanvasStore`. The `IUserInfo` type used internally by `@liveblocks/zustand` also doesn't match the custom `UserMeta` augmentation. Fallback applied: liveblocks-only middleware. Undo/redo disabled for multiplayer sessions per STATE.md pre-authorized fallback.
- **OpaqueClient cast**: `liveblocksClient` is typed as `Client<UserMeta>` where our global augmentation adds `color` and `role` to `info`. The `OpaqueClient` interface used by `@liveblocks/zustand` uses `IUserInfo` internally which lacks those fields. Safe cast — runtime behavior is identical.
- **workshopType defaults to solo**: All existing workshops remain solo — backward compatible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] temporal + liveblocks TypeScript composition failure**
- **Found during:** Task 1 (first TypeScript check after writing multiplayer-canvas-store.ts)
- **Issue:** TypeScript rejects `liveblocks(temporal(...))` composition. The `OuterLiveblocksMiddleware` type requires `StateCreator<TState, Mps, Mcs, Omit<TState, "liveblocks">>` but temporal wraps the state creator in a way that produces `StateCreator<CanvasStore, ...>` which cannot be assigned to `StateCreator<WithLiveblocks<CanvasStore>, ...>`.
- **Fix:** Applied the pre-authorized fallback from the plan: removed `temporal` from the multiplayer store. Store uses `liveblocks()` middleware only. Documented clearly in the file header comment.
- **Files modified:** `src/stores/multiplayer-canvas-store.ts`
- **Commit:** `6991632`

**2. [Rule 1 - Bug] liveblocksClient OpaqueClient type mismatch**
- **Found during:** Task 1 (second TypeScript check after removing temporal)
- **Issue:** `liveblocksClient` typed as `Client<UserMeta>` where UserMeta.info includes `color` and `role`. The `@liveblocks/zustand` middleware expects `OpaqueClient` which uses internal `IUserInfo` (doesn't include `color`/`role`).
- **Fix:** Cast `liveblocksClient as OpaqueClient` (imported from `@liveblocks/core`). Safe cast — runtime value is unchanged.
- **Files modified:** `src/stores/multiplayer-canvas-store.ts`
- **Commit:** `6991632`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — TypeScript type constraint failures, both pre-authorized fallbacks from STATE.md)
**Impact on plan:** temporal fallback was explicitly pre-authorized in STATE.md. No behavior impact on plan objectives.

## Verification Results

1. `npm ls zustand` — zustand@5.0.1 at project root, @liveblocks/zustand@3.14.0 installed
2. `npm ls @liveblocks/zustand` — 3.14.0 confirmed
3. `npx tsc --noEmit` — passes with zero errors
4. storageMapping has 11 fields confirmed by grep
5. `new-workshop-dialog.tsx` includes workshopType state, toggle UI, and hidden input
6. `workshop-actions.ts` inserts workshopSessions record when workshopType is multiplayer
7. `workshop-card.tsx` renders multiplayer badge conditionally

## Next Phase Readiness

- Phase 55-02 (CanvasStoreProvider wiring): `createMultiplayerCanvasStore` ready for use. Provider needs to branch on `workshopType` and call `enterRoom`/`leaveRoom`.
- Phase 57 (Guest Auth): `workshopSessions` records are now created at workshop creation time — share token is available for the invite link endpoint.

## Self-Check: PASSED

Files verified:
- `src/stores/multiplayer-canvas-store.ts` — FOUND
- `src/components/dialogs/new-workshop-dialog.tsx` — FOUND (workshopType state confirmed)
- `src/actions/workshop-actions.ts` — FOUND (workshopSessions insert confirmed)
- `src/components/dashboard/workshop-card.tsx` — FOUND (multiplayer badge confirmed)
- `src/components/dashboard/workshop-grid.tsx` — FOUND (workshopType threaded)
- `src/app/dashboard/page.tsx` — FOUND (workshopType in mapping)

Commits verified:
- `6991632` (Task 1: install packages + createMultiplayerCanvasStore) — FOUND
- `bccab10` (Task 2: creation flow + badge) — FOUND

TypeScript: `npx tsc --noEmit` passes — zero errors.

---
*Phase: 55-core-canvas-sync*
*Completed: 2026-02-26*
