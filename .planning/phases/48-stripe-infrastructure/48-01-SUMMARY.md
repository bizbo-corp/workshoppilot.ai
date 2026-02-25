---
phase: 48-stripe-infrastructure
plan: 01
subsystem: payments
tags: [stripe, billing, payments, environment, server-only]

# Dependency graph
requires:
  - phase: 47-database-foundation
    provides: "credit_transactions and users tables with stripeCustomerId/stripeSessionId columns"
provides:
  - "stripe@20.4.0 SDK installed as runtime dependency"
  - "src/lib/billing/stripe.ts server-only Stripe singleton with startup safety assertions"
  - "scripts/verify-env.ts updated with all 5 Stripe env var validations"
affects: [49-checkout-flow, 50-credit-logic, 51-paywall]

# Tech tracking
tech-stack:
  added: ["stripe@^20.4.0"]
  patterns:
    - "server-only import guard on Stripe singleton (same as db/client.ts pattern)"
    - "Fail-fast module-load assertion for required env vars"
    - "Production key guard via VERCEL_ENV === 'production' check"

key-files:
  created:
    - "src/lib/billing/stripe.ts"
  modified:
    - "package.json"
    - "scripts/verify-env.ts"

key-decisions:
  - "import 'server-only' in stripe.ts prevents STRIPE_SECRET_KEY from reaching browser builds"
  - "apiVersion pinned to '2026-02-25.clover' (stripe@20.4.0 default) to prevent silent API contract changes on SDK upgrades"
  - "No @stripe/stripe-js or @stripe/react-stripe-js installed — redirect Checkout mode requires zero client-side Stripe JS"
  - "Module-level fail-fast (not lazy) mirrors db/client.ts pattern for consistent startup behavior"

patterns-established:
  - "server-only guard pattern: all server secrets modules start with 'import server-only'"
  - "Startup assertion: throw at module init if required env var missing (db/client.ts and stripe.ts both follow this)"
  - "Production test-key rejection: check VERCEL_ENV === 'production' and key prefix in both stripe.ts and verify-env.ts"

requirements-completed: [BILL-01, BILL-02]

# Metrics
duration: 8min
completed: 2026-02-25
---

# Phase 48 Plan 01: Stripe Infrastructure Summary

**stripe@20.4.0 SDK installed with server-only singleton singleton guarded by startup assertions and production key checks, plus verify-env.ts updated with all 5 Stripe env var validations**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-25T21:19:19Z
- **Completed:** 2026-02-25T21:27:00Z
- **Tasks:** 2 automated (Task 3 is checkpoint:human-action awaiting user)
- **Files modified:** 3

## Accomplishments

- Installed stripe@^20.4.0 as a runtime dependency (zero client-side Stripe packages)
- Created src/lib/billing/stripe.ts with server-only guard, fail-fast missing key assertion, and production test-key rejection
- Added all 5 Stripe env vars to verify-env.ts requiredVars array plus production sk_test_ guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Stripe SDK and create server-only singleton** - `833691a` (feat)
2. **Task 2: Update verify-env.ts with Stripe environment variables** - `1aebc80` (feat)
3. **Task 3: Create Stripe Products, configure env vars, and set up Stripe CLI** - CHECKPOINT (human-action)

**Plan metadata:** pending final commit after Task 3 complete

## Files Created/Modified

- `src/lib/billing/stripe.ts` - Server-only Stripe singleton with startup assertions and production guards
- `package.json` - Added stripe@^20.4.0 to dependencies
- `scripts/verify-env.ts` - Added 5 Stripe env vars to requiredVars, production sk_test_ guard

## Decisions Made

- Used `import 'server-only'` to enforce build-time error if Stripe module is accidentally imported in a Client Component — hard guarantee STRIPE_SECRET_KEY never reaches the browser
- Pinned `apiVersion: '2026-02-25.clover'` explicitly so SDK upgrades don't silently change API contract
- Did NOT install `@stripe/stripe-js` or `@stripe/react-stripe-js` — redirect Checkout (not Elements) means zero client-side Stripe JS needed (locked decision in STATE.md)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** Task 3 checkpoint provides complete instructions for:

1. **Part A: Stripe Dashboard** — Create test API keys, create two Products:
   - "Single Flight Workshop" — One-time $79.00 — 1 workshop credit
   - "Serial Entrepreneur Pack" — One-time $149.00 — 3 workshop credits
   - Copy resulting Price IDs

2. **Part B: Local .env.local** — Add 5 Stripe env vars:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (from Stripe CLI)
   - `STRIPE_PRICE_SINGLE_FLIGHT=price_...`
   - `STRIPE_PRICE_SERIAL_ENTREPRENEUR=price_...`

3. **Part C: Stripe CLI** — `brew install stripe/stripe-cli/stripe && stripe login && stripe listen --forward-to localhost:3000/api/webhooks/stripe`

4. **Part D: Vercel** — Add all 5 vars to Vercel Dashboard (live keys for Production, test keys for Preview)

## Next Phase Readiness

- Stripe SDK and singleton ready for use in Phase 49 (checkout flow API routes)
- Phase 49 depends on valid `STRIPE_PRICE_SINGLE_FLIGHT` and `STRIPE_PRICE_SERIAL_ENTREPRENEUR` env vars — these must be set before coding checkout route
- Vercel Deployment Protection may block `/api/webhooks/stripe` in preview — see STATE.md blocker note

---
*Phase: 48-stripe-infrastructure*
*Completed: 2026-02-25*
