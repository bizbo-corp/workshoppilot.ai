# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** Phase 47 — Database Foundation (v1.8 start)

## Current Position

Phase: 47 of 53 in v1.8 (Database Foundation)
Plan: 1 of 2 in current phase
Status: In Progress
Last activity: 2026-02-25 — Plan 47-01 complete (schema + migration 0008 applied to Neon)

Progress: [░░░░░░░░░░] 0% (v1.8 — 0/7 phases complete, plan 1/2 of phase 47 complete)

## Performance Metrics

**By Milestone:**

| Milestone | Phases | Plans | Duration |
|-----------|--------|-------|----------|
| v0.5 | 6 | 19 | 2 days |
| v1.0 | 8 | 25 | 3 days |
| v1.1 | 6 | 15 | 2 days |
| v1.2 | 4 | 9 | 2 days |
| v1.3 | 5 | 23 | 1 day |
| v1.4 | 6 | 13 | 1 day |
| v1.5 | 4 | 9 | 2 days |
| v1.6 | 2 | 5 | 1 day |
| v1.7 | 4 | 7 | <1 day |
| **Total shipped** | **45** | **125** | **15 days** |

*v1.8 metrics will be recorded after first phase completes*

## Accumulated Context

### Decisions

All prior decisions archived in PROJECT.md Key Decisions table.
Key v1.8 decisions affecting current work:

- Stripe Checkout redirect mode (not Elements) — zero client-side Stripe JS, Stripe hosts PCI surface
- Credit-based model, not subscription — target users run 1-3 workshops/year, monthly churn approaches 100%
- DB-stored onboarding state (`users.onboardingComplete`) not localStorage — persists across devices, no hydration mismatch
- Dual-trigger credit fulfillment (success page + webhook) — prevents stale-credit UX failure when user returns before webhook fires
- Server-side paywall enforcement in Step Server Component (not middleware) — middleware bypass CVE-2025-29927 makes middleware-only insufficient
- Text enum pattern for credit_transactions.type + .status (not pgEnum) — consistent with workshops.status pattern
- onDelete: 'set null' on credit_transactions.workshopId — financial records persist after workshop deletion
- stripeSessionId UNIQUE nullable — PG allows multiple NULLs, enforces idempotent webhook fulfillment (BILL-04)

### Pending Todos

None.

### Blockers/Concerns

- **Phase 50:** `neon-http` driver does not support `SELECT FOR UPDATE`. Resolve before coding `consumeCredit()`: (a) secondary `neon-ws` client for transaction only, or (b) conditional-UPDATE pattern (`WHERE credit_balance > 0 RETURNING`). Decide during Phase 50 planning.
- **Phase 48:** Vercel Deployment Protection may block `/api/webhooks/stripe` in preview — add to bypass list before Phase 49 testing begins.
- **Phase 48:** Stripe Customer pre-creation timing — at signup (extend Clerk webhook) or lazy at first checkout. Decide before Phase 48 planning.

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 47-01-PLAN.md (schema + migration 0008). Next: execute 47-02 (seed script).
Resume file: None
