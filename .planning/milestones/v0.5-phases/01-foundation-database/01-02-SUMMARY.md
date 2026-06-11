---
phase: 01-foundation-database
plan: 02
subsystem: database-schema
tags: [drizzle, postgres, schema, types, relations]
status: complete
requires: ["01-01"]
provides:
  - "Complete database schema (6 tables)"
  - "Drizzle relations for relational queries"
  - "TypeScript types for all entities"
affects: ["01-03", "02-*", "03-*"]
tech-stack:
  added: []
  patterns: ["Drizzle ORM relational queries", "Prefixed CUID2 IDs", "Hard deletes"]
key-files:
  created:
    - "src/db/schema/workshops.ts"
    - "src/db/schema/steps.ts"
    - "src/db/schema/sessions.ts"
    - "src/db/schema/build-packs.ts"
    - "src/db/schema/relations.ts"
    - "src/db/types.ts"
  modified:
    - "src/db/schema/index.ts"
decisions: []
metrics:
  duration: "2 min"
  completed: "2026-02-07"
---

# Phase 01 Plan 02: Database Schema Definition Summary

**One-liner:** Complete WorkshopPilot.ai data model: 6 tables (workshops, members, step definitions, workshop steps, sessions, build packs) with Drizzle relations and inferred TypeScript types for type-safe operations.

## What Was Delivered

### Core Schema Tables (4 files)

**workshops.ts:**
- `workshops` table: Core workshop entity with status ('draft'|'active'|'paused'|'completed'), visibility ('private'|'shared'), nullable org_id/template_id, share_token
- `workshopMembers` table: Role-based membership (extensible text roles: 'owner'|'editor'|'viewer') with unique constraint preventing duplicate memberships
- Indexes: clerk_user_id, status, org_id, workshop_id

**steps.ts:**
- `stepDefinitions` table: 10 design thinking step references with semantic IDs ('empathize', 'define', etc. — NOT cuid2), order, name, description, optional prompt_template
- `workshopSteps` table: Per-workshop progress tracking with status ('not_started'|'in_progress'|'complete'), jsonb output (typed as Record<string, unknown>), started_at/completed_at timestamps
- Indexes: workshop_id, step_id, status

**sessions.ts:**
- `sessions` table: Lean timestamp-only session data (write-once, close-once pattern)
- No updated_at (sessions don't change after creation/closure)
- Indexes: workshop_id

**build-packs.ts:**
- `buildPacks` table: Generated output artifacts with format_type ('markdown'|'pdf'|'json')
- Content assembled from CURRENT step outputs at generation time (not snapshots — per user decision)
- Indexes: workshop_id

### Relational Query Support

**relations.ts:**
- 6 relation definitions enabling Drizzle relational queries
- `db.query.workshops.findFirst({ with: { steps: true, members: true, sessions: true, buildPacks: true } })`
- All many-to-one relations properly wired (workshopSteps → workshops + stepDefinitions, sessions → workshops, buildPacks → workshops, workshopMembers → workshops)

### Type Safety

**types.ts:**
- Inferred Select types: Workshop, WorkshopMember, StepDefinition, WorkshopStep, Session, BuildPack
- Inferred Insert types: New* variants for all 6 tables (NewWorkshop, NewWorkshopMember, etc.)
- Used throughout app for type-safe database operations

**index.ts:**
- Barrel file re-exports all schemas and relations
- Single import point: `import { workshops, workshopsRelations } from '@/db/schema'`

## Locked Decisions Implemented

All user-locked decisions from CONTEXT.md verified:

- ✅ snake_case column naming, plural table names
- ✅ text('id').primaryKey() with prefixed cuid2 (ws_, wm_, wst_, ses_, bp_) via createPrefixedId()
- ✅ text('clerk_user_id') for Clerk references (NO local users table)
- ✅ timestamp with { mode: 'date', precision: 3 } everywhere
- ✅ Hard deletes (no deleted_at columns)
- ✅ Indexes on all foreign keys and commonly filtered columns
- ✅ Cascade delete on all foreign key constraints
- ✅ No enum types (text with $type<> for type safety)
- ✅ step_definitions uses semantic string IDs (not generated cuid2)
- ✅ workshop_members has unique constraint on (workshop_id, clerk_user_id)
- ✅ sessions table is lean (no updated_at — write-once, close-once)
- ✅ build_packs content references current outputs (not snapshots)

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Define all table schemas with indexes | ecbff0f | workshops.ts, steps.ts, sessions.ts, build-packs.ts |
| 2 | Define Drizzle relations, barrel exports, and inferred types | aece5dd | relations.ts, index.ts, types.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

✅ All 6 tables defined: workshops, workshop_members, step_definitions, workshop_steps, sessions, build_packs
✅ All tables use snake_case columns, plural table names, text PKs with cuid2
✅ step_definitions uses semantic string IDs (not cuid2)
✅ Foreign keys: workshop_steps → workshops + step_definitions, sessions → workshops, build_packs → workshops, workshop_members → workshops
✅ All FKs have cascade delete and corresponding indexes
✅ No enum types, no soft deletes, no local users table
✅ Relations enable `db.query.workshops.findFirst({ with: { steps: true, members: true } })`
✅ TypeScript types inferred for all tables (Select + Insert variants)
✅ `npx tsc --noEmit` passes with no errors

## Next Phase Readiness

**Ready for Plan 03 (Migration & Seed):**
- Schema is complete and compiles without errors
- Ready for `drizzle-kit push` to Neon database
- Ready for step_definitions seed data (10 design thinking steps)
- Types are ready for use in API routes and server components

**Blockers:** None

**Concerns:** None

## Technical Notes

**Why semantic IDs for step_definitions:**
The 10 design thinking steps are reference data (like enums), not user-generated content. Using semantic IDs ('empathize', 'define', etc.) makes queries more readable and eliminates the need for lookups by name.

**Why no updated_at on sessions:**
Sessions follow a write-once, close-once pattern. They're created with started_at, then closed with ended_at. No intermediate updates occur, so updated_at adds no value.

**Why content is nullable in build_packs:**
Content is assembled from current step outputs at generation time. The row is created first (with metadata like title/format_type), then content is populated after assembly. This avoids storing duplicate snapshot data.

**Database size estimates:**
- workshops: ~100 bytes/row
- workshop_members: ~80 bytes/row (avg 1-3 per workshop)
- step_definitions: ~200 bytes/row (10 rows total, reference data)
- workshop_steps: ~300 bytes/row (10 per workshop, jsonb output varies)
- sessions: ~60 bytes/row (lean timestamps only)
- build_packs: ~5-50 KB/row (depends on content length)

For 10,000 workshops: ~50 MB (excluding build_pack content)

## Self-Check: PASSED

All created files verified:
- ✅ src/db/schema/workshops.ts
- ✅ src/db/schema/steps.ts
- ✅ src/db/schema/sessions.ts
- ✅ src/db/schema/build-packs.ts
- ✅ src/db/schema/relations.ts
- ✅ src/db/types.ts

All commits verified:
- ✅ ecbff0f (Task 1: Define all table schemas with indexes)
- ✅ aece5dd (Task 2: Define Drizzle relations, barrel exports, and inferred types)
