# Phase 50: Credit Actions and Server-Side Enforcement - Research

**Researched:** 2026-02-26
**Domain:** Server actions, atomic DB operations, Next.js Server Component paywall enforcement
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Paywall Trigger UX**
- Explicit confirmation dialog before consuming a credit — "This will use 1 credit to continue" with a Confirm button
- Zero-credit users see a modal overlay with pricing info and Buy Credits CTA
- Two separate components: lightweight confirm dialog (has credits) and richer paywall modal (no credits)
- After credit consumed: brief success state (~1 second checkmark/"Credit used!") in dialog, then auto-advance to Step 7

**Blocked Access Experience (Direct URL to Step 7+)**
- Server renders the step layout but replaces content with an in-place paywall state — URL stays the same
- Steps 7-10 remain visible in the sidebar with lock icons
- Behind the paywall overlay: blurred placeholder/sample ideation content to entice purchase (not real AI output)
- Overlay: centered lock icon + message ("Use a credit to unlock Steps 7-10") + credit balance + primary Buy Credits / Use Credit button

**Credit Feedback**
- Credit balance NOT shown persistently in workshop UI — only surfaces at paywall moments (confirmation dialog, paywall modal, blocked access overlay)
- Brief toast notification after successful consumption: "1 credit used — X remaining"
- On consumption failure: keep confirmation dialog open, show error message, offer Retry button
- Dashboard credit balance updates on page load only (no real-time sync)

**Grandfathering**
- Cutoff based on migration timestamp (when `creditConsumedAt` column is added), not a hardcoded date
- No visual indicator on grandfathered workshops — they just work normally
- Env var toggle (`PAYWALL_ENABLED=false`) to disable all credit checks for dev/testing/demo

### Claude's Discretion
- Grandfathering for in-progress workshops (only one real user so far — pick simplest correct approach)
- Exact blur intensity and placeholder content design
- Toast notification styling and duration
- Error message copy for failed credit consumption
- Loading states during credit consumption server action

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAYW-01 | Steps 1-6 are free for all authenticated users | Server Component skip-check when `stepNumber <= 6`; no credit query fires for Steps 1-6 |
| PAYW-05 | Paywall is enforced server-side (not just client-side checks) | Credit gate inside `advanceToNextStep()` server action + Server Component credit check on Step 7-10 load; middleware bypass CVE-2025-29927 makes middleware-only insufficient |
| PAYW-06 | Existing workshops created before paywall launch are grandfathered as unlocked | Migration timestamp cutoff: `creditConsumedAt IS NULL AND workshop.createdAt < PAYWALL_CUTOFF_DATE` |
| CRED-02 | One credit is consumed when user unlocks Steps 7-10 for a workshop | `consumeCredit()` atomic conditional-UPDATE: `WHERE credit_balance > 0 RETURNING`, then set `workshop.creditConsumedAt` |
| CRED-03 | Credit consumption is atomic (no double-spend under concurrent requests) | Conditional-UPDATE pattern: single SQL statement `UPDATE users SET credit_balance = credit_balance - 1 WHERE clerk_user_id = $1 AND credit_balance > 0 RETURNING credit_balance` — no row is updated if balance is already 0; exactly-one semantics under concurrent calls |
</phase_requirements>

---

## Summary

Phase 50 delivers server-side credit enforcement: a `billing-actions.ts` file with atomic server actions, a modified `advanceToNextStep()` with a Step 6→7 credit gate, and a credit guard on the Step 7-10 Server Component. The core challenge is atomicity — `neon-http` does not support interactive multi-statement transactions (`SELECT FOR UPDATE`), so the standard "read-then-write" pattern would allow double-spend under concurrent requests. The correct approach is PostgreSQL's conditional-UPDATE pattern: a single `UPDATE ... WHERE credit_balance > 0 RETURNING` statement that atomically deducts and returns the result — if the row is updated, the credit was successfully consumed; if 0 rows are updated, the balance was already 0. This is the same pattern already proven in `fulfillCreditPurchase()`.

The Server Component credit check for Steps 7-10 should run inside the existing `StepPage` Server Component (`/src/app/workshop/[sessionId]/step/[stepId]/page.tsx`) by checking `workshop.creditConsumedAt` against the grandfathering cutoff before rendering. The cutoff timestamp is the Unix epoch of migration `0008_shocking_sphinx.sql` (which added the `creditConsumedAt` column) — `1772051653843` ms = `2026-02-26T23:54:13Z`. The `PAYWALL_ENABLED` env var toggle disables all checks for dev/demo environments.

**Primary recommendation:** Use the conditional-UPDATE pattern (`WHERE credit_balance > 0 RETURNING`) for `consumeCredit()` — it is atomic, works on `neon-http`, and has precedent in `fulfillCreditPurchase()`. Do NOT attempt `SELECT FOR UPDATE` (not supported by neon-http). Do NOT attempt to build a WebSocket client just for this transaction — conditional-UPDATE is sufficient.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | ORM for conditional-UPDATE, RETURNING | Already in project; provides `sql` template, `gt()`, `.returning()` |
| @neondatabase/serverless | ^1.0.2 | neon-http driver | Already configured in `src/db/client.ts` |
| @clerk/nextjs | ^6.37.3 | Auth — `auth()` in server actions, `currentUser()` in Server Components | Already in project |
| next | ^16.1.6 | Server actions (`'use server'`), Server Components | Project framework |
| sonner | ^2.0.7 | Toast notifications for credit feedback | Already used in `step-navigation.tsx` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.546.0 | Lock icon in paywall overlay and sidebar locked steps | Already in workshop-sidebar.tsx |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Conditional-UPDATE pattern | `SELECT FOR UPDATE` + separate decrement | SELECT FOR UPDATE requires interactive transactions — not supported by neon-http driver |
| Conditional-UPDATE pattern | Drizzle transaction (ws driver) | Would require adding a second neon-ws client; conditional-UPDATE is simpler and provably correct |
| Migration timestamp cutoff constant | Hardcoded date string | Migration timestamp is already known and precise; it's the correct semantic anchor |

**Installation:** No new packages required. Everything already installed.

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── actions/
│   ├── workshop-actions.ts          # Modify: add Step 6→7 credit gate to advanceToNextStep()
│   └── billing-actions.ts           # NEW: consumeCredit(), getCredits(), markOnboardingComplete()
├── app/workshop/[sessionId]/step/[stepId]/
│   └── page.tsx                     # Modify: add credit check for stepNumber >= 7
└── components/workshop/
    ├── paywall-overlay.tsx           # NEW: in-place paywall for blocked direct URL access (Plan 50-02)
    └── step-navigation.tsx          # Modify: intercept handleNext() at Step 6 (Plan 50-02 / Phase 51)
```

Note: `paywall-overlay.tsx` and sidebar lock icon changes are referenced here for context but their interactive counterparts (dialogs, modals) are Phase 51 work. Phase 50 focuses on the server-action layer and the Server Component paywall gate.

### Pattern 1: Atomic Conditional-UPDATE for Credit Consumption

**What:** Single SQL statement that atomically decrements credit and returns the new balance — but ONLY if balance > 0. Zero rows returned = zero credits (paywall required). One row returned = success.

**When to use:** Any debit from `users.creditBalance`. This is the safe pattern for neon-http where `SELECT FOR UPDATE` is unavailable.

**Example:**
```typescript
// Source: Drizzle ORM docs + fulfillCreditPurchase precedent in codebase
import { sql, eq, gt, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';

const [updated] = await db
  .update(users)
  .set({ creditBalance: sql`${users.creditBalance} - 1` })
  .where(
    and(
      eq(users.clerkUserId, userId),
      gt(users.creditBalance, 0)
    )
  )
  .returning({ newBalance: users.creditBalance });

if (!updated) {
  // Zero rows updated — credit_balance was 0 (or user not found)
  return { paywallRequired: true };
}
// updated.newBalance is the post-decrement balance
return { success: true, newBalance: updated.newBalance };
```

**Why it's atomic:** PostgreSQL executes the WHERE check and the UPDATE as a single atomic operation at the storage engine level. No separate SELECT is needed. Two concurrent calls with `credit_balance = 1` will produce exactly one `updated` row and one empty result — PostgreSQL's row-level locking on the UPDATE handles this without explicit transactions.

### Pattern 2: Server Action Return Type (No Redirect)

`consumeCredit()` must NOT call `redirect()` internally — the caller (client component) needs to inspect the result to decide whether to show a paywall dialog or proceed. This differs from `advanceToNextStep()` which redirects internally.

```typescript
// Source: project convention (see fulfillCreditPurchase discriminated union)
export type ConsumeCreditResult =
  | { status: 'consumed'; newBalance: number }
  | { status: 'insufficient_credits' }
  | { status: 'already_unlocked' }   // idempotent — workshop already has creditConsumedAt
  | { status: 'grandfathered' }       // workshop predates paywall
  | { status: 'paywall_disabled' }    // PAYWALL_ENABLED=false
  | { status: 'error'; message: string };
```

### Pattern 3: Modified `advanceToNextStep()` — Return, Don't Redirect, on Paywall

The current `advanceToNextStep()` calls `redirect()` unconditionally. At Step 6→7, it must check for credit/grandfathering first and return a structured result if paywall is required instead of redirecting. If credit is available (or grandfathered), consume it atomically then redirect as normal.

```typescript
// Modified signature for Step 6→7 gate
export async function advanceToNextStep(
  workshopId: string,
  currentStepId: string,
  nextStepId: string,
  sessionId: string
): Promise<{ nextStepOrder: number } | { paywallRequired: true; hasCredits: boolean }> {
  // Only check at Step 6 → Step 7 boundary
  const STEP_6_ID = 'journey-mapping'; // order=6 in step-metadata.ts
  if (currentStepId === STEP_6_ID) {
    const creditResult = await checkAndConsumeCredit(workshopId, userId);
    if (creditResult.paywallRequired) {
      return { paywallRequired: true, hasCredits: creditResult.hasCredits };
    }
  }
  // ... existing logic ...
  redirect(`/workshop/${sessionId}/step/${nextStepOrder}`);
}
```

Note: The client (`step-navigation.tsx`) currently rethrows `NEXT_REDIRECT`. It needs to handle the non-redirect return path when `paywallRequired: true` — show the appropriate dialog. This is primarily Phase 51 UI work but the server action must return the right shape.

### Pattern 4: Server Component Paywall Check (Steps 7-10)

Inside `StepPage` Server Component, before rendering `StepContainer`, check if the workshop has `creditConsumedAt` set OR is grandfathered:

```typescript
// src/app/workshop/[sessionId]/step/[stepId]/page.tsx
const PAYWALL_ENABLED = process.env.PAYWALL_ENABLED !== 'false';
const PAYWALL_CUTOFF_DATE = new Date(1772051653843); // migration 0008 timestamp

if (PAYWALL_ENABLED && stepNumber >= 7) {
  const workshop = session.workshop;
  const isUnlocked = workshop.creditConsumedAt !== null;
  const isGrandfathered =
    workshop.creditConsumedAt === null &&
    workshop.createdAt < PAYWALL_CUTOFF_DATE;

  if (!isUnlocked && !isGrandfathered) {
    // Render paywall overlay instead of step content
    return <PaywallOverlay workshopId={workshop.id} sessionId={sessionId} />;
  }
}
```

### Pattern 5: `getCredits()` Server Action

Lean read of `users.creditBalance` — called by the client at the paywall moment (confirm dialog open) so the UI can show the current balance. Not polled — fetched on demand.

```typescript
export async function getCredits(): Promise<number> {
  const { userId } = await auth();
  if (!userId) return 0;
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
    columns: { creditBalance: true },
  });
  return user?.creditBalance ?? 0;
}
```

### Pattern 6: `markOnboardingComplete()` Server Action

Required for Phase 52 onboarding but included in `billing-actions.ts` per plan scope. Simple boolean update.

```typescript
export async function markOnboardingComplete(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  await db
    .update(users)
    .set({ onboardingComplete: true })
    .where(eq(users.clerkUserId, userId));
}
```

### Anti-Patterns to Avoid

- **Read-then-write for credit deduction:** Never do `SELECT balance, then UPDATE` as two separate queries — race condition allows double-spend. Always use the conditional-UPDATE pattern.
- **redirect() inside consumeCredit():** Breaks the discriminated union return needed by the UI to show the right dialog.
- **Middleware-only paywall:** The middleware bypass CVE-2025-29927 makes middleware-only enforcement insufficient. Server Component check is required (already in STATE.md decisions).
- **Checking creditConsumedAt client-side only:** The Server Component check must be the gate; client checks are supplemental UX only.
- **Calling consumeCredit() without checking existing creditConsumedAt first:** Always check `workshop.creditConsumedAt !== null` before attempting consumption — idempotent by returning `already_unlocked` immediately.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic credit deduction | Custom lock/mutex logic | Conditional-UPDATE `WHERE balance > 0` | PostgreSQL row-level locking handles this atomically at the DB level |
| Credit balance display | Polling or websocket subscription | `getCredits()` on-demand fetch at paywall moment | Balance only surfaced at paywall moments (CONTEXT.md decision) |
| Dialog UI | Custom modal from scratch | Shadcn Dialog (already in `src/components/ui/dialog.tsx`) | Already in project, consistent with existing dialogs like `ResetStepDialog` |
| Toast notifications | Custom toast | `sonner` (`toast()`) | Already used in `step-navigation.tsx` and throughout the app |

**Key insight:** The atomic conditional-UPDATE is simpler and more correct than any transaction-based approach for neon-http. The project has already proven this pattern in `fulfillCreditPurchase()`.

---

## Common Pitfalls

### Pitfall 1: Double Advance on Step 6 → 7

**What goes wrong:** `handleNext()` in `step-navigation.tsx` calls `advanceToNextStep()` and then rethrows `NEXT_REDIRECT`. If the server action returns `{ paywallRequired: true }` instead of redirecting, the existing `throw error` in the catch block will not fire — but the `setIsNavigating(false)` branch won't fire either if the error is a non-redirect throw. Need to handle the non-redirect return explicitly.

**Why it happens:** The client currently only handles the `NEXT_REDIRECT` path. The new `paywallRequired` return path is silent without explicit handling.

**How to avoid:** In `step-navigation.tsx`, after `await advanceToNextStep(...)`, check if the return value has `paywallRequired: true` and trigger the appropriate dialog. The planner should note this as a coordination point with Phase 51 UI work.

**Warning signs:** Step 6 Next button appears to do nothing (no redirect, no dialog) after clicking.

### Pitfall 2: Grandfathering Cut-off Boundary

**What goes wrong:** Using `workshop.createdAt < PAYWALL_CUTOFF_DATE` when the cutoff should be "workshops that existed before the paywall launched." If a workshop was created on the exact millisecond of the migration, it might be incorrectly treated as grandfathered or not.

**Why it happens:** Off-by-one on timestamp comparison.

**How to avoid:** Use `workshop.createdAt < PAYWALL_CUTOFF_DATE` (strict less-than) for the constant `1772051653843` (the `when` field from migration journal entry idx:8). The `creditConsumedAt` column did not exist before this migration, so any workshop with `createdAt` before this timestamp was created before paywall enforcement existed.

**Warning signs:** New workshops (created after migration) appear grandfathered.

### Pitfall 3: Grandfathering In-Progress vs Completed Workshops

**What goes wrong:** The success criterion says `creditConsumedAt IS NULL AND workshop.completedAt > [cutoff]` for grandfathering, but the CONTEXT.md says "simplest correct approach" for the only real user.

**Why it happens:** Ambiguity between "completed before paywall" and "created before paywall."

**How to avoid:** Use `workshop.createdAt < PAYWALL_CUTOFF_DATE` (not `completedAt`) — this is correct because all workshops existing before the migration were created before it, whether in-progress or completed. `completedAt` could be null for in-progress workshops, making it unreliable as the cutoff anchor.

**Warning signs:** In-progress workshops created before migration are blocked by paywall.

### Pitfall 4: `consumeCredit()` Called Without Workshop Ownership Check

**What goes wrong:** A user calls `consumeCredit(workshopId, ...)` on a workshop they don't own.

**Why it happens:** Server actions need explicit authorization checks — Next.js does not auto-enforce this.

**How to avoid:** Inside `consumeCredit()`, always verify `workshop.clerkUserId === userId` before touching credits. The existing pattern in `completeWorkshop()` shows how: fetch the workshop with `eq(workshops.clerkUserId, userId)` in the WHERE clause.

**Warning signs:** Credits deducted without the user advancing in their own workshop.

### Pitfall 5: The `advanceToNextStep()` redirect() Must Stay Outside try/catch

**What goes wrong:** Moving `redirect()` inside try/catch causes Next.js to treat the NEXT_REDIRECT throw as an error, breaking navigation.

**Why it happens:** `redirect()` throws a special error internally. Existing code already handles this correctly with a comment — must be preserved when modifying the function.

**How to avoid:** Keep the `redirect()` call after the try/catch block as it currently is. The credit gate check and consumption go INSIDE the try block; the redirect stays outside.

**Warning signs:** Step navigation stops working after modifying `advanceToNextStep()`.

### Pitfall 6: PAYWALL_ENABLED Check Must Gate Both Server Action AND Server Component

**What goes wrong:** Only checking `PAYWALL_ENABLED` in one place allows the other path to enforce the paywall in dev.

**Why it happens:** Two enforcement points (server action + Server Component) need the same flag.

**How to avoid:** Check `process.env.PAYWALL_ENABLED !== 'false'` in both `consumeCredit()` AND in the `StepPage` Server Component credit check. Return `{ status: 'paywall_disabled' }` from the action and skip the check in the component when the flag is off.

---

## Code Examples

Verified patterns from codebase and official sources:

### `consumeCredit()` — Atomic Conditional-UPDATE (Core Pattern)

```typescript
// Source: Drizzle ORM docs (https://orm.drizzle.team/docs/update) + codebase precedent
'use server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { users, workshops, creditTransactions } from '@/db/schema';
import { eq, gt, and, isNull, sql } from 'drizzle-orm';
import { createPrefixedId } from '@/lib/ids';

export type ConsumeCreditResult =
  | { status: 'consumed'; newBalance: number }
  | { status: 'insufficient_credits' }
  | { status: 'already_unlocked' }
  | { status: 'grandfathered' }
  | { status: 'paywall_disabled' }
  | { status: 'error'; message: string };

const PAYWALL_CUTOFF_DATE = new Date(1772051653843); // migration 0008 timestamp

export async function consumeCredit(workshopId: string): Promise<ConsumeCreditResult> {
  // 1. PAYWALL_ENABLED flag — short-circuit for dev/demo
  if (process.env.PAYWALL_ENABLED === 'false') {
    return { status: 'paywall_disabled' };
  }

  // 2. Auth
  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Authentication required' };

  // 3. Fetch workshop — verify ownership + check existing state
  const workshop = await db.query.workshops.findFirst({
    where: and(
      eq(workshops.id, workshopId),
      eq(workshops.clerkUserId, userId),
      isNull(workshops.deletedAt)
    ),
    columns: { id: true, creditConsumedAt: true, createdAt: true, clerkUserId: true },
  });

  if (!workshop) return { status: 'error', message: 'Workshop not found' };

  // 4. Already unlocked — idempotent
  if (workshop.creditConsumedAt !== null) {
    return { status: 'already_unlocked' };
  }

  // 5. Grandfathered — created before paywall migration
  if (workshop.createdAt < PAYWALL_CUTOFF_DATE) {
    return { status: 'grandfathered' };
  }

  // 6. Atomic conditional-UPDATE — decrement balance only if > 0
  const [updated] = await db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} - 1` })
    .where(
      and(
        eq(users.clerkUserId, userId),
        gt(users.creditBalance, 0)
      )
    )
    .returning({ newBalance: users.creditBalance });

  // 7. Zero rows updated = insufficient credits
  if (!updated) {
    return { status: 'insufficient_credits' };
  }

  // 8. Record consumption transaction + mark workshop unlocked
  await Promise.all([
    db.insert(creditTransactions).values({
      id: createPrefixedId('ctx'),
      clerkUserId: userId,
      type: 'consumption',
      status: 'completed',
      amount: -1,
      balanceAfter: updated.newBalance,
      description: 'Workshop unlock: Steps 7-10',
      workshopId,
    }),
    db
      .update(workshops)
      .set({ creditConsumedAt: new Date() })
      .where(eq(workshops.id, workshopId)),
  ]);

  return { status: 'consumed', newBalance: updated.newBalance };
}
```

### `advanceToNextStep()` Step 6→7 Gate Addition

```typescript
// Source: existing workshop-actions.ts pattern + new gate
const STEP_6_ID = 'journey-mapping'; // order=6 in step-metadata.ts
const PAYWALL_CUTOFF_DATE = new Date(1772051653843);

// Inside advanceToNextStep(), before marking step complete:
if (process.env.PAYWALL_ENABLED !== 'false' && currentStepId === STEP_6_ID) {
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  // Check workshop credit state
  const workshop = await db.query.workshops.findFirst({
    where: and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)),
    columns: { creditConsumedAt: true, createdAt: true },
  });

  const isUnlocked = workshop?.creditConsumedAt !== null;
  const isGrandfathered = workshop && workshop.creditConsumedAt === null
    && workshop.createdAt < PAYWALL_CUTOFF_DATE;

  if (!isUnlocked && !isGrandfathered) {
    // Count credits to inform UI which dialog to show
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { creditBalance: true },
    });
    return {
      paywallRequired: true,
      hasCredits: (user?.creditBalance ?? 0) > 0,
    };
  }
}
// ... continue with existing advance logic ...
```

### Server Component Paywall Check (StepPage)

```typescript
// Source: existing StepPage pattern in page.tsx
const PAYWALL_ENABLED = process.env.PAYWALL_ENABLED !== 'false';
const PAYWALL_CUTOFF_DATE = new Date(1772051653843);

// After fetching session/workshop, before rendering StepContainer:
if (PAYWALL_ENABLED && stepNumber >= 7) {
  const workshop = session.workshop;
  const isUnlocked = workshop.creditConsumedAt !== null;
  const isGrandfathered =
    workshop.creditConsumedAt === null &&
    workshop.createdAt < PAYWALL_CUTOFF_DATE;

  if (!isUnlocked && !isGrandfathered) {
    return (
      <PaywallOverlay
        sessionId={sessionId}
        workshopId={workshop.id}
        stepNumber={stepNumber}
      />
    );
  }
}
```

### `getCredits()` Server Action

```typescript
// Source: project patterns (auth + db.query)
export async function getCredits(): Promise<number> {
  const { userId } = await auth();
  if (!userId) return 0;
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
    columns: { creditBalance: true },
  });
  return user?.creditBalance ?? 0;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `SELECT FOR UPDATE` + decrement | Conditional-UPDATE `WHERE balance > 0 RETURNING` | N/A (neon-http never supported FOR UPDATE) | Simpler, works on HTTP driver |
| Middleware paywall enforcement | Server Component + server action double gate | CVE-2025-29927 (middleware bypass) | Must enforce in RSC/actions, not middleware alone |

**Deprecated/outdated:**
- Drizzle `db.transaction()` on neon-http: Drizzle does not support the neon-http transaction function at the ORM level. Use conditional-UPDATE instead of transactions for atomic credit operations.

---

## Key Codebase Facts (Verified)

### Step ID → Order Mapping (from step-metadata.ts)
| Step Order | Step ID |
|-----------|---------|
| 6 | `journey-mapping` |
| 7 | `reframe` |
| 8 | `ideation` |
| 9 | `concept` |
| 10 | `validate` |

The Step 6→7 boundary is `journey-mapping` → `reframe`. The `STEP_6_ID` constant must use `'journey-mapping'`.

### Existing Files to Modify (Plan 50-01 and 50-02)

**Plan 50-01: `src/actions/billing-actions.ts`** — New file
- `consumeCredit(workshopId: string): Promise<ConsumeCreditResult>`
- `getCredits(): Promise<number>`
- `markOnboardingComplete(): Promise<void>`
- Must start with `'use server'`
- Must import `import 'server-only'` pattern is NOT needed here (server actions auto-restrict via `'use server'`)
- Follow same structure as `src/lib/billing/fulfill-credit-purchase.ts`

**Plan 50-02: `src/actions/workshop-actions.ts`** — Modify existing
- Modify `advanceToNextStep()` to add the Step 6→7 gate
- Return type changes from `Promise<{ nextStepOrder: number }>` to a union that includes `{ paywallRequired: true; hasCredits: boolean }`

**Plan 50-02: `src/app/workshop/[sessionId]/step/[stepId]/page.tsx`** — Modify existing
- Add credit check block after session fetch, before `StepContainer` render
- Add `PaywallOverlay` component import (component created in same plan)
- Workshop query already fetches `session.workshop` — `creditConsumedAt` and `createdAt` are already available via the session relation

### Workshop Schema Has `creditConsumedAt` (Verified)

Migration `0008_shocking_sphinx.sql` already added `credit_consumed_at` column to `workshops` table. The schema in `src/db/schema/workshops.ts` includes:
```typescript
creditConsumedAt: timestamp('credit_consumed_at', { mode: 'date', precision: 3 }),
```
No new migration is needed for Phase 50.

### Workshop DB Query Already Fetches Steps

In `StepPage`, `session.workshop` is already fetched with `with: { steps: true }`. The `workshop.creditConsumedAt` and `workshop.createdAt` fields are on the workshop object directly — no additional query needed.

### Layout DB Query Does NOT Fetch creditConsumedAt

`WorkshopLayout` (`layout.tsx`) only fetches `workshop.steps` — not `creditConsumedAt`. The paywall check must live in `StepPage` (page.tsx), not the layout.

### Transaction Ledger for Consumption

`credit_transactions` has `type: 'consumption'` and `workshopId` FK already in the schema. The `amount` should be `-1` (signed negative per schema comment: "Signed integer: +N for purchase/refund, -N for consumption").

### Grandfathering Cutoff Timestamp

Migration journal entry for `0008_shocking_sphinx` (which added `credit_consumed_at`): `"when": 1772051653843` = `2026-02-26T23:54:13.843Z`. All workshops with `createdAt` before this timestamp predated paywall enforcement.

---

## Open Questions

1. **`advanceToNextStep()` return type change — client handler coordination**
   - What we know: `step-navigation.tsx` currently rethrows `NEXT_REDIRECT` and has no handling for a non-redirect return
   - What's unclear: How much client-side work belongs in Plan 50-02 vs Phase 51
   - Recommendation: Plan 50-02 should add the Step 6→7 gate in the server action with the correct return type. The `step-navigation.tsx` client-side intercept (showing the dialog) is Phase 51 UI work. Confirm this split in plan scope.

2. **`Promise.all` atomicity for transaction + workshop update**
   - What we know: `neon-http` does not support interactive transactions; the two writes in step 8 of `consumeCredit()` (insert credit_transactions + update workshop.creditConsumedAt) are not atomic
   - What's unclear: Whether partial failure (transaction inserted but workshop not updated) is acceptable
   - Recommendation: This is acceptable — same pattern as `fulfillCreditPurchase()`. If the workshop update fails after the credit deduction, the user has lost a credit but the workshop is not unlocked. On retry, `consumeCredit()` checks `credit_balance > 0` and will fail (balance already decremented). However, the transaction ledger shows the consumption. This is an edge case with very low probability. For v1.8, log the error and accept — reconciliation is manual. The plan should include an error log for this case.

3. **`PaywallOverlay` component scope in Plan 50-02**
   - What we know: The overlay replaces step content in the Server Component
   - What's unclear: Whether `PaywallOverlay` should be a Server Component (simpler, reads credit balance server-side) or Client Component (needed for button interactions)
   - Recommendation: Make it a Client Component receiving `workshopId` and `sessionId` as props. Buttons ("Use a Credit" / "Buy Credits") need interactivity. The credit balance can be fetched inside via `getCredits()` as a server action called on mount.

---

## Sources

### Primary (HIGH confidence)
- Drizzle ORM update docs (https://orm.drizzle.team/docs/update) — UPDATE/RETURNING/sql template patterns
- Drizzle ORM operators docs (https://orm.drizzle.team/docs/operators) — `gt()` operator usage
- Neon serverless driver docs (https://neon.com/docs/serverless/serverless-driver) — HTTP driver transaction limitations
- Codebase: `src/lib/billing/fulfill-credit-purchase.ts` — atomic increment pattern (conditional-UPDATE precedent)
- Codebase: `src/db/schema/workshops.ts` — creditConsumedAt column confirmed present
- Codebase: `src/db/schema/users.ts` — creditBalance integer column confirmed present
- Codebase: `src/db/schema/credit-transactions.ts` — type/amount/workshopId confirmed
- Codebase: `src/actions/workshop-actions.ts` — advanceToNextStep() current implementation
- Codebase: `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` — Server Component structure
- Codebase: `src/lib/workshop/step-metadata.ts` — Step 6 ID = 'journey-mapping' confirmed
- Codebase: `drizzle/meta/_journal.json` — migration 0008 timestamp 1772051653843

### Secondary (MEDIUM confidence)
- Neon GitHub issue #31 (https://github.com/neondatabase/serverless/issues/31) — confirms neon-http non-interactive transaction limitations
- WebSearch: neon-http no interactive transactions — multiple sources confirm SELECT FOR UPDATE not supported

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, versions confirmed
- Architecture: HIGH — codebase patterns are directly inspected; conditional-UPDATE pattern confirmed via Drizzle docs + codebase precedent
- Pitfalls: HIGH — codebase-specific (migration timestamp, step IDs, redirect() placement) verified directly; neon-http limitation confirmed via official docs

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable stack — Drizzle, Neon, Next.js patterns unlikely to change)
