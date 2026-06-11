---
phase: 32-workshop-management
plan: 01
subsystem: workshop-management
tags: [soft-delete, database, schema, server-actions]
dependency-graph:
  requires: [database-setup, workshop-schema]
  provides: [soft-delete-infrastructure]
  affects: [dashboard-query, workshop-actions]
tech-stack:
  added: []
  patterns: [soft-delete, ownership-validation, revalidation]
key-files:
  created: []
  modified:
    - src/db/schema/workshops.ts
    - src/actions/workshop-actions.ts
    - src/app/dashboard/page.tsx
decisions:
  - "Nullable deletedAt column with no default (NULL = not deleted)"
  - "No index on deletedAt (uses existing clerkUserId index + isNull filter)"
  - "deleteWorkshops validates ownership with defense-in-depth (inArray + eq + isNull)"
  - "Server action returns deleted count for UI feedback"
metrics:
  duration: 169
  tasks_completed: 2
  files_modified: 3
  commits: 2
  completed_at: "2026-02-12T20:25:24Z"
---

# Phase 32 Plan 01: Soft Delete Infrastructure Summary

**One-liner:** Soft delete infrastructure for workshops using nullable deletedAt timestamp, ownership-validated server action, and filtered dashboard query.

## Objective

Add soft delete infrastructure for workshops: deletedAt column on workshops table, a deleteWorkshops server action, and filter the dashboard query to exclude soft-deleted records.

## What Was Built

### Task 1: Add deletedAt column and push schema

**Files modified:** `src/db/schema/workshops.ts`

Added a nullable `deletedAt` timestamp column to the workshops table:
```typescript
deletedAt: timestamp('deleted_at', { mode: 'date', precision: 3 }),
```

**Key decisions:**
- Nullable with no default (NULL = not deleted)
- No index needed (dashboard query uses existing clerkUserId index + isNull filter)
- Existing rows automatically get NULL via nullable constraint

**Schema push:** Ran `npm run db:push:dev` successfully, column applied to Neon database.

**Commit:** `59656e6`

### Task 2: Add deleteWorkshops server action and filter dashboard query

**Files modified:** `src/actions/workshop-actions.ts`, `src/app/dashboard/page.tsx`

**In workshop-actions.ts:**
- Added `isNull` and `inArray` imports from drizzle-orm
- Created `deleteWorkshops(workshopIds: string[]): Promise<{ deleted: number }>` server action
- Validates ownership with defense-in-depth: checks user ID, workshop ownership, and existing deletedAt status
- Sets deletedAt to current timestamp
- Returns deleted count using `.returning()`
- Revalidates `/dashboard` path

**In dashboard/page.tsx:**
- Added `isNull` and `and` imports from drizzle-orm
- Updated workshops query to filter out soft-deleted records:
  ```typescript
  where: and(
    eq(workshops.clerkUserId, userId),
    isNull(workshops.deletedAt)
  )
  ```
- Added `deleteWorkshops` import for downstream UI wiring in Plan 02

**Commit:** `5f8bf0c`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria met:

- [x] `npx tsc --noEmit` passes with no errors
- [x] `npm run db:push:dev` applied successfully (Task 1)
- [x] Dashboard query includes soft-delete filter
- [x] deleteWorkshops server action exists with correct signature
- [x] Ownership validation implemented (defense-in-depth with inArray, eq, isNull)

## Technical Notes

**Defense-in-depth ownership validation:**
The deleteWorkshops action uses three conditions in the WHERE clause:
1. `inArray(workshops.id, workshopIds)` - only target specified workshops
2. `eq(workshops.clerkUserId, userId)` - only delete user's own workshops
3. `isNull(workshops.deletedAt)` - only delete non-deleted workshops

This prevents double-deletion and ensures users can only delete their own workshops.

**Dashboard performance:**
No dedicated index on deletedAt needed. The query uses the existing `workshops_clerk_user_id_idx` index first (filters to user's workshops), then applies isNull filter on the smaller result set. This is efficient because:
- clerkUserId index reduces rows dramatically (user-level filtering)
- isNull filter runs on small set (typically <100 workshops per user)
- Most workshops are not deleted (NULL), so filter is selective

**Return value:**
The server action returns `{ deleted: number }` using `.returning({ id: workshops.id })` to provide UI feedback. This enables Plan 02 to show "X workshop(s) deleted" confirmation messages.

## Impact

**Immediate:**
- Workshops table supports soft delete
- Dashboard automatically excludes soft-deleted workshops
- Server action ready for UI wiring in Plan 02

**Downstream:**
- Plan 02 will add delete UI (dropdown menu, confirmation dialog)
- Soft-deleted workshops preserved for potential recovery features (future)
- No breaking changes to existing workshop queries

## Self-Check: PASSED

**Created files:** None (plan only modified existing files)

**Modified files:**
- [x] FOUND: src/db/schema/workshops.ts (contains deletedAt column)
- [x] FOUND: src/actions/workshop-actions.ts (contains deleteWorkshops function)
- [x] FOUND: src/app/dashboard/page.tsx (contains soft-delete filter)

**Commits:**
- [x] FOUND: 59656e6 (Task 1: schema + db push)
- [x] FOUND: 5f8bf0c (Task 2: server action + dashboard filter)

All artifacts verified present and correct.
