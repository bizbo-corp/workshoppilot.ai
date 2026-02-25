# Phase 47: Database Foundation - Research

**Researched:** 2026-02-26
**Domain:** Drizzle ORM schema migrations — PostgreSQL (Neon)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Transaction ledger depth:**
- Include `amount` column (signed integer: +1 purchase, -1 consumption, negative for refunds)
- Include `workshopId` foreign key (nullable) linking consumption transactions to the specific workshop
- Include `description` text column for human-readable context (e.g., "Purchased Single Flight pack", "Credit consumed for Workshop: Mobile App Discovery")
- Include `balanceAfter` integer column storing the running balance after each transaction
- Include `status` enum column (pending, completed, failed) to support async Stripe flows
- Type enum expanded to: purchase | consumption | refund (refund added now to avoid future migration)

**Existing user migration:**
- `onboardingComplete` defaults to `false` for ALL users (existing users will see the new onboarding)
- `creditBalance` defaults to `0` — no free credits for existing users
- Existing workshops keep `creditConsumedAt` as null (pre-credit-system, no credit was consumed)
- Migration wrapped in a single atomic transaction — all changes succeed or fail together

**Schema future-proofing:**
- Add `planTier` varchar column to users table with default `'free'`
- Add `deletedAt` nullable timestamp to both users and workshops tables (soft-delete pattern) — NOTE: users and workshops already have `deletedAt` in the codebase; confirm before adding
- Add `updatedAt` timestamp to users table — NOTE: users already has `updatedAt`; do not add again

**Seed data:**
- Create seed script runnable via `npm run db:seed`
- Comprehensive scenarios: user with 0 credits, user with credits, user with transaction history, user with refund, user mid-onboarding, user with many workshops, edge cases
- Script must be idempotent — check if data exists before inserting, safe to re-run

### Claude's Discretion
- Credit amount column design (signed integer vs separate amount + direction)
- Idempotency mechanism beyond stripeSessionId UNIQUE constraint
- Stripe metadata storage (priceId, productId columns vs just stripeSessionId)
- Exact index strategy for common query patterns

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-04 | Stripe webhook handles payment confirmation with idempotent credit fulfillment | `stripeSessionId UNIQUE` constraint on `credit_transactions` enforces DB-level idempotency; status enum (pending/completed/failed) supports async Stripe webhook flow |
| BILL-05 | Credit purchases are recorded in a transaction ledger | `credit_transactions` table with amount, type, status, balanceAfter, description provides a complete audit ledger |
| CRED-03 | Credit consumption is atomic (no double-spend under concurrent requests) | `creditBalance` on users + conditional UPDATE pattern (`WHERE credit_balance > 0`) enables atomic decrement; noted blocker from STATE.md for Phase 50 |
| ONBD-03 | Onboarding state persists across devices (DB-backed, not just localStorage) | `onboardingComplete` boolean on users table (DB-backed) satisfies device-agnostic persistence |
</phase_requirements>

---

## Summary

Phase 47 is a pure schema migration phase using the established Drizzle ORM + Neon stack. The project already has 8 migrations (0000–0007) and a mature pattern for schema files, so this phase follows established conventions closely. The work involves three types of changes: (1) ALTER TABLE to add new columns to `users` and `workshops`, (2) CREATE TABLE for the new `credit_transactions` ledger, and (3) a new idempotent seed script for development data.

A critical pre-check finding: the existing `users` schema already has `deletedAt` and `updatedAt` columns — the CONTEXT.md decision to "add" these is already satisfied. Similarly, `workshops` already has `deletedAt`. This means the migration only needs to add the truly new columns. If Drizzle's `generate` command is run against the current schema state, it will correctly diff only what's missing.

The PostgreSQL 11+ behaviour makes `ALTER TABLE ADD COLUMN ... DEFAULT` safe for zero downtime: adding a column with a static default (integer 0, boolean false, varchar 'free') does NOT rewrite the table and does NOT lock rows for more than a brief metadata operation. The Neon database is certainly PostgreSQL 15+, so all planned changes are safe.

**Primary recommendation:** Edit existing schema files and create a new `credit-transactions.ts` schema file, run `drizzle-kit generate` to produce the migration SQL, verify the SQL is correct, then run `drizzle-kit migrate` using `DATABASE_URL_UNPOOLED` (already configured in `drizzle.config.ts`). Create the seed script in `scripts/seed-billing.ts` following the existing seed pattern.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | Schema definition, query builder, migration runner | Already installed and in use across all 8 migrations |
| drizzle-kit | ^0.31.9 | Migration file generation, migration execution CLI | Already installed; `drizzle-kit generate` + `drizzle-kit migrate` is the established flow |
| @neondatabase/serverless | ^1.0.2 | Neon HTTP driver for serverless queries | Already installed; `neon-http` driver used in `src/db/client.ts` |
| tsx | ^4.21.0 | TypeScript script runner for seed scripts | Already installed; used by `npm run db:seed:workshop` |
| dotenv-cli | ^11.0.0 | Load `.env.local` for CLI scripts | Already installed; all `db:*` scripts use `dotenv -e .env.local --` prefix |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @paralleldrive/cuid2 | (installed) | Prefixed ID generation (`createPrefixedId('ctx')`) | New `credit_transactions` table needs an ID column following project convention |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `drizzle-kit generate` + `drizzle-kit migrate` | `drizzle-kit push` | push does not produce SQL files; not appropriate for production; project already uses generate/migrate pattern |
| Drizzle `pgEnum` | text column with enum constraint | pgEnum creates a named type in PG which is harder to evolve (requires separate ALTER TYPE for new values); text with check constraint is simpler to extend but loses DB-enforced type safety. Project uses text enums (workshops.status). Choose text enum for consistency unless strong type safety across PG tools is needed. |

**Installation:** No new packages required — all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/db/schema/
├── users.ts              # ADD: creditBalance, onboardingComplete, planTier, stripeCustomerId
├── workshops.ts          # ADD: creditConsumedAt
├── credit-transactions.ts  # NEW FILE: full ledger table
└── index.ts              # ADD: export * from './credit-transactions'

scripts/
└── seed-billing.ts       # NEW FILE: idempotent seed for billing scenarios
```

### Pattern 1: Existing Schema File Edit (users.ts)

**What:** Add new columns to existing Drizzle table definitions. Drizzle `generate` diffs the current schema against the stored snapshot and emits only the `ALTER TABLE ADD COLUMN` statements for new columns.

**When to use:** Columns added to existing tables (users, workshops).

**Example:**

```typescript
// src/db/schema/users.ts
// Source: existing project pattern + drizzle-orm/pg-core docs
import { pgTable, text, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

export const users = pgTable(
  'users',
  {
    // ... existing columns unchanged ...
    id: text('id').primaryKey().$defaultFn(() => createPrefixedId('usr')),
    clerkUserId: text('clerk_user_id').notNull().unique(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    imageUrl: text('image_url'),
    company: text('company'),
    roles: text('roles').notNull().default('["facilitator"]'),
    deletedAt: timestamp('deleted_at', { mode: 'date', precision: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).notNull().defaultNow().$onUpdate(() => new Date()),

    // --- NEW COLUMNS (Phase 47) ---
    creditBalance: integer('credit_balance').notNull().default(0),
    onboardingComplete: boolean('onboarding_complete').notNull().default(false),
    stripeCustomerId: text('stripe_customer_id'),          // nullable intentionally
    planTier: text('plan_tier').notNull().default('free'),  // varchar as text per project convention
  },
  (table) => ({
    clerkUserIdIdx: index('users_clerk_user_id_idx').on(table.clerkUserId),
    emailIdx: index('users_email_idx').on(table.email),
  })
);
```

### Pattern 2: New Schema File (credit-transactions.ts)

**What:** Create a new Drizzle table definition in a dedicated file, following the project's one-table-per-file convention. The `type` enum is defined as a pgEnum declared in the same file and exported.

**When to use:** New tables.

**Example:**

```typescript
// src/db/schema/credit-transactions.ts
// Source: drizzle-orm/pg-core docs + existing project patterns
import {
  pgTable, pgEnum, text, integer, timestamp, index, unique
} from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', [
  'purchase',
  'consumption',
  'refund',
]);

export const creditTransactionStatusEnum = pgEnum('credit_transaction_status', [
  'pending',
  'completed',
  'failed',
]);

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: text('id').primaryKey().$defaultFn(() => createPrefixedId('ctx')),
    clerkUserId: text('clerk_user_id').notNull(),
    type: creditTransactionTypeEnum('type').notNull(),
    status: creditTransactionStatusEnum('status').notNull().default('pending'),
    amount: integer('amount').notNull(),               // signed: +1 purchase, -1 consumption
    balanceAfter: integer('balance_after').notNull(),
    description: text('description').notNull(),
    workshopId: text('workshop_id').references(() => workshops.id, { onDelete: 'set null' }),  // nullable FK
    stripeSessionId: text('stripe_session_id').unique(), // UNIQUE enforces idempotency
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    clerkUserIdIdx: index('credit_transactions_clerk_user_id_idx').on(table.clerkUserId),
    statusIdx: index('credit_transactions_status_idx').on(table.status),
    typeIdx: index('credit_transactions_type_idx').on(table.type),
    workshopIdIdx: index('credit_transactions_workshop_id_idx').on(table.workshopId),
  })
);
```

**Note on pgEnum vs text enum:** The project uses text-based enums on most columns (e.g., `workshops.status`, `workshops.visibility`). Using `pgEnum` creates a named PostgreSQL type which appears separately in the migration. This is valid but deviates slightly from project convention. Either approach works; pgEnum provides stricter DB-level enforcement but requires `ALTER TYPE ... ADD VALUE` for new enum values (which is DDL-safe in PG 12+ but still a migration). Given the CONTEXT.md decision to include 'refund' now to avoid future migration, pgEnum with all 3 values is fine. The alternative is text enums consistent with existing patterns.

### Pattern 3: Adding workshops.creditConsumedAt

```typescript
// src/db/schema/workshops.ts — add to existing columns
creditConsumedAt: timestamp('credit_consumed_at', { mode: 'date', precision: 3 }),  // nullable
```

### Pattern 4: Idempotent Seed Script

**What:** A script that checks for existing data before inserting. Follows the pattern in `scripts/seed-workshop.ts` and `src/db/seed/seed-canvas-guides.ts`.

**When to use:** Development seed data that should be re-runnable without creating duplicates.

**Example (idempotency check):**

```typescript
// scripts/seed-billing.ts
import 'dotenv/config';
import { db } from '../src/db/client';
import { users, creditTransactions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seedBilling() {
  // Idempotency: check if seed data already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, 'user_seed_billing_zero_credits'))
    .limit(1);

  if (existing.length > 0) {
    console.log('Billing seed data already exists. Skipping.');
    return;
  }

  // Insert scenarios...
}
```

### Pattern 5: Migration Workflow

```bash
# Step 1: Generate migration file from schema changes
npm run db:generate
# → Creates drizzle/0008_*.sql

# Step 2: Review generated SQL before applying
# Verify ALTER TABLE statements are additive only (no drops, no rewrites)

# Step 3: Apply migration to Neon
npm run db:migrate
# → Uses DATABASE_URL_UNPOOLED from drizzle.config.ts for direct connection

# Step 4: Run seed for dev data
npm run db:seed  # (after updating package.json to point to seed-billing.ts)
```

### Anti-Patterns to Avoid

- **Do not use `drizzle-kit push` in production.** Push skips migration file generation and applies directly, breaking the migration history. All prior migrations use `generate` + `migrate`.
- **Do not attempt to add a NOT NULL column without a default to an existing populated table.** This causes a full table rewrite and locks. All new columns in this phase have defaults or are nullable.
- **Do not run migrations with the pooled connection string.** Neon's pooled connections (PgBouncer) do not support all DDL commands. The project already uses `DATABASE_URL_UNPOOLED` in `drizzle.config.ts`.
- **Do not reuse the `db:seed` script name for a different script without updating `package.json`.** Currently `db:seed` points to `scripts/seed-steps.ts`. The new billing seed should be a separate named script (e.g., `db:seed:billing`) to avoid overwriting the step seed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotent webhook credit fulfillment | Custom de-dupe logic in webhook handler | `stripeSessionId UNIQUE` constraint + DB `INSERT ... ON CONFLICT DO NOTHING` | The DB constraint is atomic and race-condition proof; custom logic is not |
| Tracking current balance | Summing all transaction rows on every read | `balanceAfter` column on each transaction row | Single-row read for balance; full audit trail for history |
| Migration atomicity | Manual SQL scripts with TRY/CATCH | Drizzle's migration wraps in a transaction automatically | Any failure rolls back the entire migration batch |

**Key insight:** The `stripeSessionId UNIQUE` constraint is the idempotency mechanism — if Stripe sends a webhook twice, the second `INSERT` hits the UNIQUE violation and fails cleanly (or use `ON CONFLICT DO NOTHING`). No application-level de-dupe needed.

---

## Common Pitfalls

### Pitfall 1: `deletedAt` and `updatedAt` Already Exist on users

**What goes wrong:** The CONTEXT.md decisions say "add `deletedAt` nullable timestamp to both users and workshops" and "add `updatedAt` timestamp to users table". Both already exist in the codebase. If Drizzle generates a migration for these, it will produce a no-op (Drizzle's snapshot system will correctly see they exist). But if the developer edits the schema trying to add them again, nothing breaks — Drizzle just ignores existing columns in the diff.

**Why it happens:** CONTEXT.md was written without inspecting the current schema.

**How to avoid:** Inspect current `users.ts` and `workshops.ts` before editing. Confirmed: `users` has `deletedAt`, `updatedAt`. `workshops` has `deletedAt`. Do NOT add these again; they generate no new migration SQL.

**Warning signs:** If `drizzle-kit generate` produces a migration that adds `deleted_at` or `updated_at` to users, something went wrong with the schema file.

### Pitfall 2: pgEnum Requires Named Type in PG; Text Enum Does Not

**What goes wrong:** Using `pgEnum` creates a PostgreSQL type (e.g., `CREATE TYPE "credit_transaction_type" AS ENUM (...)`) as a separate DDL statement before the `CREATE TABLE`. Adding new values later requires `ALTER TYPE ... ADD VALUE`, which is a separate migration. The project's existing pattern uses `text('column', { enum: [...] })` which is simpler to evolve.

**Why it happens:** Drizzle supports both approaches. pgEnum gives PG-native type safety; text enum gives more flexibility.

**How to avoid:** Either approach works for this phase. If pgEnum is chosen, the enum types must be exported and imported in `relations.ts` if needed. The migration will include `CREATE TYPE` statements before `CREATE TABLE`. This is fine for a new table.

**Warning signs:** Migration contains `CREATE TYPE` without `CREATE TABLE` — that's normal for pgEnum, not an error.

### Pitfall 3: stripeSessionId Nullable + UNIQUE Constraint Interaction

**What goes wrong:** PostgreSQL's UNIQUE constraint allows multiple NULL values in the same column (NULLs are not considered equal). This is correct behaviour for `stripeSessionId` — consumption transactions will have no Stripe session, so `stripeSessionId` is NULL on those rows. The UNIQUE constraint correctly applies only to non-NULL values.

**Why it happens:** Developers sometimes add an extra `stripeSessionId IS NOT NULL` check in application code, which is unnecessary.

**How to avoid:** No extra application-level check needed. Postgres handles this correctly. Just declare `.unique()` on the column; Drizzle generates `CONSTRAINT ... UNIQUE("stripe_session_id")`.

**Warning signs:** None — this is correct behaviour. Consumption transactions will have `NULL` stripeSessionId, which is expected.

### Pitfall 4: Seed Script `db:seed` Points to Wrong Script

**What goes wrong:** `package.json` currently has `"db:seed": "dotenv -e .env.local -- tsx scripts/seed-steps.ts"`. If this is replaced with the billing seed, the step seed is lost. If a new script `db:seed:billing` is added and the step seed is preserved, both remain runnable.

**Why it happens:** There is no `db:seed:billing` script yet.

**How to avoid:** Add `"db:seed:billing": "dotenv -e .env.local -- tsx scripts/seed-billing.ts"` to `package.json` alongside the existing `db:seed` script. Do not replace `db:seed`.

### Pitfall 5: Migration Order Dependency for pgEnum

**What goes wrong:** If `credit_transactions.ts` uses a pgEnum type and `index.ts` exports are not ordered correctly, TypeScript compilation may encounter forward reference issues in the schema barrel.

**Why it happens:** Drizzle resolves enum types at generation time from the schema barrel; if the enum is referenced before it is defined in the import order, generation may fail.

**How to avoid:** Declare the enum (`pgEnum(...)`) at the top of `credit-transactions.ts` and export it. Import the enum in `relations.ts` if needed. No circular dependencies since `credit-transactions.ts` imports from `workshops.ts` (one-directional).

---

## Code Examples

Verified patterns from official sources and project codebase:

### 1. Adding Integer Column with Default to Existing Table (Drizzle schema)

```typescript
// Source: drizzle-orm/pg-core docs + existing project pattern (canvas-guides.ts)
import { integer } from 'drizzle-orm/pg-core';

creditBalance: integer('credit_balance').notNull().default(0),
```

Generated SQL (safe, no table rewrite on PG 11+):
```sql
ALTER TABLE "users" ADD COLUMN "credit_balance" integer DEFAULT 0 NOT NULL;
```

### 2. Adding Boolean Column with Default

```typescript
// Source: drizzle-orm/pg-core docs + project pattern (canvas-guides.ts showOnlyWhenEmpty)
import { boolean } from 'drizzle-orm/pg-core';

onboardingComplete: boolean('onboarding_complete').notNull().default(false),
```

### 3. Adding Nullable Timestamp Column

```typescript
// Source: drizzle-orm/pg-core docs + project pattern (workshops.ts deletedAt)
import { timestamp } from 'drizzle-orm/pg-core';

creditConsumedAt: timestamp('credit_consumed_at', { mode: 'date', precision: 3 }),
// No .notNull() = nullable column
```

### 4. pgEnum Declaration

```typescript
// Source: drizzle-orm/pg-core docs
import { pgEnum } from 'drizzle-orm/pg-core';

export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', [
  'purchase',
  'consumption',
  'refund',
]);
```

Generated SQL:
```sql
CREATE TYPE "public"."credit_transaction_type" AS ENUM('purchase', 'consumption', 'refund');
```

### 5. Unique Constraint on Nullable Column

```typescript
// Source: drizzle-orm/pg-core docs
stripeSessionId: text('stripe_session_id').unique(),
// Nullable + unique: multiple NULLs allowed (PG standard)
```

### 6. Nullable Foreign Key

```typescript
// Source: drizzle-orm/pg-core docs
workshopId: text('workshop_id').references(() => workshops.id, { onDelete: 'set null' }),
// nullable FK: no .notNull(), onDelete: 'set null' prevents orphaned records
```

### 7. Idempotent Seed (onConflictDoNothing pattern)

```typescript
// Source: existing project pattern (seed-steps.ts uses onConflictDoUpdate)
// For seed records that should never overwrite:
await db.insert(users)
  .values(seedUserRow)
  .onConflictDoNothing();  // if clerkUserId unique constraint triggers, skip
```

### 8. Running Migration with Direct Connection

```bash
# drizzle.config.ts already uses DATABASE_URL_UNPOOLED for migrations
npm run db:generate  # generates drizzle/0008_*.sql
npm run db:migrate   # applies migration via direct Neon connection
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `drizzle-kit push` for quick dev changes | `generate` + `migrate` with SQL files | Project established this from migration 0000 | SQL files are reviewable, version-controlled, and production-safe |
| Manual SQL migration scripts | Drizzle schema-first (TypeScript) | From project start | Type-safe schema with auto-generated SQL |
| `neon()` HTTP for migrations | `DATABASE_URL_UNPOOLED` for migrations, `neon()` HTTP for app queries | Neon docs recommend | Pooled connections fail on DDL; unpooled is required for schema changes |

**Deprecated/outdated:**
- `drizzle-kit push`: Not deprecated but not used in this project for production. Avoid.
- `neon-serverless` WebSocket driver for app queries: Not used in this project; `neon-http` is sufficient for request/response patterns.

---

## Open Questions

1. **pgEnum vs text enum for `type` and `status` columns**
   - What we know: Project uses text enums (`text('col', { enum: [...] })`) for all existing enums (workshop status, visibility). pgEnum is also valid and gives PG-native type safety.
   - What's unclear: Whether the planner/developer prefers consistency with existing patterns or PG-native type enforcement.
   - Recommendation: Use **text enum** for consistency with the project's established pattern, unless PG-level type enforcement is a hard requirement. This simplifies the migration (no `CREATE TYPE` statements) and makes future value additions easier.

2. **`onDelete` behaviour for `workshopId` FK in `credit_transactions`**
   - What we know: CONTEXT.md says `workshopId` is nullable. If a workshop is deleted (soft-delete pattern is used), the hard-delete path is unclear.
   - What's unclear: Should `onDelete: 'set null'` or `onDelete: 'cascade'` be used? The project uses `onDelete: 'cascade'` for most relations.
   - Recommendation: Use `onDelete: 'set null'` since credit transaction history should persist even if the workshop is deleted. Financial records should not cascade-delete.

3. **Seed script target: `scripts/` vs `src/db/seed/`**
   - What we know: Two seeding patterns exist — `scripts/seed-workshop.ts` (in `scripts/`) and `src/db/seed/seed-canvas-guides.ts` (in `src/db/seed/`).
   - What's unclear: Which directory the new billing seed should live in. The `scripts/` directory contains CLI-run scripts; `src/db/seed/` contains scripts with their own DB connection setup.
   - Recommendation: Use `scripts/seed-billing.ts` (consistent with `seed-workshop.ts` which is the most recent and comprehensive seed script). It imports from `../src/db/client` directly.

---

## Validation Architecture

> `nyquist_validation` is not set in `.planning/config.json` — section skipped.

---

## Sources

### Primary (HIGH confidence)
- drizzle-orm/pg-core source + official docs (https://orm.drizzle.team/docs/column-types/pg) — integer, boolean, text, timestamp, pgEnum, unique constraint, foreign key references
- drizzle-orm indexes-constraints docs (https://orm.drizzle.team/docs/indexes-constraints) — unique(), .references(), index() API
- Neon drizzle-migrations guide (https://neon.com/docs/guides/drizzle-migrations) — `DATABASE_URL_UNPOOLED` for migrations, direct vs pooled connection
- Project codebase inspection — `src/db/schema/users.ts`, `workshops.ts`, `ai-usage-events.ts`, `sessions.ts`, `canvas-guides.ts`, `drizzle.config.ts`, all 8 migration files

### Secondary (MEDIUM confidence)
- GoCardless zero-downtime migrations (https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/) — confirmed PG 11+ `ALTER TABLE ADD COLUMN DEFAULT` is metadata-only, no table rewrite
- bun.uptrace.dev zero-downtime PostgreSQL migrations (https://bun.uptrace.dev/postgres/zero-downtime-migrations.html) — corroborates static default safety

### Tertiary (LOW confidence)
- drizzle-team/drizzle-orm GitHub issue #4295 — known bug with ENUM column + default migration in older Drizzle versions; resolved in current version (0.45.1 is unaffected)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — directly observed from 8 existing migrations and schema files
- Pitfalls: HIGH — confirmed from codebase inspection (deletedAt/updatedAt already exist) and official docs (UNIQUE + NULL behaviour, pooled connection for DDL)

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable libraries — 30 days)
