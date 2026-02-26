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
  - "Two Stripe Products created in Dashboard (Single Flight $79, Serial Entrepreneur $149)"
  - "Stripe webhook endpoint configured at https://workshoppilot.ai/api/webhooks/stripe (production)"
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
  - "STRIPE_WEBHOOK_SECRET set to Dashboard endpoint secret (production webhook at workshoppilot.ai) — Stripe CLI whsec_ needed separately for local testing"

patterns-established:
  - "server-only guard pattern: all server secrets modules start with 'import server-only'"
  - "Startup assertion: throw at module init if required env var missing (db/client.ts and stripe.ts both follow this)"
  - "Production test-key rejection: check VERCEL_ENV === 'production' and key prefix in both stripe.ts and verify-env.ts"

requirements-completed: [BILL-01, BILL-02]

# Metrics
duration: 20min
completed: 2026-02-26
---

# Phase 48 Plan 01: Stripe Infrastructure Summary

**stripe@20.4.0 SDK installed with server-only singleton guarded by startup assertions, verify-env.ts updated with all 5 Stripe env var validations, and Stripe Products created with production webhook endpoint configured**

## Performance

- **Duration:** ~20 min (includes user setup at Task 3 checkpoint)
- **Started:** 2026-02-25T21:19:19Z
- **Completed:** 2026-02-26
- **Tasks:** 3 (2 automated + 1 human-action checkpoint completed)
- **Files modified:** 3

## Accomplishments

- Installed stripe@^20.4.0 as a runtime dependency (zero client-side Stripe packages)
- Created src/lib/billing/stripe.ts with server-only guard, fail-fast missing key assertion, and production test-key rejection
- Added all 5 Stripe env vars to verify-env.ts requiredVars array plus production sk_test_ guard
- User created two Stripe Products in Dashboard: "Single Flight Workshop" ($79) and "Serial Entrepreneur Pack" ($149)
- Production webhook endpoint registered at https://workshoppilot.ai/api/webhooks/stripe
- All 5 env vars set in .env.local with real Stripe values

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Stripe SDK and create server-only singleton** - `833691a` (feat)
2. **Task 2: Update verify-env.ts with Stripe environment variables** - `1aebc80` (feat)
3. **Task 3: Create Stripe Products, configure env vars, and set up Stripe CLI** - human-action (no code commit — user setup)

**Plan metadata:** `42e86d1` (docs: complete stripe-infrastructure plan 01)

## Files Created/Modified

- `src/lib/billing/stripe.ts` - Server-only Stripe singleton with startup assertions and production guards
- `package.json` - Added stripe@^20.4.0 to dependencies
- `scripts/verify-env.ts` - Added 5 Stripe env vars to requiredVars, production sk_test_ guard

## Decisions Made

- Used `import 'server-only'` to enforce build-time error if Stripe module is accidentally imported in a Client Component — hard guarantee STRIPE_SECRET_KEY never reaches the browser
- Pinned `apiVersion: '2026-02-25.clover'` explicitly so SDK upgrades don't silently change API contract
- Did NOT install `@stripe/stripe-js` or `@stripe/react-stripe-js` — redirect Checkout (not Elements) means zero client-side Stripe JS needed (locked decision in STATE.md)

## Deviations from Plan

None - plan executed exactly as written. Task 3 (human-action checkpoint) completed by user as specified.

## Issues Encountered

**Action Required Before Phase 49:** The `STRIPE_PRICE_SINGLE_FLIGHT` and `STRIPE_PRICE_SERIAL_ENTREPRENEUR` env vars are currently set to Stripe Product IDs (`prod_...`) instead of Price IDs (`price_...`). The checkout flow in Phase 49 requires Price IDs to create a Checkout Session. To fix:

1. Go to https://dashboard.stripe.com (Test mode) → Products
2. Click on "Single Flight Workshop" → under Pricing, copy the Price ID (`price_...` format)
3. Click on "Serial Entrepreneur Pack" → under Pricing, copy the Price ID (`price_...` format)
4. Update `.env.local`:
   ```
   STRIPE_PRICE_SINGLE_FLIGHT=price_XXXXXXXXXX
   STRIPE_PRICE_SERIAL_ENTREPRENEUR=price_XXXXXXXXXX
   ```
5. Also update these values in Vercel Dashboard → Project Settings → Environment Variables

This does not block Phase 48 completion (the SDK and singleton are working). It must be resolved before Phase 49 checkout API route can be tested end-to-end.

## User Setup Status

Task 3 human-action checkpoint completed by user with the following outcomes:

1. **Part A: Stripe Dashboard** - Two Products created:
   - "Single Flight Workshop" — One-time $79.00 — 1 workshop credit (product ID: prod_U2vWFKThHIkKtK)
   - "Serial Entrepreneur Pack" — One-time $149.00 — 3 workshop credits (product ID: prod_U2vXQPXVplxIIM)
   - NOTE: Price IDs (`price_...`) still needed — see Issues Encountered above

2. **Part B: Local .env.local** — All 5 Stripe env vars set:
   - `STRIPE_SECRET_KEY=sk_test_...` (real test key)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` (real test key)
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (Dashboard endpoint secret for production webhook)
   - `STRIPE_PRICE_SINGLE_FLIGHT=prod_...` (needs updating to price_...)
   - `STRIPE_PRICE_SERIAL_ENTREPRENEUR=prod_...` (needs updating to price_...)

3. **Part C: Production Webhook** — Endpoint registered at https://workshoppilot.ai/api/webhooks/stripe. The STRIPE_WEBHOOK_SECRET in .env.local reflects the Dashboard endpoint secret. For local development with stripe listen, a separate CLI whsec_ value is generated at runtime.

4. **Part D: Vercel** — Assumed complete (user set up production webhook endpoint, suggesting Vercel deployment is configured)

## Verification Results

All code-side checks pass:

- stripe@^20.4.0 in package.json dependencies: PASS
- @stripe/stripe-js NOT installed: PASS
- @stripe/react-stripe-js NOT installed: PASS
- src/lib/billing/stripe.ts exists with server-only + apiVersion: PASS
- scripts/verify-env.ts has 7 STRIPE references (>= 6 required): PASS
- No client-side Stripe imports in src/: PASS

## Next Phase Readiness

- Stripe SDK and singleton ready for Phase 49 (checkout flow API routes)
- STRIPE_PRICE_SINGLE_FLIGHT and STRIPE_PRICE_SERIAL_ENTREPRENEUR must be updated to price_ IDs before Phase 49 end-to-end testing
- Production webhook at https://workshoppilot.ai/api/webhooks/stripe is registered (Dashboard endpoint secret captured in STRIPE_WEBHOOK_SECRET)
- For local testing in Phase 49: run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` to get a CLI whsec_ value (override STRIPE_WEBHOOK_SECRET locally while listening)

## Self-Check: PASSED

- src/lib/billing/stripe.ts: FOUND
- scripts/verify-env.ts: FOUND
- 48-01-SUMMARY.md: FOUND
- Commit 833691a (Task 1): FOUND
- Commit 1aebc80 (Task 2): FOUND
- Commit 42e86d1 (docs prior): FOUND
- Commit bc730c6 (docs final): FOUND

---
*Phase: 48-stripe-infrastructure*
*Completed: 2026-02-26*
