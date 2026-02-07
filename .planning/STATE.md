# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** MVP 0.5 — COMPLETE. All 6 phases done. Live at https://workshoppilot.ai

## Current Position

Phase: 6 of 6 (Production Deployment) — COMPLETE
Plan: 2 of 2 in current phase
Status: Phase complete, verified by automated checks
Last activity: 2026-02-08 — Phase 6 complete (Production Deployment)

Progress: [██████████] 19/19 plans complete (100%)

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Average duration: 3.0 min
- Total execution time: 1.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-database | 3 | 7 min | 2.3 min |
| 02-authentication-roles | 4 | 14 min | 3.5 min |
| 03-application-shell | 6 | 26 min | 4.3 min |
| 04-navigation-state | 2 | 4 min | 2.0 min |
| 05-ai-chat-integration | 2 | 9 min | 4.5 min |
| 06-production-deployment | 2 | 12 min | 6.0 min |

**Recent Trend:**
- Last 5 plans: 05-01 (3 min), 05-02 (6 min), 06-01 (2 min), 06-02 (10 min)
- Trend: Deployment plans include human checkpoint wait time

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
- **03-06:** Dashboard cards use relative time formatting for "last active" timestamp
- **03-06:** Inline rename with Enter to save, Escape to cancel (standard editable field UX)
- **03-06:** Dashboard header is non-sticky (scrolls with content)
- **04-01:** Step status updates call revalidatePath to refresh layout data
- **04-01:** advanceToNextStep atomically marks current complete, next in_progress
- **04-01:** Step data serialized as plain array (stepId, status) for RSC compatibility
- **04-01:** Removed hardcoded currentStep={1} from MobileStepper (Plan 02 derives from pathname)
- **04-02:** Status lookup via Map for O(1) performance vs linear search
- **04-02:** MobileStepper derives currentStep from pathname, not hardcoded prop
- **04-02:** Not_started steps rendered as div with disabled styling, not Link
- **04-02:** Sequential enforcement at server level (step page) prevents URL manipulation
- **04-02:** Back navigation does not modify step status (user revisiting completed step)
- **05-01:** Gemini 2.0 Flash model for fast, cost-effective MVP AI responses
- **05-01:** stepId stores semantic IDs ('empathize', 'define') not FK to workshop_steps.id
- **05-01:** Message deduplication via messageId comparison before insert
- **05-01:** convertToModelMessages is async and must be awaited (AI SDK pattern)
- **05-01:** consumeStream() ensures onFinish fires even if client disconnects
- **05-02:** DefaultChatTransport with body for sessionId/stepId passing (AI SDK 5 pattern)
- **05-02:** sendMessage pattern instead of handleSubmit (AI SDK 5 API)
- **05-02:** originalMessages required in toUIMessageStreamResponse for full conversation persistence
- **05-02:** Step greeting shown when messages array is empty (welcome state)
- **06-01:** tsx runs verify-env.ts directly (Vercel injects env vars, no dotenv-cli needed in production)
- **06-01:** Analytics and SpeedInsights placed inside ThemeProvider after children
- **06-01:** Error boundary logs to console.error for future Sentry integration
- **06-01:** DATABASE_URL_UNPOOLED falls back to DATABASE_URL for local dev compatibility
- **06-01:** Build pipeline: verify-env → migrate → build (fail fast on misconfiguration)
- **06-02:** workshoppilot.ai redirects to www.workshoppilot.ai (Vercel default with apex + www)
- **06-02:** Production Clerk keys (pk_live_, sk_live_) required — test keys blocked by verify-env.ts

### Pending Todos

- Workshops table needs deletedAt column for soft delete on user deletion (future enhancement)
- User must configure Clerk webhook endpoint and add CLERK_WEBHOOK_SECRET for user sync
- User must configure Google Gemini API key (GOOGLE_GENERATIVE_AI_API_KEY) from AI Studio

### Blockers/Concerns

- Next.js 16.1.1 shows "middleware" deprecation warning, suggests "proxy" convention (not blocking)

## Session Continuity

Last session: 2026-02-08
Stopped at: MVP 0.5 COMPLETE — all 6 phases done, live at https://workshoppilot.ai
Resume file: .planning/phases/06-production-deployment/06-02-SUMMARY.md
