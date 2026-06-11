# Phase 1: Foundation & Database - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema defined, Neon Postgres connected, edge-compatible persistence layer working. This phase delivers the data foundation — tables, relationships, connection setup, and migration tooling. No UI, no auth integration, no AI features.

</domain>

<decisions>
## Implementation Decisions

### Schema Design
- No local users table — reference Clerk user IDs (clerk_user_id string) as foreign keys throughout
- IDs: cuid2/nanoid generated in app layer for all primary keys (URL-friendly, collision-resistant)
- Hard deletes with confirmation UX (no soft delete columns)
- Timestamps: Claude's discretion per table (created_at/updated_at where appropriate)
- snake_case naming convention for all tables and columns
- Plural table names: workshops, sessions, steps, etc.
- Extensible roles — flexible role field/table rather than fixed enum, supports future admin/viewer/custom roles
- Plan key indexes upfront for known query patterns (workshops by owner, steps by workshop, etc.)
- Nullable org_id/team_id on workshops for future multi-tenancy (individual-only for MVP 0.5)

### Workshop Data Model
- Workshop has sessions (1:many) — workshop is the long-lived container, sessions track individual work periods
- Workshop fields: id, title, original_idea (the vague idea that started it), status, clerk_user_id, nullable org_id, nullable template_id, visibility/share_token (private by default)
- Workshop statuses: draft, active, paused, completed
- Current step position derived from step completion data (no stored current_step field)
- Workshop cap per plan — user tier stored in Clerk metadata, enforced at app level
- Workshop members table from start: workshop_members (workshop_id, clerk_user_id, role) — owner is role='owner', ready for collaboration

### Step Data Model
- Steps reference table (steps_definitions) for the 10 design thinking step definitions — updatable without deploys
- Workshop steps table (workshop_steps) for per-workshop progress: step_id, workshop_id, status, output (jsonb), started_at, completed_at
- Step statuses: not_started, in_progress, complete
- Step completion: AI confirms completion as default, but user can skip with confirmation
- Step output: generic jsonb column — step-specific Zod schemas deferred to MVP 1.0
- Overwrite on re-edit (no revision history for step outputs)
- All prior step outputs loaded as context for subsequent steps (no declared dependencies)

### Sessions
- Auto-created sessions, but only persisted after meaningful activity (step visited or AI interaction) — prevents null/orphan rows
- Lean session data: timestamps only (session_id, workshop_id, started_at, ended_at)

### Build Packs (future-proofing)
- build_packs table included in schema now to avoid migration later
- References workshop (content assembled from current step outputs, not snapshots)
- Supports multiple output formats: Markdown, PDF, JSON (format_type column)

### Environment & Connection
- Neon branching: single project, branches for dev/prod/preview deployments (copy-on-write)
- Connect to Neon dev branch for local development (no local Postgres/Docker)
- @neondatabase/serverless driver everywhere (both local and production) — consistent behavior
- Neon's built-in PgBouncer connection pooling only (no app-level pooling)
- Single DATABASE_URL environment variable
- Environment variables managed via `vercel env pull` (Vercel as single source of truth)
- /api/health endpoint that verifies database connectivity

### Migration Strategy
- drizzle-kit push for local development (fast iteration, no migration files)
- Migration files for production deployments
- Auto-migrate on deploy (migrations run during Vercel build process)

### Claude's Discretion
- Timestamps strategy per table (created_at/updated_at placement)
- Step definitions seeding approach (migration vs seed script)
- Dev branch reset strategy (npm script vs Neon branch recreation)
- Step output JSON validation approach (recommend Zod)
- Exact index selection for known query patterns
- Compression/optimization choices

</decisions>

<specifics>
## Specific Ideas

- Plan for sharing from day one (visibility/share_token field, default private) — ready for multiplayer milestone
- Plan for templates (nullable template_id) — ready for future template feature
- Workshop members table from start rather than simple owner column — avoids painful migration when collaboration comes
- Build packs table included in initial schema even though generation is MVP 1.0
- Sessions should not create orphan rows — only persist after meaningful user activity

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-database*
*Context gathered: 2026-02-07*
