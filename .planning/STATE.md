# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** MVP 0.5 — Application Shell (Phase 3: Application Shell)

## Current Position

Phase: 3 of 6 (Application Shell)
Plan: 5 of 5 in current phase
Status: Phase complete
Last activity: 2026-02-07 — Completed 03-05-PLAN.md (Step Pages with Chat/Output Panels)

Progress: [████████░░] 12/27 plans complete (44%)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 3.0 min
- Total execution time: 0.60 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-database | 3 | 7 min | 2.3 min |
| 02-authentication-roles | 4 | 14 min | 3.5 min |
| 03-application-shell | 5 | 18 min | 3.6 min |

**Recent Trend:**
- Last 5 plans: 03-02 (3 min), 03-03 (3 min), 03-04 (4 min), 03-05 (4 min)
- Trend: Phase 3 complete with consistent 3-4 min average (stable velocity)

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
- **02-02:** Admin identified by ADMIN_EMAIL env var match on user creation
- **02-02:** Roles stored in Clerk publicMetadata (source of truth) and mirrored in users.roles JSON column
- **02-02:** Everyone starts as facilitator, admin gets both facilitator + admin roles
- **02-02:** Webhook signature verification using svix library (pattern for all Clerk webhooks)
- **02-03:** Modal overlays for auth (not dedicated routes) - cleaner UX, stays on current page
- **02-03:** Auth wall modal has explicit dismiss (close button, 'Not now') but no backdrop click close
- **02-03:** Step 4-10 preview shown in auth wall to motivate sign-up
- **02-03:** Auth wall redirects to /dashboard (Phase 3 will update to step 4 redirect)
- **02-04:** Hash-based routing for Clerk modal components (routing="hash")
- **02-04:** Dashboard as temporary post-sign-up redirect (Phase 3 updates to step 4)
- **02-04:** MigrationCheck runs silently on dashboard mount (invisible component)
- **02-04:** Defense-in-depth: middleware + page-level auth/role checks
- **03-01:** .npmrc with legacy-peer-deps=true to handle Clerk/React 19.2.0 peer dependency mismatch
- **03-01:** Header removed from root layout - headers are route-specific (landing vs workshop vs dashboard)
- **03-01:** ThemeProvider configured with attribute='class', defaultTheme='system', enableSystem=true
- **03-01:** Root layout structure: html > body > ClerkProvider > ThemeProvider > {children}
- **03-02:** Step metadata hardcoded (not DB-fetched) for performance and simplicity
- **03-02:** Step IDs aligned between seed script, metadata module, and database foreign keys
- **03-02:** Workshop route protection: steps 1-3 public, 4-10 protected (LOCKED user decision)
- **03-03:** Workshop session creation flow: Server Action creates workshop + session + 10 steps atomically
- **03-03:** Anonymous users stored as 'anonymous' clerkUserId (Phase 2 migration updates on signup)
- **03-03:** Landing header separate from workshop header (different UX requirements)
- **03-03:** Step initialization uses STEPS array from step-metadata.ts for consistency
- **03-04:** Hydration-safe localStorage pattern: useState with default, read localStorage in useEffect
- **03-04:** Exit dialog emphasizes "progress is saved" with reassuring language (not scary)
- **03-04:** Mobile stepper uses Sheet from top (better UX than cramming 10 steps horizontally)
- **03-05:** react-resizable-panels uses Group/Panel/Separator API (not PanelGroup/PanelResizeHandle)
- **03-05:** Mobile breakpoint detection via useEffect with window resize listener
- **03-05:** Chat input disabled with 'AI facilitation coming soon...' placeholder
- **03-05:** Invalid step numbers (< 1 or > 10) redirect to step 1

### Pending Todos

- Workshops table needs deletedAt column for soft delete on user deletion (future enhancement)
- User must configure Clerk webhook endpoint and add CLERK_WEBHOOK_SECRET for user sync

### Blockers/Concerns

- Next.js 16.1.1 shows "middleware" deprecation warning, suggests "proxy" convention (not blocking)

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed 03-05-PLAN.md (Step Pages with Chat/Output Panels) — Phase 3 complete
Resume file: .planning/phases/03-application-shell/03-05-SUMMARY.md
