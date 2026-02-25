---
phase: 49-payment-api-layer
plan: 02
subsystem: payments
tags: [stripe, webhooks, drizzle, postgres, idempotency, credits]

# Dependency graph
requires:
  - phase: 48-stripe-infrastructure
    provides: stripe singleton (src/lib/billing/stripe.ts) with HMAC verification support
  - phase: 47-database-foundation
    provides: credit_transactions and users schema with stripeSessionId UNIQUE constraint and creditBalance column

provides:
  - Shared idempotent fulfillCreditPurchase function callable from both webhook and success page
  - Stripe webhook handler at /api/webhooks/stripe with HMAC signature verification
  - FulfillResult discriminated union type for structured fulfillment outcomes
affects:
  - 49-payment-api-layer (Plan 49-03 success page calls fulfillCreditPurchase)
  - 50-credit-consumption (consume logic follows same transaction pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotent insert via onConflictDoNothing on UNIQUE stripeSessionId — sole gate preventing double-fulfillment"
    - "Atomic creditBalance increment via Drizzle sql template (sql`${users.creditBalance} + ${creditQty}`)"
    - "balanceAfter written from RETURNING result of increment (not pre-computed) to avoid race condition"
    - "Webhook raw body via req.text() (never req.json()) to preserve HMAC integrity"
    - "400 for invalid/missing signatures (Stripe will not retry 4xx), 500 for handler errors (Stripe retries)"
    - "200 for unhandled event types to avoid needless Stripe delivery failures"
    - "Dual-event handling: checkout.session.completed + checkout.session.async_payment_succeeded for deferred payment methods"

key-files:
  created:
    - src/lib/billing/fulfill-credit-purchase.ts
    - src/app/api/webhooks/stripe/route.ts
  modified: []

key-decisions:
  - "fulfillCreditPurchase does NOT use a DB transaction (neon-http does not support interactive multi-statement transactions) — onConflictDoNothing provides idempotency safety on retries"
  - "balanceAfter is set from the RETURNING result of the atomic increment (not pre-computed) to reflect actual post-increment balance and avoid Pitfall 4 race condition"
  - "400 returned for invalid Stripe signatures (not 500) — bad signature is not transient, Stripe correctly will not retry 4xx"
  - "Both checkout.session.completed and checkout.session.async_payment_succeeded handled — latter covers deferred payment methods (ACH, etc.)"

patterns-established:
  - "FulfillResult: discriminated union pattern for structured async outcomes (fulfilled/already_fulfilled/payment_not_paid/user_not_found)"
  - "Webhook handler: raw body + HMAC verify in try/catch + event dispatch in separate try/catch (same structural pattern as Clerk webhook)"

requirements-completed: [BILL-04, BILL-05]

# Metrics
duration: ~2min
completed: 2026-02-26
---

# Phase 49 Plan 02: Payment API Layer — Webhook + Fulfillment Summary

**Idempotent Stripe credit fulfillment via onConflictDoNothing UNIQUE guard, atomic SQL increment, and HMAC-verified webhook handler at /api/webhooks/stripe**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T22:30:07Z
- **Completed:** 2026-02-25T22:31:42Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- Created `fulfillCreditPurchase()` shared function with idempotency via stripeSessionId UNIQUE constraint — calling twice with same session ID produces exactly one credit_transactions row and one creditBalance increment
- Implemented Stripe webhook handler with HMAC signature verification, returning 400 for invalid signatures, 500 for handler errors (enabling Stripe retry), and 200 for unhandled event types
- Both `checkout.session.completed` and `checkout.session.async_payment_succeeded` handled for complete deferred payment method coverage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared idempotent fulfillCreditPurchase function** - `5c4b307` (feat)
2. **Task 2: Create Stripe webhook handler with HMAC signature verification** - `f0f7d14` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `src/lib/billing/fulfill-credit-purchase.ts` - Shared idempotent fulfillment function with FulfillResult type, payment_status check, onConflictDoNothing insert, atomic creditBalance increment, and balanceAfter from RETURNING
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook POST handler with raw body preservation, HMAC verification, dual-event dispatch, and structured error responses

## Decisions Made

- fulfillCreditPurchase does NOT use a DB transaction — neon-http driver does not support interactive multi-statement transactions; onConflictDoNothing idempotency is sufficient safety for retries
- balanceAfter stored from the RETURNING result of the atomic increment (not pre-computed) to accurately reflect post-increment state and avoid the race condition documented in RESEARCH.md Pitfall 4
- 400 for invalid signatures (not 500) — Stripe should not retry invalid signatures as they are not transient failures
- Both checkout.session.completed and checkout.session.async_payment_succeeded handled to support ACH and other deferred payment methods

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript type check (`tsc --noEmit`) passed cleanly after both files were created.

## User Setup Required

None - no external service configuration required beyond what Phase 48 established. STRIPE_WEBHOOK_SECRET must be set (documented in Phase 48 STATE.md).

## Next Phase Readiness

- `fulfillCreditPurchase()` is ready for Plan 49-03 (success page) to call with same behavior
- Stripe webhook endpoint `/api/webhooks/stripe` is ready to receive events once registered in Stripe Dashboard
- Pre-existing blocker: STRIPE_PRICE_SINGLE_FLIGHT and STRIPE_PRICE_SERIAL_ENTREPRENEUR must be updated from product IDs (prod_...) to price IDs (price_...) before end-to-end testing

---
*Phase: 49-payment-api-layer*
*Completed: 2026-02-26*

## Self-Check: PASSED

- FOUND: src/lib/billing/fulfill-credit-purchase.ts
- FOUND: src/app/api/webhooks/stripe/route.ts
- FOUND: .planning/phases/49-payment-api-layer/49-02-SUMMARY.md
- FOUND: commit 5c4b307 (Task 1 - fulfillCreditPurchase function)
- FOUND: commit f0f7d14 (Task 2 - Stripe webhook handler)
