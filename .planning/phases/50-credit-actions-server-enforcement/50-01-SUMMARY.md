---
phase: 50-credit-actions-server-enforcement
plan: "01"
subsystem: billing
tags: [server-actions, credit-system, paywall, atomic-operations, drizzle-orm]
dependency_graph:
  requires:
    - src/db/schema/users.ts (creditBalance column)
    - src/db/schema/workshops.ts (creditConsumedAt column — added in migration 0008)
    - src/db/schema/credit-transactions.ts (type/amount/workshopId fields)
    - src/db/client.ts (neon-http Drizzle instance)
    - src/lib/ids.ts (createPrefixedId)
  provides:
    - src/actions/billing-actions.ts (consumeCredit, getCredits, markOnboardingComplete, ConsumeCreditResult, PAYWALL_CUTOFF_DATE)
  affects:
    - Plan 50-02: imports consumeCredit() and PAYWALL_CUTOFF_DATE for server enforcement
    - Phase 51: imports consumeCredit() for Step 6→7 credit gate in advanceToNextStep()
    - Phase 52: imports markOnboardingComplete() for onboarding flow
tech_stack:
  added: []
  patterns:
    - "Atomic conditional-UPDATE: UPDATE users SET credit_balance = credit_balance - 1 WHERE clerk_user_id = $1 AND credit_balance > 0 RETURNING credit_balance"
    - "Discriminated union result type (ConsumeCreditResult) with 6 status variants"
    - "PAYWALL_CUTOFF_DATE exported constant for DRY reuse across plans"
key_files:
  created:
    - src/actions/billing-actions.ts
  modified: []
decisions:
  - "Conditional-UPDATE pattern chosen over SELECT FOR UPDATE — neon-http does not support interactive transactions; conditional-UPDATE is provably atomic at the PostgreSQL row level"
  - "PAYWALL_CUTOFF_DATE exported as named constant (not inlined) so Plan 50-02 imports it rather than duplicating the migration timestamp"
  - "Post-deduction writes (credit_transactions insert + workshop.creditConsumedAt update) run via Promise.all — not atomic, but consistent with fulfillCreditPurchase precedent; error is logged for manual reconciliation without withholding the unlock from the user"
  - "consumeCredit() does NOT call redirect() — callers inspect the discriminated union to show the appropriate dialog (confirm or paywall modal)"
metrics:
  duration: "~2 minutes"
  completed: "2026-02-26"
  tasks_completed: 2
  files_created: 1
  files_modified: 0
---

# Phase 50 Plan 01: Billing Server Actions Summary

**One-liner:** Atomic credit consumption server action with conditional-UPDATE pattern, grandfathering, idempotency, and typed discriminated union result — foundation for paywall enforcement in Plans 50-02 and beyond.

## What Was Built

Created `src/actions/billing-actions.ts` with three `'use server'` functions:

**`consumeCredit(workshopId: string): Promise<ConsumeCreditResult>`**
The core paywall function. Implements a 9-step guard chain:
1. `PAYWALL_ENABLED === 'false'` check — returns `paywall_disabled` for dev/demo
2. Clerk `auth()` — returns `error` if unauthenticated
3. Workshop fetch with ownership check (`WHERE workshop.clerk_user_id = userId AND deleted_at IS NULL`)
4. Already-unlocked idempotency check (`creditConsumedAt !== null` → `already_unlocked`)
5. Grandfathering check (`workshop.createdAt < PAYWALL_CUTOFF_DATE` → `grandfathered`)
6. Atomic conditional-UPDATE (`WHERE credit_balance > 0 RETURNING credit_balance`)
7. Zero-rows-updated guard → `insufficient_credits`
8. Post-deduction writes via `Promise.all`: insert `credit_transactions` row + set `workshop.creditConsumedAt`
9. Returns `{ status: 'consumed', newBalance }`

**`getCredits(): Promise<number>`**
On-demand credit balance reader. Returns `0` for unauthenticated callers rather than throwing. Called at paywall moments (confirm dialog, paywall modal) — not polled.

**`markOnboardingComplete(): Promise<void>`**
Sets `users.onboardingComplete = true`. Idempotent. Returns early for unauthenticated callers. Used by Phase 52 onboarding flow.

**Exported constants/types:**
- `PAYWALL_CUTOFF_DATE` — `new Date(1772051653843)` (migration 0008 timestamp = 2026-02-26T23:54:13.843Z)
- `ConsumeCreditResult` — discriminated union with 6 status variants

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1+2 | Create billing-actions.ts + TypeScript verification | 31b9906 | src/actions/billing-actions.ts (created, 191 lines) |

## Verification Results

All 9 plan verification checks passed:
- `npx tsc --noEmit` — zero errors
- `'use server'` directive on line 1
- All 5 exports present: `consumeCredit`, `getCredits`, `markOnboardingComplete`, `ConsumeCreditResult`, `PAYWALL_CUTOFF_DATE`
- Conditional-UPDATE pattern: `gt(users.creditBalance, 0)` confirmed
- Ownership check: `eq(workshops.clerkUserId, userId)` in WHERE clause
- `PAYWALL_ENABLED === 'false'` env var toggle
- Grandfathering: `workshop.createdAt < PAYWALL_CUTOFF_DATE`
- Transaction ledger: `db.insert(creditTransactions)` with `type: 'consumption'`, `amount: -1`
- Workshop unlock: `creditConsumedAt: new Date()`

## Deviations from Plan

None — plan executed exactly as written.

The plan specified wrapping the Promise.all in a try/catch with error logging for the partial-failure case. This was implemented as specified: if either post-deduction write fails after credit deduction, the error is logged with workshopId and userId for manual reconciliation, and the function still returns `{ status: 'consumed', newBalance }` since the credit was already deducted.

## Self-Check: PASSED

- [x] `src/actions/billing-actions.ts` — FOUND
- [x] Commit `31b9906` — FOUND
- [x] `npx tsc --noEmit` — PASSED (zero errors)
- [x] All required exports present
