---
phase: 49-payment-api-layer
plan: 01
subsystem: payments
tags: [stripe, billing, checkout, api-routes, server-only, drizzle]

# Dependency graph
requires:
  - phase: 48-stripe-infrastructure
    provides: "stripe.ts server-only singleton, Stripe Products created, STRIPE_PRICE env vars set"
  - phase: 47-database-foundation
    provides: "users table with stripeCustomerId column"
provides:
  - "src/lib/billing/price-config.ts — server-only priceId-to-creditQty map with getPriceConfig()"
  - "src/app/api/billing/checkout/route.ts — POST handler creating Stripe Checkout Session with 303 redirect"
  - "Lazy Stripe Customer creation pattern on first checkout with stripeCustomerId persisted to DB"
affects: [50-credit-logic, 51-paywall, 52-success-cancel-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side price map (not client-supplied credit quantities) — client never controls what credit qty they receive"
    - "Lazy Stripe Customer creation at first checkout — no Clerk webhook extension needed"
    - "303 redirect (not 302) for POST->GET redirect to Stripe-hosted checkout"
    - "Stripe template variable {CHECKOUT_SESSION_ID} in success_url — not JS interpolation"

key-files:
  created:
    - "src/lib/billing/price-config.ts"
    - "src/app/api/billing/checkout/route.ts"
  modified: []

key-decisions:
  - "Server-side price map (getPriceConfig) — client never supplies creditQty; server validates priceId and resolves credit quantity"
  - "Lazy Stripe Customer creation at first checkout (not at signup via Clerk webhook) — simpler, no race conditions with user creation"
  - "303 status code for POST->GET redirect to Stripe hosted checkout — semantically correct for form/API submission redirect"
  - "Metadata on Checkout Session includes clerkUserId + creditQty (string) + productType — enables idempotent webhook fulfillment in Phase 50"

patterns-established:
  - "Auth guard pattern: auth() from @clerk/nextjs/server, NextResponse.json 401 if no userId"
  - "Price validation: getPriceConfig(priceId) returns null for unknown IDs, route returns 400"
  - "Lazy customer pattern: check user.stripeCustomerId, create if null, persist immediately before creating session"

requirements-completed: [BILL-01, BILL-02]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 49 Plan 01: Payment API Layer Summary

**Stripe Checkout route handler with server-side price validation, lazy Stripe Customer creation, and 303 redirect — client never controls credit quantities**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T22:30:11Z
- **Completed:** 2026-02-26T22:31Z
- **Tasks:** 2 (Task 0 was human-action pre-condition already satisfied; Task 1 automated)
- **Files modified:** 2

## Accomplishments

- Created `src/lib/billing/price-config.ts` with `import 'server-only'` guard, `PriceConfig` interface, and `getPriceConfig()` function mapping Stripe Price IDs to credit quantities server-side
- Created `src/app/api/billing/checkout/route.ts` POST handler with full auth (401), price validation (400), lazy Stripe Customer creation persisted to DB, Checkout Session creation with metadata, and 303 redirect to `session.url`
- Task 0 (env var update from `prod_` to `price_` IDs) was already completed by user before this plan executed

## Task Commits

Each task was committed atomically:

1. **Task 0: Update STRIPE_PRICE env vars from product IDs to price IDs** - human-action (pre-condition already satisfied — env vars already `price_` format)
2. **Task 1: Create server-side price configuration map and Stripe Checkout route handler** - `1ed57bf` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/lib/billing/price-config.ts` - Server-only module with `PriceConfig` interface and `getPriceConfig(priceId)` function; maps STRIPE_PRICE_SINGLE_FLIGHT (1 credit) and STRIPE_PRICE_SERIAL_ENTREPRENEUR (3 credits)
- `src/app/api/billing/checkout/route.ts` - POST handler: auth → price validation → lazy Stripe Customer → Checkout Session → 303 redirect

## Decisions Made

- **Server-side price map:** Client sends only `priceId`; server validates it against a known map and resolves `creditQty`. Client can never fake the credit quantity they receive.
- **Lazy Stripe Customer at checkout:** Rather than extending the Clerk webhook to pre-create Stripe Customers at signup, customers are created on the first checkout attempt. Simpler, no race conditions, and most users may never pay.
- **303 redirect:** `NextResponse.redirect(session.url!, 303)` is the semantically correct response for POST→GET redirects (vs 302 which browsers may re-POST). Used `NextResponse.redirect` not `redirect()` from `next/navigation` which throws internally.
- **Stripe template variable:** `{CHECKOUT_SESSION_ID}` in `success_url` is a Stripe-side template variable. Used as a literal string, not JS interpolation, so Stripe replaces it with the actual session ID on redirect.
- **Metadata for webhook fulfillment:** `clerkUserId`, `creditQty` (string — Stripe metadata values must be strings), and `productType` included so Phase 50 webhook handler has all data needed for idempotent credit fulfillment.

## Deviations from Plan

None - plan executed exactly as written. Task 0 was pre-satisfied (env vars already updated to `price_` format).

## Issues Encountered

None.

## User Setup Required

Task 0 (human-action checkpoint) was already completed before this plan ran: STRIPE_PRICE_SINGLE_FLIGHT and STRIPE_PRICE_SERIAL_ENTREPRENEUR in `.env.local` were already updated from `prod_` to `price_` format.

## Next Phase Readiness

- Checkout route ready for frontend "Buy Now" buttons to POST `{ priceId }` to `/api/billing/checkout`
- Phase 50 (credit logic) can use the `metadata.creditQty` and `metadata.clerkUserId` from Checkout Session to fulfill credits in webhook handler
- Phase 52 (success/cancel pages) need `/purchase/success?session_id=...` and `/purchase/cancel` routes created to match the URLs in this route handler
- Vercel Deployment Protection may block `/api/webhooks/stripe` in preview — add to bypass list before Phase 49 webhook testing begins (noted in STATE.md blockers)

## Self-Check: PASSED

- src/lib/billing/price-config.ts: FOUND
- src/app/api/billing/checkout/route.ts: FOUND
- .planning/phases/49-payment-api-layer/49-01-SUMMARY.md: FOUND
- Commit 1ed57bf (Task 1): FOUND
- Commit c7cfdde (docs final): FOUND

---
*Phase: 49-payment-api-layer*
*Completed: 2026-02-26*
