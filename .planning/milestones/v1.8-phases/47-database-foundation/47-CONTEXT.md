# Phase 47: Database Foundation - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Billing and onboarding schema migrations. Add credit balance, onboarding state, and Stripe customer ID to users table. Add credit consumption tracking to workshops table. Create credit_transactions ledger table. Run Drizzle migrations on production Neon database with zero downtime. Include seed script for development.

</domain>

<decisions>
## Implementation Decisions

### Transaction ledger depth
- Include `amount` column (signed integer: +1 purchase, -1 consumption, negative for refunds)
- Include `workshopId` foreign key (nullable) linking consumption transactions to the specific workshop
- Include `description` text column for human-readable context (e.g., "Purchased Single Flight pack", "Credit consumed for Workshop: Mobile App Discovery")
- Include `balanceAfter` integer column storing the running balance after each transaction
- Include `status` enum column (pending, completed, failed) to support async Stripe flows
- Type enum expanded to: purchase | consumption | refund (refund added now to avoid future migration)

### Existing user migration
- `onboardingComplete` defaults to `false` for ALL users (existing users will see the new onboarding)
- `creditBalance` defaults to `0` — no free credits for existing users
- Existing workshops keep `creditConsumedAt` as null (pre-credit-system, no credit was consumed)
- Migration wrapped in a single atomic transaction — all changes succeed or fail together

### Schema future-proofing
- Add `planTier` varchar column to users table with default `'free'` (prepares for subscription model)
- Add `deletedAt` nullable timestamp to both users and workshops tables (soft-delete pattern)
- Add `updatedAt` timestamp to users table for tracking record changes

### Seed data
- Create seed script runnable via `npm run db:seed`
- Comprehensive scenarios: user with 0 credits, user with credits, user with transaction history, user with refund, user mid-onboarding, user with many workshops, edge cases
- Script must be idempotent — check if data exists before inserting, safe to re-run

### Claude's Discretion
- Credit amount column design (signed integer vs separate amount + direction)
- Idempotency mechanism beyond stripeSessionId UNIQUE constraint
- Stripe metadata storage (priceId, productId columns vs just stripeSessionId)
- Exact index strategy for common query patterns
- Compression algorithm and temp file handling details

</decisions>

<specifics>
## Specific Ideas

- Running balance (`balanceAfter`) enables balance auditing without summing all rows
- Status column supports the async flow: create "pending" on Stripe session start, mark "completed" on webhook confirmation
- Soft delete on workshops supports future archival features without data loss
- Seed script should cover edge cases to help develop Phase 48-53 (Stripe, payments, credit enforcement, paywall UI)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 47-database-foundation*
*Context gathered: 2026-02-26*
