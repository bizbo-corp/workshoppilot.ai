# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** MVP 0.5 — Application Shell (Phase 2: Authentication & Roles)

## Current Position

Phase: 2 of 6 (Authentication & Roles)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-02-07 — Completed 02-01-PLAN.md (Clerk Integration & Route Protection)

Progress: [████░░░░░░] 4/27 plans complete (15%)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 3.0 min
- Total execution time: 0.20 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-database | 3 | 7 min | 2.3 min |
| 02-authentication-roles | 1 | 5 min | 5.0 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-02 (2 min), 01-03 (3 min), 02-01 (5 min)
- Trend: Slightly increasing with complexity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Gemini API for AI (cost/capability balance for conversational facilitation)
- Neon Postgres for database (serverless Postgres, pairs well with Vercel)
- Clerk for authentication (managed auth with role support, fast to integrate)
- 4-milestone phasing (0.5 → 1.0 → MMP → FFP) - ship scaffold first, validate architecture
- **01-01:** neon-http driver over WebSocket (serverless-optimized, no connection pooling)
- **01-01:** Prefixed CUID2 IDs (ws_, wm_, wst_, ses_, bp_, usr_) for improved debuggability
- **01-02:** Semantic IDs for step_definitions ('empathize', 'define', etc.) instead of cuid2
- **01-02:** No updated_at on sessions table (write-once, close-once pattern)
- **01-02:** Nullable content in build_packs (assembled from current outputs at generation time)
- **01-03:** dotenv-cli for loading .env.local in drizzle-kit commands
- **01-03:** TypeScript seed script over raw SQL for better type safety
- **01-03:** Health check returns database status for monitoring
- **02-01:** Roles stored as JSON text array in users table (default: ["facilitator"])
- **02-01:** Conditional ClerkProvider wrapper (only wraps when valid keys present)
- **02-01:** Soft delete pattern with deletedAt for users table
- **02-01:** Phase 3 handoff documented in middleware for workshop step routes (1-3 public, 4-10 protected)

### Pending Todos

- User must add real Clerk API keys to .env.local (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)
- User must create Clerk application and configure email+password + Google OAuth

### Blockers/Concerns

- Next.js 16.1.1 shows "middleware" deprecation warning, suggests "proxy" convention (not blocking, but may need future migration)
- Authentication won't function until user completes Clerk setup (expected, documented in SUMMARY)

## Session Continuity

Last session: 2026-02-07 08:09 UTC
Stopped at: Completed 02-01-PLAN.md (Clerk Integration & Route Protection)
Resume file: .planning/phases/02-authentication-roles/02-01-SUMMARY.md
