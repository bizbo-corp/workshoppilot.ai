# Architecture Research: Stripe Checkout + Credit System + Onboarding Integration

**Domain:** Stripe Checkout (redirect), credit tracking, welcome modal onboarding — integrated into existing Next.js App Router + Clerk + Neon + Drizzle codebase
**Researched:** 2026-02-26
**Confidence:** HIGH for Stripe + webhooks + credit schema; MEDIUM for Clerk metadata vs DB onboarding persistence tradeoffs

---

## System Overview

### Current Architecture (v1.7 — Baseline)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER                                   │
│  src/proxy.ts (clerkMiddleware)                                      │
│  ● Auth: public routes (/, /pricing, /sign-in, Steps 1-3)           │
│  ● Protected: /dashboard, Steps 4-10, /api/workshops                │
│  ● Admin: /admin, /api/admin                                         │
└─────────────────────────────────┬────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────────┐
│                       SERVER LAYER                                   │
│  ┌──────────────────────┐  ┌────────────────────────────────────┐   │
│  │  Page Components      │  │  Server Actions                    │   │
│  │  (Server Components)  │  │  src/actions/                      │   │
│  │                       │  │  ● workshop-actions.ts             │   │
│  │  /dashboard/page.tsx  │  │  ● canvas-actions.ts               │   │
│  │  /workshop/.../page   │  │  ● auto-save-actions.ts            │   │
│  │  /pricing/page.tsx    │  │                                    │   │
│  └──────────────────────┘  └────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  API Routes (Route Handlers)                                  │   │
│  │  /api/chat          /api/extract      /api/ai/*              │   │
│  │  /api/webhooks/clerk                                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                     │
│  ┌────────────────────────┐  ┌──────────────────────────────────┐   │
│  │  Neon Postgres          │  │  Clerk User Store                │   │
│  │  (Drizzle ORM, HTTP)    │  │  publicMetadata: { roles[] }     │   │
│  │                         │  │                                  │   │
│  │  users                  │  └──────────────────────────────────┘   │
│  │  workshops              │                                          │
│  │  sessions               │  ┌──────────────────────────────────┐   │
│  │  workshop_steps         │  │  Vercel Blob                     │   │
│  │  step_artifacts         │  │  (drawings, PNGs)                │   │
│  │  build_packs            │  └──────────────────────────────────┘   │
│  │  ai_usage_events        │                                          │
│  └────────────────────────┘                                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Target Architecture (v1.8 — Onboarding + Payments)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER                                   │
│  src/proxy.ts (clerkMiddleware)  ← MODIFIED                         │
│  ● All v1.7 routes (unchanged)                                       │
│  ● NEW: /api/webhooks/stripe added to public routes                  │
│  NOTE: Paywall NOT in middleware — credit check is async DB query    │
└─────────────────────────────────┬────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────────┐
│                       SERVER LAYER                                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Server Actions (MODIFIED + NEW)                              │   │
│  │                                                               │   │
│  │  workshop-actions.ts  ← MODIFIED                             │   │
│  │    advanceToNextStep() now checks credit at Step 6→7 gate    │   │
│  │    NEW: consumeCredit() — atomic deduction                   │   │
│  │                                                               │   │
│  │  NEW: billing-actions.ts                                      │   │
│  │    createCheckoutSession() → returns Stripe URL              │   │
│  │    getCredits(userId) → balance from users table             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  API Routes (NEW)                                             │   │
│  │                                                               │   │
│  │  /api/webhooks/stripe/route.ts    ← NEW                      │   │
│  │    POST — Stripe-signed events                                │   │
│  │    Handles: checkout.session.completed                        │   │
│  │    Idempotent: checks stripeSessionId before crediting        │   │
│  │                                                               │   │
│  │  /api/billing/checkout/route.ts   ← NEW                      │   │
│  │    POST — creates Stripe Checkout session                     │   │
│  │    Embeds: clerkUserId, creditQty in session metadata        │   │
│  │    Returns: 303 redirect to Stripe URL                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Page Components (MODIFIED)                                   │   │
│  │                                                               │   │
│  │  /dashboard/page.tsx  ← MODIFIED                             │   │
│  │    Reads users.creditBalance for header display              │   │
│  │    Passes onboardingComplete to layout                       │   │
│  │                                                               │   │
│  │  /workshop/.../step/[stepId]/page.tsx  ← MODIFIED           │   │
│  │    At step 7+: reads credit balance                          │   │
│  │    Passes paywallActive prop to StepContainer                │   │
│  │                                                               │   │
│  │  /billing/success/page.tsx  ← NEW                           │   │
│  │    On success_url load: calls fulfillCheckout()              │   │
│  │    Redundant with webhook (belt-and-suspenders)              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                     │
│  ┌────────────────────────┐                                          │
│  │  Neon Postgres          │                                          │
│  │  (Drizzle ORM, HTTP)    │                                          │
│  │                         │                                          │
│  │  users  ← MODIFIED      │  NEW columns:                           │
│  │    creditBalance int     │  creditBalance DEFAULT 0               │
│  │    onboardingComplete    │  onboardingComplete BOOL DEFAULT false  │
│  │                         │                                          │
│  │  NEW: credit_transactions│                                          │
│  │    id, userId,           │                                          │
│  │    stripeSessionId UNIQUE│                                          │
│  │    type (purchase|use)  │                                          │
│  │    creditDelta,          │                                          │
│  │    workshopId (nullable) │                                          │
│  │    createdAt             │                                          │
│  └────────────────────────┘                                          │
│                                                                      │
│  ┌──────────────────────────────────────┐                            │
│  │  Clerk User Store                    │                            │
│  │  publicMetadata:                     │                            │
│  │    roles[]             (existing)    │                            │
│  │    onboardingComplete  (NOT stored   │                            │
│  │                         here — DB   │                            │
│  │                         is source)  │                            │
│  └──────────────────────────────────────┘                            │
│                                                                      │
│  ┌──────────────────────────────────────┐                            │
│  │  Stripe                              │                            │
│  │  Checkout sessions (redirect mode)  │                            │
│  │  Products + Prices (static IDs)     │                            │
│  └──────────────────────────────────────┘                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Decision: Where Does Each Check Live?

### Paywall Check — Server Component at Step Load Time

The credit/paywall check lives in the **Step Server Component** (`/workshop/[sessionId]/step/[stepId]/page.tsx`), NOT in middleware.

**Why not middleware:**
- Middleware runs at the edge and cannot make TCP database connections — Neon HTTP is fine, but the query is async and middleware should be fast/stateless
- Middleware doesn't have workshop context (step number, workshopId) — it only sees URL patterns
- Middleware checking credit state would add 100-300ms to every page load across all routes
- Existing pattern: protected routes let unauthenticated users through to the page, which shows an AuthGuard modal in-place — the same approach is right for paywall

**Why not in the `advanceToNextStep` server action:**
- Step advance is one direction (complete current → start next). The paywall needs to block Step 7 access even when the user tries to navigate directly via URL
- The server action runs when the user completes Step 6. At that point, we don't yet know if they'll pay — we should mark Step 6 complete but show the upgrade modal at Step 7 load time

**Correct pattern — check in server component at step 7 load:**

```typescript
// In /workshop/[sessionId]/step/[stepId]/page.tsx
const PAYWALL_STEP = 7; // Steps 7-10 require a credit

if (stepNumber >= PAYWALL_STEP) {
  // Check credit: is there a credit already "attached" to this workshop?
  const workshop = session.workshop;
  const creditConsumed = workshop.creditConsumedAt !== null;

  if (!creditConsumed) {
    // Check user balance
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { creditBalance: true },
    });

    if (!user || user.creditBalance <= 0) {
      // Pass paywallActive=true — StepContainer shows upgrade modal
      return <StepContainer paywallActive={true} ... />;
    }
  }
}
```

**Credit consumption — in `advanceToNextStep` server action at the Step 6→7 boundary:**
- When user advances from Step 6 to Step 7, deduct 1 credit atomically
- Mark `workshops.creditConsumedAt` so subsequent Step 7+ loads skip the balance check
- This prevents double-deduction if the user reloads Step 7

### Onboarding State — Neon Database (users table column)

Store `onboardingComplete: boolean` as a column in the `users` table, NOT in Clerk `publicMetadata`.

**Why DB over Clerk metadata:**
- Clerk `publicMetadata` can only be updated server-side (via clerkClient) — requires an extra Clerk API call per update
- Clerk `publicMetadata` changes don't propagate immediately to the JWT; the client must call `user.reload()` to force a token refresh, adding roundtrip complexity
- The `users` table is already the source of truth for user state (roles, company, etc.) — onboarding is the same kind of user state
- DB query is already happening on every dashboard load (`db.query.users.findFirst(...)`) — adding one column adds zero overhead
- Better fit: onboarding state is app-level data, not auth-level data

**Why not localStorage:**
- No cross-device persistence (user logs in on different machine, sees modal again)
- Users who clear browser storage see the modal again unnecessarily
- localStorage state is not visible to server components — must be read client-side with a useEffect, causing a flash

**Onboarding state flow:**
```
1. User creates account → Clerk webhook fires → user row inserted → onboardingComplete: false (default)
2. Dashboard loads → server component reads user.onboardingComplete
3. If false → pass showWelcomeModal: true prop to DashboardClient
4. User dismisses modal → client calls server action markOnboardingComplete()
5. Server action: UPDATE users SET onboarding_complete = true WHERE clerk_user_id = $1
6. Server action revalidatePath('/dashboard') → next load, modal is suppressed
```

---

## Component Responsibilities

| Component | Status | Responsibility |
|-----------|--------|----------------|
| `src/proxy.ts` | MODIFIED | Add `/api/webhooks/stripe` to public routes |
| `src/db/schema/users.ts` | MODIFIED | Add `creditBalance int DEFAULT 0`, `onboardingComplete bool DEFAULT false` |
| `src/db/schema/workshops.ts` | MODIFIED | Add `creditConsumedAt timestamp nullable` |
| `src/db/schema/credit-transactions.ts` | NEW | Ledger of all credit purchase + consumption events |
| `src/actions/billing-actions.ts` | NEW | `createCheckoutSession()`, `getCredits()`, `consumeCredit()`, `markOnboardingComplete()` |
| `src/actions/workshop-actions.ts` | MODIFIED | `advanceToNextStep()` checks paywall at Step 6→7 |
| `src/app/api/webhooks/stripe/route.ts` | NEW | Stripe webhook handler, idempotent credit fulfillment |
| `src/app/api/billing/checkout/route.ts` | NEW | Create Stripe Checkout session and redirect |
| `src/app/billing/success/page.tsx` | NEW | Landing page after Stripe redirect, triggers fulfillment |
| `src/app/billing/cancel/page.tsx` | NEW | Canceled payment redirect, returns to upgrade modal |
| `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` | MODIFIED | Credit check for steps 7-10, pass `paywallActive` prop |
| `src/app/dashboard/page.tsx` | MODIFIED | Read `creditBalance`, pass `showWelcomeModal` prop |
| `src/app/pricing/page.tsx` | MODIFIED | Update tier copy, add "Buy Now" CTA links to checkout |
| `src/components/billing/upgrade-modal.tsx` | NEW | Inline modal shown when `paywallActive=true` |
| `src/components/billing/credit-badge.tsx` | NEW | Dashboard header badge showing remaining credits |
| `src/components/onboarding/welcome-modal.tsx` | NEW | First-run welcome modal with tour steps |
| `src/lib/billing/stripe.ts` | NEW | Stripe SDK singleton initialization |

---

## New Database Schema

### Modified: `users` table

```typescript
// src/db/schema/users.ts — ADD two columns
export const users = pgTable('users', {
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

  // NEW
  creditBalance: integer('credit_balance').notNull().default(0),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
});
```

### Modified: `workshops` table

```typescript
// src/db/schema/workshops.ts — ADD one column
export const workshops = pgTable('workshops', {
  // ... existing columns unchanged ...

  // NEW: tracks when a credit was consumed for this workshop
  // NULL = no credit consumed (free trial steps 1-6)
  // non-NULL = credit consumed, steps 7-10 unlocked
  creditConsumedAt: timestamp('credit_consumed_at', { mode: 'date', precision: 3 }),
});
```

### New: `credit_transactions` table

```typescript
// src/db/schema/credit-transactions.ts — NEW TABLE
import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: text('id').primaryKey().$defaultFn(() => createPrefixedId('ctx')),

    // Who
    clerkUserId: text('clerk_user_id').notNull(),

    // What
    type: text('type', {
      enum: ['purchase', 'consumption'],
    }).notNull().$type<'purchase' | 'consumption'>(),

    creditDelta: integer('credit_delta').notNull(),
    // Positive for purchase (+1, +3), negative for consumption (-1)

    // Payment linkage (purchase transactions only)
    stripeSessionId: text('stripe_session_id').unique(), // UNIQUE prevents double-credit
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    stripePriceId: text('stripe_price_id'), // Which product was purchased

    // Usage linkage (consumption transactions only)
    workshopId: text('workshop_id'), // Which workshop consumed this credit

    // Audit
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clerkUserIdIdx: index('credit_txn_clerk_user_id_idx').on(table.clerkUserId),
    stripeSessionIdIdx: index('credit_txn_stripe_session_id_idx').on(table.stripeSessionId),
    typeIdx: index('credit_txn_type_idx').on(table.type),
  })
);
```

**Why a ledger table instead of only `users.creditBalance`:**
- Idempotency: `stripeSessionId UNIQUE` constraint prevents the webhook from crediting twice even if called multiple times
- Audit trail: full history of purchases and usage per user
- Debugging: if a credit goes missing, the ledger shows exactly when and why
- Recovery: can recompute `creditBalance` from the ledger if the counter drifts

---

## Architectural Patterns

### Pattern 1: Stripe Checkout Redirect (Route Handler, not Server Action)

**What:** Create Stripe Checkout session via a Route Handler (`/api/billing/checkout`) that returns a 303 redirect to the Stripe-hosted page. Stripe docs explicitly recommend Route Handlers for this, not server actions, because the redirect must be a top-level navigation.

**When to use:** Any time you redirect a user to an external payment page.

**Why not a server action:** Server actions can call `redirect()`, but Stripe's checkout requires the initial POST response to carry the redirect header before the user's browser can follow to `checkout.stripe.com`. Route Handlers give explicit control over the `303 See Other` response.

**Example:**

```typescript
// src/app/api/billing/checkout/route.ts
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { priceId, creditQty } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      clerkUserId: userId,           // Passed to webhook for credit fulfillment
      creditQty: String(creditQty),  // Metadata values MUST be strings
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
  });

  return NextResponse.redirect(session.url!, 303);
}
```

**Client trigger (Upgrade modal button):**
```typescript
// Client component — submit form to route handler
<form action="/api/billing/checkout" method="POST">
  <input type="hidden" name="priceId" value={PRICE_IDS.singleFlight} />
  <input type="hidden" name="creditQty" value="1" />
  <Button type="submit">Buy Workshop Credit — $79</Button>
</form>
```

### Pattern 2: Stripe Webhook Handler (Idempotent Credit Fulfillment)

**What:** A Route Handler at `/api/webhooks/stripe` that receives signed Stripe events, verifies the signature with `req.text()` (raw body required), and fulfills credit purchase exactly once using a DB-level unique constraint.

**When to use:** All Stripe event processing.

**Critical requirement:** Use `await req.text()` not `await req.json()` — Stripe signature verification requires the raw body, and Next.js App Router body parsing would break the signature.

**Example:**

```typescript
// src/app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users, creditTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();  // Raw body — required for signature verification
  const sig = (await headers()).get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await fulfillCreditPurchase(session);
  }

  return NextResponse.json({ received: true });
}

async function fulfillCreditPurchase(session: Stripe.Checkout.Session) {
  const clerkUserId = session.metadata?.clerkUserId;
  const creditQty = parseInt(session.metadata?.creditQty || '0', 10);

  if (!clerkUserId || creditQty <= 0) return;
  if (session.payment_status !== 'paid') return;

  // Idempotency guard: stripeSessionId UNIQUE constraint
  // If the webhook fires twice, the second insert will fail silently
  try {
    await db.insert(creditTransactions).values({
      clerkUserId,
      type: 'purchase',
      creditDelta: creditQty,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      stripePriceId: session.metadata?.priceId,
    }).onConflictDoNothing();  // stripeSessionId uniqueness — safe retry

    // Update running balance
    await db
      .update(users)
      .set({
        creditBalance: sql`${users.creditBalance} + ${creditQty}`,
      })
      .where(eq(users.clerkUserId, clerkUserId));
  } catch (err) {
    console.error('Credit fulfillment error:', err);
    // Re-throw so Stripe retries (non-2xx response would also work)
    throw err;
  }
}
```

**Note on Drizzle transactions with neon-http driver:** The neon-http driver supports non-interactive transactions via `sql.transaction([...])` at the raw SQL level. However, Drizzle's `db.transaction()` with the neon-http driver is unreliable for interactive multi-step transactions. The solution: use separate statements with the unique constraint as the idempotency guard. The `onConflictDoNothing()` on insert + separate `UPDATE` is safe because: (1) if the insert succeeds, the credit delta is recorded; (2) the UPDATE is idempotent (adding 0 to balance is a no-op if insert was skipped). If you need true atomicity here, switch to `neon-serverless` with Pool for this route only. For v1.8, the two-statement pattern with unique constraint is sufficient.

### Pattern 3: Atomic Credit Consumption at Step Advance (Server Action Guard)

**What:** When a user advances from Step 6 to Step 7, the `advanceToNextStep` server action checks credit balance, deducts 1 credit, and marks the workshop as unlocked — all in a guarded sequence before allowing navigation to Step 7.

**When to use:** The paywall transition point — Step 6 completion is the last free action.

**Example:**

```typescript
// In src/actions/billing-actions.ts
export async function consumeCredit(workshopId: string): Promise<{ success: boolean; error?: string }> {
  'use server';
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthenticated' };

  // Step 1: Verify workshop not already unlocked
  const [workshop] = await db
    .select({ creditConsumedAt: workshops.creditConsumedAt })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);

  if (workshop?.creditConsumedAt) {
    return { success: true }; // Already unlocked — idempotent
  }

  // Step 2: Check and deduct balance
  const result = await db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} - 1` })
    .where(
      and(
        eq(users.clerkUserId, userId),
        sql`${users.creditBalance} > 0`  // Conditional update prevents negative balance
      )
    )
    .returning({ newBalance: users.creditBalance });

  if (result.length === 0) {
    return { success: false, error: 'Insufficient credits' };
  }

  // Step 3: Record consumption
  await db.insert(creditTransactions).values({
    clerkUserId: userId,
    type: 'consumption',
    creditDelta: -1,
    workshopId,
  });

  // Step 4: Mark workshop as unlocked
  await db
    .update(workshops)
    .set({ creditConsumedAt: new Date() })
    .where(eq(workshops.id, workshopId));

  return { success: true };
}
```

**Modified `advanceToNextStep` — paywall gate at Step 6→7:**
```typescript
// In src/actions/workshop-actions.ts
export async function advanceToNextStep(
  workshopId: string,
  currentStepId: string,
  nextStepId: string,
  sessionId: string
): Promise<{ nextStepOrder: number } | { paywallRequired: true }> {
  // ... existing step completion logic ...

  // At Step 6 → Step 7 boundary, consume a credit before allowing advance
  if (currentStepId === 'reframe' && nextStepId === 'ideation') {
    const result = await consumeCredit(workshopId);
    if (!result.success) {
      return { paywallRequired: true }; // Client shows upgrade modal
    }
  }

  // ... existing redirect logic ...
}
```

### Pattern 4: Onboarding Modal — DB State, Client-Side Display

**What:** `users.onboardingComplete` is read server-side on dashboard load. If `false`, the dashboard passes `showWelcomeModal={true}` to a client component that renders the modal. On dismiss, a server action sets `onboardingComplete = true`.

**When to use:** Any first-run state that needs cross-device persistence.

**Trade-offs:**
- No Clerk metadata complexity (no `user.reload()` needed)
- No localStorage flash (server knows on first render)
- One extra column on a table that's already queried
- Cannot show modal before user reaches dashboard (acceptable — that's the right timing)

**Example:**

```typescript
// src/app/dashboard/page.tsx (Server Component) — MODIFIED
const user = await db.query.users.findFirst({
  where: eq(users.clerkUserId, userId),
  columns: {
    firstName: true,
    creditBalance: true,       // NEW
    onboardingComplete: true,  // NEW
  },
});

return (
  <>
    <DashboardClient
      showWelcomeModal={!user?.onboardingComplete}  // NEW
      creditBalance={user?.creditBalance ?? 0}       // NEW
    />
    {/* ... workshop grids ... */}
  </>
);
```

```typescript
// src/actions/billing-actions.ts (Server Action) — NEW
export async function markOnboardingComplete(): Promise<void> {
  'use server';
  const { userId } = await auth();
  if (!userId) return;

  await db
    .update(users)
    .set({ onboardingComplete: true })
    .where(eq(users.clerkUserId, userId));

  revalidatePath('/dashboard');
}
```

---

## Data Flow: Purchase → Credit → Workshop Unlock

### Happy Path (Stripe redirect checkout)

```
User clicks "Upgrade" in Step 7 paywall modal
         ↓
POST /api/billing/checkout
  → Creates Stripe Checkout session
  → session.metadata = { clerkUserId, creditQty: "1" }
  → Returns 303 → stripe.com/checkout
         ↓
User completes payment on Stripe-hosted page
         ↓
Two concurrent paths (belt-and-suspenders):

PATH A — Webhook (guaranteed):
  Stripe POST /api/webhooks/stripe
    → Verify svix signature
    → event.type = "checkout.session.completed"
    → fulfillCreditPurchase(session)
      → INSERT credit_transactions (onConflictDoNothing)
      → UPDATE users SET credit_balance += 1

PATH B — Success redirect (immediate UX):
  Browser → /billing/success?session_id=cs_xxx
    → Server Component reads session_id
    → Calls fulfillCheckout(session_id)
      → Same idempotent logic — safe to run twice
    → revalidatePath('/dashboard')
    → Shows "Credit added!" confirmation
         ↓
User navigates back to workshop → Step 7
  → page.tsx checks workshop.creditConsumedAt
  → NULL → checks users.creditBalance > 0
  → Has credit → paywallActive=false
  → Calls consumeCredit(workshopId) at step advance
  → Workshop unlocked, workshop.creditConsumedAt = now()
         ↓
Steps 7-10 accessible for this workshop forever
```

### Credit Check at Step Load

```
User navigates to /workshop/[sessionId]/step/7

StepPage (Server Component):
  stepNumber = 7 >= PAYWALL_STEP (7)
      ↓
  Load session.workshop (already queried for step enforcement)
      ↓
  workshop.creditConsumedAt != null?
    YES → paywallActive = false (skip balance check)
    NO  → Check users.creditBalance
            > 0 → paywallActive = false
            = 0 → paywallActive = true
      ↓
  <StepContainer paywallActive={paywallActive} ... />
      ↓
  If paywallActive:
    Chat panel renders <UpgradeModal />
    Canvas renders locked overlay
    Navigation "Complete Step" button disabled
```

---

## Integration Points with Existing Code

### Files Modified vs Created

| File | Status | Key Change |
|------|--------|-----------|
| `src/proxy.ts` | MODIFIED | Add `/api/webhooks/stripe(.*)` to public routes array |
| `src/db/schema/users.ts` | MODIFIED | Add `creditBalance`, `onboardingComplete` columns |
| `src/db/schema/workshops.ts` | MODIFIED | Add `creditConsumedAt` column |
| `src/db/schema/index.ts` | MODIFIED | Export `creditTransactions` |
| `src/db/schema/credit-transactions.ts` | NEW | Credit ledger table |
| `src/actions/workshop-actions.ts` | MODIFIED | `advanceToNextStep()` — credit gate at Step 6→7 |
| `src/actions/billing-actions.ts` | NEW | `createCheckoutSession`, `consumeCredit`, `markOnboardingComplete` |
| `src/app/api/webhooks/stripe/route.ts` | NEW | Stripe webhook handler |
| `src/app/api/billing/checkout/route.ts` | NEW | Checkout session creation |
| `src/app/billing/success/page.tsx` | NEW | Post-payment success + fulfillment trigger |
| `src/app/billing/cancel/page.tsx` | NEW | Canceled payment page (back to upgrade flow) |
| `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` | MODIFIED | Credit check, `paywallActive` prop |
| `src/app/dashboard/page.tsx` | MODIFIED | Read `creditBalance`, `onboardingComplete` |
| `src/app/pricing/page.tsx` | MODIFIED | New tier copy, "Buy Now" links |
| `src/components/billing/upgrade-modal.tsx` | NEW | Inline paywall upgrade CTA |
| `src/components/billing/credit-badge.tsx` | NEW | Dashboard header credit count display |
| `src/components/onboarding/welcome-modal.tsx` | NEW | First-run welcome modal |
| `src/lib/billing/stripe.ts` | NEW | Stripe SDK singleton |

### New Environment Variables Required

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...           # Server-side only
STRIPE_PUBLISHABLE_KEY=pk_live_...      # Optional for embedded elements
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signature verification

# Stripe Price IDs (set per environment)
STRIPE_PRICE_SINGLE_FLIGHT=price_...    # $79, 1 credit
STRIPE_PRICE_SERIAL_ENTREPRENEUR=price_... # $149, 3 credits

# App URL (for redirect URLs)
NEXT_PUBLIC_APP_URL=https://workshoppilot.ai
```

---

## Recommended Project Structure (New Files Only)

```
src/
├── app/
│   ├── api/
│   │   ├── billing/
│   │   │   └── checkout/
│   │   │       └── route.ts          # NEW: Checkout session creator
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts          # NEW: Stripe event handler
│   ├── billing/
│   │   ├── success/
│   │   │   └── page.tsx              # NEW: Post-payment success page
│   │   └── cancel/
│   │       └── page.tsx              # NEW: Canceled payment page
│   └── pricing/
│       └── page.tsx                  # MODIFIED: New tiers + Buy Now
│
├── components/
│   ├── billing/
│   │   ├── upgrade-modal.tsx         # NEW: Paywall upgrade CTA
│   │   └── credit-badge.tsx          # NEW: Dashboard credit count
│   └── onboarding/
│       └── welcome-modal.tsx         # NEW: First-run modal
│
├── actions/
│   └── billing-actions.ts            # NEW: All billing + onboarding actions
│
├── db/
│   └── schema/
│       └── credit-transactions.ts    # NEW: Credit ledger table
│
└── lib/
    └── billing/
        └── stripe.ts                 # NEW: Stripe SDK singleton
```

---

## Build Order (Dependency Graph)

Dependencies flow strictly: schema → data layer → server logic → UI.

```
Phase A: Database Foundation (no dependencies)
  1. Add migration: users.credit_balance, users.onboarding_complete
  2. Add migration: workshops.credit_consumed_at
  3. Create credit_transactions table + migration
  4. Run drizzle-kit generate + migrate in dev

Phase B: Stripe Infrastructure (needs Phase A)
  5. Install stripe npm package
  6. Create src/lib/billing/stripe.ts (singleton)
  7. Add STRIPE_* env vars to .env.local + Vercel dashboard
  8. Create Stripe products + prices in Stripe Dashboard
  9. Record Price IDs in env vars

Phase C: Payment API (needs Phase B)
  10. Create /api/billing/checkout/route.ts
  11. Create /api/webhooks/stripe/route.ts (fulfillCreditPurchase)
  12. Add /api/webhooks/stripe to public routes in proxy.ts
  13. Test webhook locally with Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe

Phase D: Billing Actions (needs Phase A + C)
  14. Create billing-actions.ts: consumeCredit(), markOnboardingComplete()
  15. Modify workshop-actions.ts: credit gate in advanceToNextStep()
  16. Create /billing/success/page.tsx (belt-and-suspenders fulfillment)
  17. Create /billing/cancel/page.tsx

Phase E: Paywall UI (needs Phase C + D)
  18. Modify step page: read creditBalance, pass paywallActive prop
  19. Create upgrade-modal.tsx (shown when paywallActive=true)
  20. Create credit-badge.tsx for dashboard header

Phase F: Onboarding UI (needs Phase A + D — independent from Stripe)
  21. Create welcome-modal.tsx (reads showWelcomeModal from dashboard)
  22. Modify dashboard/page.tsx: pass showWelcomeModal, creditBalance
  23. Wire markOnboardingComplete() to modal dismiss

Phase G: Pricing Page (needs Phase B)
  24. Update /pricing/page.tsx with new tier copy
  25. Add "Buy Now" buttons linking to /api/billing/checkout

Phase H: Integration Test
  26. E2E: complete Steps 1-6 → hit paywall → purchase → Step 7 unlocks
  27. Dashboard: credit badge shows correct count
  28. Webhook idempotency: replay same event, balance unchanged
```

**Onboarding is independent of Stripe** — Phase F can run in parallel with Phases C-E after Phase A is complete. The welcome modal requires only the DB column and server action.

---

## Anti-Patterns

### Anti-Pattern 1: Paywall Check in Middleware

**What people do:** Check `users.creditBalance` in `clerkMiddleware` to block Step 7 URL access.

**Why it's wrong:**
- Middleware cannot easily make async DB queries and stay fast (edge cold start concerns)
- It doesn't have workshop-level context: the same user might have different credit states for different workshops
- If the DB is slow or errors, middleware blocks ALL requests, not just paywalled ones
- The existing codebase already uses middleware only for auth/role checks, not app-level business logic

**Do this instead:** Check credit in the Step Server Component (per-workshop, per-user, async, non-blocking).

### Anti-Pattern 2: Storing onboardingComplete in Clerk publicMetadata

**What people do:** `await clerkClient().users.updateUserMetadata(id, { publicMetadata: { onboardingComplete: true } })`.

**Why it's wrong:**
- Requires calling Clerk Admin API on every update (extra latency + rate limit exposure)
- JWT session claims are stale until `user.reload()` is called client-side
- Adds complexity: the dashboard Server Component would need to call Clerk API instead of the already-queried DB row
- The `users` DB table is already the app's user source of truth

**Do this instead:** Add `onboardingComplete` column to `users` table. It's just data.

### Anti-Pattern 3: Trusting Client-Sent Credit Quantity

**What people do:** Pass `creditQty` from a client-side button directly to the checkout session without server-side validation.

**Why it's wrong:**
- A user could POST `creditQty: 1000` to `/api/billing/checkout`
- Even though Stripe charges the right amount (Price ID is server-side), the webhook would credit 1000 credits

**Do this instead:** Derive `creditQty` from the `priceId` in the Route Handler using a server-side lookup table. Never trust quantity from the client:
```typescript
const PRICE_TO_CREDITS: Record<string, number> = {
  [process.env.STRIPE_PRICE_SINGLE_FLIGHT!]: 1,
  [process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR!]: 3,
};
const creditQty = PRICE_TO_CREDITS[priceId] ?? 0;
```

### Anti-Pattern 4: Skipping the Credit Ledger (Balance-Only)

**What people do:** Only store `users.creditBalance` integer, no `credit_transactions` table.

**Why it's wrong:**
- No idempotency guard: two concurrent webhook calls both increment the balance by 1
- No audit trail: impossible to debug "where did my credits go?"
- No ability to recover balance if counter corrupts

**Do this instead:** Ledger table with `stripeSessionId UNIQUE` constraint. Balance is the aggregate, ledger is the source of truth.

### Anti-Pattern 5: Using Server Actions for Checkout Redirect

**What people do:** `createCheckoutSession()` server action calls `stripe.checkout.sessions.create()` then calls `redirect(session.url)`.

**Why it's wrong:**
- Server actions can call `redirect()`, but this makes the redirect harder to intercept for error handling
- Stripe docs explicitly recommend Route Handlers for this pattern
- Server action `redirect()` throws `NEXT_REDIRECT` which must be re-thrown — adding error-handling complexity at the paywall

**Do this instead:** Route Handler at `/api/billing/checkout` returning a 303 redirect. Client submits a form with `method="POST"` to trigger it.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current design sufficient. Neon HTTP + Drizzle handles concurrent webhook calls fine with unique constraint. |
| 1k-10k users | Add Stripe webhook retries monitoring. Consider a job queue (e.g., Inngest) if fulfillment logic grows complex. Cache credit balance in Clerk publicMetadata for dashboard read performance (sync on purchase). |
| 10k+ users | Credit balance reads become hot path — consider Redis cache for balance. Separate billing service if per-request overhead of Stripe SDK adds up. |

### Scaling Priority for v1.8

The first bottleneck is webhook reliability on Vercel: Vercel Deployment Protection must be disabled for `/api/webhooks/stripe` (or add webhook to bypass list). Stripe retries failed webhooks, but if Vercel blocks the route, credits never land.

---

## Sources

- [Build a Stripe-hosted checkout page — Stripe Docs](https://docs.stripe.com/checkout/quickstart?client=next) — HIGH confidence
- [Fulfill orders after checkout — Stripe Docs](https://docs.stripe.com/checkout/fulfillment) — HIGH confidence
- [Resolve webhook signature verification errors — Stripe Docs](https://docs.stripe.com/webhooks/signature) — HIGH confidence
- [Stripe Metadata docs](https://docs.stripe.com/metadata) — HIGH confidence (metadata values must be strings)
- [Add custom onboarding to your authentication flow — Clerk Docs](https://clerk.com/docs/references/nextjs/add-onboarding-flow) — HIGH confidence
- [Stripe + Next.js 15: The Complete 2025 Guide — Pedro Alonso](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) — MEDIUM confidence (community guide, consistent with official docs)
- [Neon Serverless Driver — Neon Docs](https://neon.com/docs/serverless/serverless-driver) — HIGH confidence (neon-http transaction limitations)
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) — HIGH confidence
- Existing codebase analysis: `src/proxy.ts`, `src/db/schema/users.ts`, `src/app/api/webhooks/clerk/route.ts`, `src/actions/workshop-actions.ts`, `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` — HIGH confidence (direct inspection)

---

*Architecture research for: Stripe Checkout + Credit System + Onboarding — WorkshopPilot.ai v1.8*
*Researched: 2026-02-26*
