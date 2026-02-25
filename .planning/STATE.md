---
gsd_state_version: 1.0
milestone: v0.5
milestone_name: Onboarding + Payments
status: unknown
last_updated: "2026-02-25T22:10:52.475Z"
progress:
  total_phases: 38
  completed_phases: 38
  total_plans: 107
  completed_plans: 107
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** Phase 49 — Payment API Layer

## Current Position

Phase: 49 of 53 in v1.8 (Payment API Layer)
Plan: 2 of 3 in current phase
Status: Plan 49-02 Complete — advancing to Plan 49-03
Last activity: 2026-02-26 — Plan 49-02 complete (fulfillCreditPurchase idempotent function, Stripe webhook handler)

Progress: [███░░░░░░░] 43% (v1.8 — 3/7 phases complete)

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
- Seed idempotency: sentinel-record check (query user_seed_billing_zero) rather than per-row checks — scenarios are interdependent (transactions reference runtime-generated workshop IDs)
- [Phase 48-stripe-infrastructure]: stripe.ts uses import 'server-only' and module-load fail-fast assertion (same pattern as db/client.ts)
- [Phase 48-stripe-infrastructure]: No @stripe/stripe-js or @stripe/react-stripe-js installed — redirect Checkout mode requires zero client-side Stripe JS
- [Phase 48-stripe-infrastructure]: STRIPE_WEBHOOK_SECRET set to Dashboard endpoint secret (production webhook at workshoppilot.ai); Stripe CLI whsec_ needed separately for local testing
- [Phase 48-stripe-infrastructure]: apiVersion pinned to '2026-02-25.clover' in stripe.ts to prevent silent API contract changes on SDK upgrades
- [Phase 49-payment-api-layer]: Server-side price map (getPriceConfig) — client sends only priceId, server validates and resolves creditQty; client can never fake credit quantity
- [Phase 49-payment-api-layer]: Lazy Stripe Customer creation at first checkout (not at signup via Clerk webhook) — simpler, no race conditions
- [Phase 49-payment-api-layer]: 303 redirect (not 302) for POST->GET to Stripe hosted checkout via NextResponse.redirect
- [Phase 49-payment-api-layer]: Checkout Session metadata includes clerkUserId + creditQty (string) + productType for idempotent webhook fulfillment in Phase 50
- [Phase 49-payment-api-layer]: fulfillCreditPurchase does NOT use DB transaction (neon-http does not support interactive multi-statement transactions) — onConflictDoNothing on stripeSessionId UNIQUE provides idempotency
- [Phase 49-payment-api-layer]: balanceAfter written from RETURNING result of atomic increment (not pre-computed) — avoids RESEARCH.md Pitfall 4 race condition
- [Phase 49-payment-api-layer]: 400 for invalid Stripe signatures (not 500) — bad signature is not transient; Stripe will not retry 4xx
- [Phase 49-payment-api-layer]: Both checkout.session.completed and checkout.session.async_payment_succeeded handled — latter covers ACH and deferred payment methods

### Pending Todos

None.

### Blockers/Concerns

- **Phase 50:** `neon-http` driver does not support `SELECT FOR UPDATE`. Resolve before coding `consumeCredit()`: (a) secondary `neon-ws` client for transaction only, or (b) conditional-UPDATE pattern (`WHERE credit_balance > 0 RETURNING`). Decide during Phase 50 planning.
- **Phase 49:** Vercel Deployment Protection may block `/api/webhooks/stripe` in preview — add to bypass list before Phase 49 webhook testing begins (still relevant for plan 49-02).
- **Phase 52:** `/purchase/success` and `/purchase/cancel` pages must be created to match URLs used in checkout/route.ts.

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 49-02-PLAN.md (fulfillCreditPurchase idempotent function, Stripe webhook handler at /api/webhooks/stripe). Next: Phase 49 Plan 03 (success page + credit display).
Resume file: None
