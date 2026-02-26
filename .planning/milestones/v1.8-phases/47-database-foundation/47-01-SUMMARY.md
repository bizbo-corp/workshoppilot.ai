---
phase: 47-database-foundation
plan: 01
subsystem: database
tags: [drizzle, postgres, neon, schema, migrations, stripe, credits, onboarding]

# Dependency graph
requires: []
provides:
  - users table billing columns: creditBalance (int, default 0), onboardingComplete (bool, default false), stripeCustomerId (nullable text), planTier (text, default 'free')
  - workshops table: creditConsumedAt (timestamp, nullable) for credit consumption tracking
  - credit_transactions ledger table: complete schema with type enum (purchase/consumption/refund), status enum (pending/completed/failed), stripeSessionId UNIQUE constraint, workshopId FK (onDelete set null)
  - Drizzle migration 0008_shocking_sphinx.sql applied to Neon production database
  - Drizzle relations updated: usersRelations, workshopsRelations, creditTransactionsRelations
affects: [48-stripe-checkout, 49-webhook-handler, 50-credit-service, 51-paywall, 52-onboarding, 53-billing-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - text enum pattern (not pgEnum) for type-safe enums: text('col', { enum: [...] }).$type<...>()
    - onDelete 'set null' for financial records that must outlive their referenced entity
    - UNIQUE constraint on nullable stripeSessionId for idempotent Stripe webhook fulfillment
    - clerkUserId text-match pattern (no FK) for user-entity logical relations

key-files:
  created:
    - src/db/schema/credit-transactions.ts
    - drizzle/0008_shocking_sphinx.sql
    - drizzle/meta/0008_snapshot.json
  modified:
    - src/db/schema/users.ts
    - src/db/schema/workshops.ts
    - src/db/schema/index.ts
    - src/db/schema/relations.ts

key-decisions:
  - "Text enum (not pgEnum) for credit_transactions.type and .status — consistent with existing workshops.status pattern"
  - "onDelete: 'set null' on credit_transactions.workshopId — financial records must persist even when workshops are deleted"
  - "stripeSessionId UNIQUE nullable — PG allows multiple NULLs, enforces idempotent webhook fulfillment (BILL-04)"
  - "Auto-fixed: inserted migration tracking records for 0003-0007 which were applied manually, bypassing Drizzle tracker"

patterns-established:
  - "Text enum pattern: text('col', { enum: [...] }).notNull().$type<...>() — no pgEnum required"
  - "Nullable UNIQUE for optional dedup: column.unique() without notNull() allows multiple NULLs in PG"
  - "Financial record FK pattern: onDelete set null preserves transaction history on referenced entity deletion"

requirements-completed: [BILL-04, BILL-05, CRED-03, ONBD-03]

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 47 Plan 01: Database Foundation Schema Summary

**Billing/onboarding columns on users+workshops and credit_transactions ledger table with Drizzle migration 0008 applied to Neon production**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T20:32:48Z
- **Completed:** 2026-02-25T20:37:39Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added 4 billing/onboarding columns to users table: creditBalance, onboardingComplete, stripeCustomerId, planTier
- Added creditConsumedAt timestamp to workshops table for tracking credit consumption per workshop
- Created credit_transactions ledger table (10 columns) with UNIQUE on stripeSessionId for idempotent webhook fulfillment
- Applied Drizzle migration 0008 to production Neon database — additive-only, zero downtime

## Task Commits

Each task was committed atomically:

1. **Task 1: Add billing and onboarding columns to users and workshops schemas** - `045cf05` (feat)
2. **Task 2: Create credit_transactions ledger table and update barrel exports and relations** - `65a1406` (feat)
3. **Task 3: Generate and apply Drizzle migration** - `381b9cd` (feat)

## Files Created/Modified
- `src/db/schema/users.ts` - Added creditBalance, onboardingComplete, stripeCustomerId, planTier columns + stripeCustomerIdIdx
- `src/db/schema/workshops.ts` - Added creditConsumedAt nullable timestamp column
- `src/db/schema/credit-transactions.ts` - New: complete credit ledger table with all 10 columns and 3 indexes
- `src/db/schema/index.ts` - Added barrel export for credit-transactions
- `src/db/schema/relations.ts` - Added creditTransactions to usersRelations + workshopsRelations, added creditTransactionsRelations block
- `drizzle/0008_shocking_sphinx.sql` - New: additive-only migration SQL
- `drizzle/meta/0008_snapshot.json` - New: Drizzle schema snapshot for 0008

## Decisions Made
- Used text enums (not pgEnum) for `type` and `status` on credit_transactions, consistent with existing workshops.status pattern
- Used `onDelete: 'set null'` on workshopId FK — financial records must persist even if workshop is deleted
- UNIQUE nullable on stripeSessionId — PG allows multiple NULLs with UNIQUE, correctly allows consumption transactions (no Stripe session) while preventing duplicate fulfillment on purchase transactions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Synced Drizzle migration tracking records for migrations 0003-0007**
- **Found during:** Task 3 (Generate and apply Drizzle migration)
- **Issue:** Migrations 0003-0007 were previously applied directly to the database (bypassing Drizzle's `db:migrate` command), so `drizzle.__drizzle_migrations` only had 3 entries (0000-0002). When `db:migrate` ran, it tried to re-apply 0003 which failed with `column "color" of relation "workshops" already exists`
- **Fix:** Computed the correct SHA256 hashes of SQL file content for migrations 0003-0007 (matching Drizzle's hash algorithm), then inserted tracking records into `drizzle.__drizzle_migrations`. Subsequent `db:migrate` correctly identified only 0008 as unapplied and ran it successfully
- **Files modified:** None (database only — migration tracking table)
- **Verification:** `npm run db:migrate` completed with "migrations applied successfully!" after fix; all new columns confirmed in production DB
- **Committed in:** `381b9cd` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix was necessary to unblock migration application. No schema changes required. No scope creep.

## Issues Encountered
- Drizzle migration tracker desync: migrations 0003-0007 were manually applied to DB in a prior session, bypassing Drizzle's migration tracking. Fixed by computing and inserting the correct hash records (SHA256 of raw SQL content, Drizzle's internal algorithm).

## User Setup Required
None - no external service configuration required. Migration applied directly to production Neon database using existing DATABASE_URL_UNPOOLED credentials.

## Next Phase Readiness
- All v1.8 database schema is complete — phases 48-53 can proceed without schema changes
- credit_transactions table ready for Phase 49 (Stripe webhook handler) and Phase 50 (credit service)
- users.creditBalance ready for Phase 50 (consumeCredit) and Phase 51 (paywall enforcement)
- users.onboardingComplete ready for Phase 52 (onboarding flow)
- workshops.creditConsumedAt ready for Phase 50 (credit consumption)
- Blocker noted in STATE.md: neon-http driver does not support SELECT FOR UPDATE — resolve during Phase 50 planning (conditional-UPDATE pattern recommended)

---
*Phase: 47-database-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED

All files verified:
- src/db/schema/users.ts - FOUND
- src/db/schema/workshops.ts - FOUND
- src/db/schema/credit-transactions.ts - FOUND
- src/db/schema/index.ts - FOUND
- src/db/schema/relations.ts - FOUND
- drizzle/0008_shocking_sphinx.sql - FOUND
- 47-01-SUMMARY.md - FOUND

All commits verified:
- 045cf05 Task 1 - FOUND
- 65a1406 Task 2 - FOUND
- 381b9cd Task 3 - FOUND

All production DB columns verified (15/15 columns across users, workshops, credit_transactions) - PASSED
