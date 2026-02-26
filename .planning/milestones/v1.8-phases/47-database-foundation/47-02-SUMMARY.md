---
phase: 47-database-foundation
plan: 02
subsystem: database
tags: [seed, billing, credits, drizzle, neon, development-data]

# Dependency graph
requires:
  - 47-01 (credit_transactions table, users billing columns, workshops creditConsumedAt)
provides:
  - scripts/seed-billing.ts: Idempotent seed script with 5 billing scenarios
  - db:seed:billing npm script for one-command dev data setup
affects: [48-stripe-checkout, 49-webhook-handler, 50-credit-service, 51-paywall, 52-onboarding, 53-billing-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - idempotency-check-then-insert pattern: query for sentinel record first, skip if found; onConflictDoNothing() as safety net
    - explicit createdAt timestamps in seed data for chronological ledger ordering
    - process.exit(0) to prevent Neon HTTP connection from hanging after script completes

key-files:
  created:
    - scripts/seed-billing.ts
  modified:
    - package.json

key-decisions:
  - "Single sentinel idempotency check (query user_seed_billing_zero) rather than per-record checks — scenarios are interdependent (transactions reference workshop IDs generated at runtime)"
  - "onConflictDoNothing() retained on all inserts as safety net even with sentinel check"

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 47 Plan 02: Billing Seed Script Summary

**Idempotent billing seed script with 5 development scenarios covering zero credits, funded user, transaction ledger, refund, and pending Stripe payment**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T20:40:54Z
- **Completed:** 2026-02-25T20:43:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `scripts/seed-billing.ts` with 5 billing scenarios covering all Phase 48-53 test cases
- Implemented idempotency via sentinel record check (`user_seed_billing_zero`) before any inserts
- Scenario 3 (active user) includes explicit chronological timestamps and a workshop with `creditConsumedAt` set, demonstrating the full credit consumption flow
- Added `db:seed:billing` npm script to `package.json` matching the exact `db:seed:workshop` pattern
- Verified: first run creates all 5 scenarios; second run prints "already exists" and exits cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create idempotent billing seed script** - `0bf97ee` (feat)
2. **Task 2: Add db:seed:billing npm script and run seed** - `3860a34` (feat)

## Files Created/Modified

- `scripts/seed-billing.ts` - New: 305-line idempotent seed script with 5 billing scenarios
- `package.json` - Added `db:seed:billing` npm script (1 line, after `db:seed:workshop`)

## Seed Scenarios Covered

| Scenario | clerkUserId | Credits | Transactions | Use Case |
|----------|-------------|---------|--------------|----------|
| 1 | user_seed_billing_zero | 0 | 0 | Paywall UI (Phase 51) |
| 2 | user_seed_billing_funded | 3 | 1 purchase | Credit consumption (Phase 50) |
| 3 | user_seed_billing_active | 1 | 5 (2 purchase, 3 consumption) + 1 workshop | Transaction ledger (BILL-05) |
| 4 | user_seed_billing_refund | 0 | 2 (purchase + refund) | Refund flow |
| 5 | user_seed_billing_pending | 0 | 1 pending purchase | Async Stripe flow (Phase 49) |

## Decisions Made

- Used a single sentinel check (`query for user_seed_billing_zero`) rather than per-row idempotency for all inserts, since scenarios are interdependent (transaction records reference runtime-generated workshop IDs from Scenario 3)
- Retained `onConflictDoNothing()` on all inserts as a belt-and-suspenders safety net
- Explicit `createdAt` timestamps in Scenario 3 ensure chronological ordering in the transaction ledger, which is important for BILL-05 (transaction history display)

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

- All seed scenarios are in the production Neon database and ready for Phase 48-53 development
- Run `npm run db:seed:billing` on any new dev machine to set up test data instantly
- Scenario 3 (`user_seed_billing_active`) specifically covers BILL-05 (transaction ledger) with 5 transactions in chronological order

---
*Phase: 47-database-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED

Files verified:
- scripts/seed-billing.ts - FOUND
- package.json (db:seed:billing entry) - FOUND (grep -c returns 1)

Commits verified:
- 0bf97ee (Task 1) - FOUND
- 3860a34 (Task 2) - FOUND

Seed script execution verified:
- First run: all 5 scenarios created successfully
- Second run: "Billing seed data already exists. Skipping." (idempotent)
