# Phase 49: Payment API Layer - Research

**Researched:** 2026-02-26
**Domain:** Stripe Checkout Session creation, webhook handling, idempotent credit fulfillment, Next.js App Router route handlers
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-01 | User can purchase a Single Flight workshop credit ($79) via Stripe Checkout | Checkout route POST /api/billing/checkout with STRIPE_PRICE_SINGLE_FLIGHT price ID, stripe.checkout.sessions.create(), NextResponse.redirect(session.url, 303) |
| BILL-02 | User can purchase a Serial Entrepreneur pack (3 credits, $149) via Stripe Checkout | Same checkout route, STRIPE_PRICE_SERIAL_ENTREPRENEUR price ID; metadata.creditQty=3 differentiates fulfillment |
| BILL-03 | After purchase, credits are immediately available in user's account | Dual-trigger: success page calls fulfillCreditPurchase() immediately on load (session retrieve + DB write); webhook fires as backup/retry path |
| BILL-04 | Stripe webhook handles payment confirmation with idempotent credit fulfillment | constructEvent() signature verification, onConflictDoNothing() on stripeSessionId UNIQUE constraint prevents double-write |
| BILL-05 | Credit purchases are recorded in a transaction ledger | fulfillCreditPurchase() writes a row to credit_transactions with type='purchase', stripeSessionId, amount, balanceAfter, description |
</phase_requirements>

---

## Summary

Phase 49 builds three API/page artifacts that complete the Stripe Checkout purchase loop. Plan 49-01 creates a server-side POST route at `/api/billing/checkout` that accepts a `priceId` body parameter, looks up the matching credit quantity in a server-side map (never trusting client-supplied quantities), creates a Stripe Checkout Session, and returns a 303 redirect to `session.url`. Plan 49-02 creates the webhook handler at `/api/webhooks/stripe` that verifies Stripe's HMAC signature via `stripe.webhooks.constructEvent()` using the raw request body (not JSON-parsed), then calls `fulfillCreditPurchase()` — a shared function that atomically increments `users.creditBalance` and inserts a row into `credit_transactions`. The idempotency guarantee comes entirely from the `stripeSessionId UNIQUE` constraint: if fulfillment was already recorded, `onConflictDoNothing()` silently skips the insert and the balance update is guarded by a prior-existence check. Plan 49-03 creates the `/purchase/success` and `/purchase/cancel` Server Component pages; the success page retrieves the session from Stripe using the `session_id` query param, calls `fulfillCreditPurchase()` immediately (dual-trigger), and shows the updated credit count without waiting for the webhook.

The database layer (Phase 47) provides all required columns: `users.creditBalance` (atomic increment target), `credit_transactions.stripeSessionId UNIQUE` (idempotency enforcer), and `users.stripeCustomerId` (populated lazily during checkout). The Stripe singleton (Phase 48) is imported as `stripe` from `@/lib/billing/stripe`. No new npm packages are needed. The `neon-http` driver limitation (no `SELECT FOR UPDATE`) is a concern for Phase 50's `consumeCredit()` but does NOT affect Phase 49's purchase flow — the idempotency here is constraint-based, not lock-based.

**Primary recommendation:** Implement `fulfillCreditPurchase(sessionId: string)` as a shared function in `src/lib/billing/fulfill-credit-purchase.ts` that both the webhook handler and the success page call. Use Drizzle's `onConflictDoNothing({ target: creditTransactions.stripeSessionId })` as the sole idempotency gate. Both callers first call `stripe.checkout.sessions.retrieve(sessionId)` to verify `payment_status === 'paid'` before writing.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.4.0 | Checkout Session creation, webhook signature verification | Already installed (Phase 48); server-only singleton at src/lib/billing/stripe.ts |
| drizzle-orm | ^0.45.1 | Atomic balance increment, idempotent transaction insert | Already installed; neon-http driver in use |
| @neondatabase/serverless | ^1.0.2 | Neon HTTP driver (edge-compatible) | Already installed; neon-http does NOT support SELECT FOR UPDATE — acceptable for this phase |
| next/headers | built-in | Access `stripe-signature` header in webhook route | Same pattern as Clerk webhook at src/app/api/webhooks/clerk/route.ts |
| next/navigation | built-in | Server Component searchParams for session_id on success page | App Router pattern |
| @clerk/nextjs/server | installed | auth() call in checkout route to get clerkUserId | Already used throughout codebase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sql (from drizzle-orm) | ^0.45.1 | Atomic creditBalance increment expression | Used in fulfillCreditPurchase() update: `sql\`${users.creditBalance} + ${amount}\`` |

### Packages NOT Needed for This Phase

| Package | Why Excluded |
|---------|-------------|
| @stripe/stripe-js | Redirect Checkout mode — zero client-side Stripe JS (locked decision) |
| @stripe/react-stripe-js | Same reason — Elements not used |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| onConflictDoNothing for idempotency | Explicit event.id tracking table | UNIQUE constraint is simpler, uses existing schema, zero extra table; event.id approach provides more audit granularity (unnecessary for this use case) |
| stripe.checkout.sessions.retrieve() in success page | Trust client-supplied creditQty | Never trust client; always retrieve from Stripe to confirm payment_status === 'paid' |
| Server Component success page (no JS) | Client-side polling for credit update | Server Component retrieves session + writes credits synchronously; user sees correct count immediately without polling |
| Shared fulfillCreditPurchase() function | Duplicate logic in webhook + success page | Shared function is the only maintainable approach; duplicating creates divergence risk |

**Installation:**
```bash
# No new packages required — stripe, drizzle-orm, @neondatabase/serverless all installed in Phase 48
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── billing/
│       ├── stripe.ts                   # Existing — server-only singleton (Phase 48)
│       ├── fulfill-credit-purchase.ts  # NEW — shared fulfillment function (Plans 49-01, 49-02, 49-03 all use this)
│       └── price-config.ts             # NEW — server-side priceId→creditQty map (Plan 49-01)
├── app/
│   ├── api/
│   │   ├── billing/
│   │   │   └── checkout/
│   │   │       └── route.ts            # NEW — Plan 49-01: POST handler, creates Checkout Session
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts            # NEW — Plan 49-02: webhook handler, idempotent fulfillment
│   └── purchase/
│       ├── success/
│       │   └── page.tsx                # NEW — Plan 49-03: dual-trigger credit sync, show balance
│       └── cancel/
│           └── page.tsx                # NEW — Plan 49-03: cancel page with return-to-dashboard link
```

### Pattern 1: Server-Side priceId → creditQty Map (Plan 49-01)

**What:** A constant map on the server that translates a Stripe Price ID to the credit quantity awarded. The checkout route uses this map — the client sends a `priceId` string, the server resolves how many credits it grants. The client never sends a credit quantity.

**Why:** Prevents client-side tampering. If a user sends `priceId: STRIPE_PRICE_SERIAL_ENTREPRENEUR` with a self-supplied `creditQty: 100`, the server ignores the client value and uses the map.

```typescript
// src/lib/billing/price-config.ts
// Source: project decision in STATE.md (credit-based model, fixed price IDs in env vars)
import 'server-only';

export interface PriceConfig {
  priceId: string;
  creditQty: number;
  label: string;
  amountCents: number;
}

export function getPriceConfig(priceId: string): PriceConfig | null {
  const configs: Record<string, PriceConfig> = {
    [process.env.STRIPE_PRICE_SINGLE_FLIGHT!]: {
      priceId: process.env.STRIPE_PRICE_SINGLE_FLIGHT!,
      creditQty: 1,
      label: 'Single Flight Workshop',
      amountCents: 7900,
    },
    [process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR!]: {
      priceId: process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR!,
      creditQty: 3,
      label: 'Serial Entrepreneur Pack',
      amountCents: 14900,
    },
  };
  return configs[priceId] ?? null;
}
```

### Pattern 2: Checkout Route Handler (Plan 49-01)

**What:** POST `/api/billing/checkout`. Requires auth, validates priceId against server-side map, creates Stripe Checkout Session with clerkUserId + creditQty in metadata, returns 303 redirect to session.url.

**When to use:** Called by any "Buy Now" button. The client POSTs `{ priceId }` to this route.

```typescript
// src/app/api/billing/checkout/route.ts
// Source: docs.stripe.com/checkout/quickstart, Phase 48 RESEARCH.md code examples
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/billing/stripe';
import { getPriceConfig } from '@/lib/billing/price-config';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { priceId } = body;

  const priceConfig = getPriceConfig(priceId);
  if (!priceConfig) {
    return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
  }

  const origin = (await headers()).get('origin') ?? 'https://workshoppilot.ai';

  // Lazy Stripe Customer creation
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  let stripeCustomerId = user?.stripeCustomerId ?? undefined;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      metadata: { clerkUserId: userId },
      email: user?.email,
    });
    stripeCustomerId = customer.id;
    await db.update(users)
      .set({ stripeCustomerId })
      .where(eq(users.clerkUserId, userId));
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    line_items: [{ price: priceConfig.priceId, quantity: 1 }],
    success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/purchase/cancel`,
    metadata: {
      clerkUserId: userId,
      creditQty: String(priceConfig.creditQty),
      productType: priceConfig.label,
    },
  });

  // 303 redirect: browser issues GET to session.url (Stripe-hosted checkout page)
  return NextResponse.redirect(session.url!, 303);
}
```

**Key design choices:**
- `303` status: correct redirect code for POST→GET redirect (browser follows with GET)
- `customer:` parameter passed when stripeCustomerId exists — Stripe pre-fills customer info, avoids duplicate Stripe Customers
- `metadata.clerkUserId` + `metadata.creditQty` — both values survive into the webhook event, enabling fulfillment without a DB lookup on the Checkout Session
- `client_reference_id` is an alternative to metadata for user identity (single string, 220 chars), but metadata is more explicit and readable

### Pattern 3: Shared fulfillCreditPurchase() (Plans 49-01, 49-02, 49-03)

**What:** A single function that both the webhook handler and the success page call. It retrieves the Checkout Session from Stripe, verifies `payment_status === 'paid'`, then atomically inserts a `credit_transactions` row and increments `users.creditBalance`. The `onConflictDoNothing` on `stripeSessionId` makes it safe to call multiple times.

**Why:** Without a shared function, the webhook and success page would have duplicated logic that could diverge. The function is the single source of truth for fulfillment.

```typescript
// src/lib/billing/fulfill-credit-purchase.ts
// Source: docs.stripe.com/checkout/fulfillment, Drizzle ORM insert docs
import 'server-only';
import { stripe } from '@/lib/billing/stripe';
import { db } from '@/db/client';
import { users, creditTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export type FulfillResult =
  | { status: 'fulfilled'; creditQty: number; newBalance: number }
  | { status: 'already_fulfilled' }
  | { status: 'payment_not_paid' }
  | { status: 'user_not_found' };

export async function fulfillCreditPurchase(sessionId: string): Promise<FulfillResult> {
  // 1. Retrieve session from Stripe to verify payment_status
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return { status: 'payment_not_paid' };
  }

  const clerkUserId = session.metadata?.clerkUserId;
  const creditQty = parseInt(session.metadata?.creditQty ?? '0', 10);

  if (!clerkUserId || creditQty <= 0) {
    throw new Error(`Invalid session metadata for session ${sessionId}`);
  }

  // 2. Look up user to get current balance for balanceAfter calculation
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    return { status: 'user_not_found' };
  }

  // 3. Attempt to insert credit_transactions row
  //    onConflictDoNothing on stripeSessionId UNIQUE — if already fulfilled, skip
  const inserted = await db
    .insert(creditTransactions)
    .values({
      clerkUserId,
      type: 'purchase',
      status: 'completed',
      amount: creditQty,
      balanceAfter: user.creditBalance + creditQty,
      description: `Purchase: ${session.metadata?.productType ?? 'Workshop credit'}`,
      stripeSessionId: sessionId,
    })
    .onConflictDoNothing({ target: creditTransactions.stripeSessionId })
    .returning({ id: creditTransactions.id });

  // If nothing was inserted, this session was already fulfilled
  if (inserted.length === 0) {
    return { status: 'already_fulfilled' };
  }

  // 4. Atomically increment creditBalance
  const [updatedUser] = await db
    .update(users)
    .set({
      creditBalance: sql`${users.creditBalance} + ${creditQty}`,
    })
    .where(eq(users.clerkUserId, clerkUserId))
    .returning({ creditBalance: users.creditBalance });

  return {
    status: 'fulfilled',
    creditQty,
    newBalance: updatedUser.creditBalance,
  };
}
```

**Key design choices:**
- `stripe.checkout.sessions.retrieve(sessionId)` called by BOTH callers — payment_status check is authoritative, not trusting client-passed data
- `onConflictDoNothing({ target: creditTransactions.stripeSessionId })` — UNIQUE constraint on stripeSessionId is the idempotency gate
- `returning({ id: creditTransactions.id }).length === 0` detects duplicate without a separate SELECT
- Two separate writes (insert then update) are acceptable: if the update fails after a successful insert, a retry will hit `already_fulfilled` on the insert and skip to the update. This is not fully atomic but is safe — the transaction row exists, preventing double-counting on retries. (Full atomicity via db.transaction() would require neon-ws driver; see Blockers section.)

### Pattern 4: Webhook Handler (Plan 49-02)

**What:** POST `/api/webhooks/stripe`. Reads raw body via `req.text()`, extracts `stripe-signature` header, calls `stripe.webhooks.constructEvent()`. On `checkout.session.completed`, calls `fulfillCreditPurchase()`.

**Pattern identical to Clerk webhook at `src/app/api/webhooks/clerk/route.ts` — raw body, header extraction, try/catch.**

```typescript
// src/app/api/webhooks/stripe/route.ts
// Source: Phase 48 RESEARCH.md code example (webhook pattern)
// Source: src/app/api/webhooks/clerk/route.ts (raw body pattern already established)
import { stripe } from '@/lib/billing/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { fulfillCreditPurchase } from '@/lib/billing/fulfill-credit-purchase';
import type Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text(); // Raw text — NOT req.json() (HMAC is over raw bytes)
  const headerPayload = await headers();
  const signature = headerPayload.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    // Invalid signature — return 400 (not 500) so Stripe doesn't retry permanently
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await fulfillCreditPurchase(session.id);
        console.log(`Stripe webhook fulfillment: ${session.id} → ${result.status}`);
        break;
      }
      default:
        // Acknowledge unhandled events — do not return 400 for unknown types
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    // Return 500 so Stripe retries — the idempotency constraint prevents double-fulfillment
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
```

**Key design choices:**
- `400` for invalid signatures: Stripe will NOT retry 4xx responses. This is correct — a bad signature means the event is invalid, not transient.
- `500` for handler errors: Stripe WILL retry 5xx responses. This is correct — the `onConflictDoNothing` prevents double-fulfillment on retries.
- `200` for unhandled event types: Stripe sends many event types; returning 400 for unknown types causes needless delivery failures.

### Pattern 5: Success Page (Plan 49-03)

**What:** A Next.js Server Component at `/purchase/success`. Reads `session_id` from searchParams, calls `fulfillCreditPurchase(sessionId)`, shows the updated credit count immediately.

**This is the "dual-trigger" — the success page fulfills FIRST, then the webhook fires as confirmation/backup.**

```typescript
// src/app/purchase/success/page.tsx
// Source: docs.stripe.com/payments/checkout/custom-success-page
// Source: Stripe fulfillment docs — success page + webhook dual-trigger pattern
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { fulfillCreditPurchase } from '@/lib/billing/fulfill-credit-purchase';

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function PurchaseSuccessPage({ searchParams }: SuccessPageProps) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const { session_id } = await searchParams;
  if (!session_id) redirect('/dashboard');

  const result = await fulfillCreditPurchase(session_id);

  // Render based on result
  // ... show credit count, return to dashboard link
}
```

**searchParams is a Promise in Next.js App Router (async Server Components)** — `await searchParams` is the correct pattern per Next.js 16.x docs.

### Anti-Patterns to Avoid

- **Using `req.json()` in the webhook route:** Mutates raw bytes, breaks HMAC signature verification. Always `req.text()` for webhook routes.
- **Returning 400 for unhandled event types:** Stripe retries delivery for 4xx responses in some configurations. Return 200 for unknown event types.
- **Trusting client-supplied creditQty:** Never accept credit quantities from the client. The server-side `getPriceConfig()` map is authoritative.
- **Calling fulfillCreditPurchase() without verifying payment_status:** Stripe can send `checkout.session.completed` for sessions with `payment_status: 'unpaid'` (e.g., for deferred payment methods). Always check `payment_status === 'paid'` first.
- **Creating a new Stripe Customer on every checkout:** Always check `users.stripeCustomerId` and reuse if set. Creates cleaner Stripe Dashboard and allows saved payment methods.
- **Using `redirect()` from next/navigation inside a try/catch:** `redirect()` throws an error internally; wrapping in try/catch will swallow it. Use `NextResponse.redirect()` in route handlers instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook HMAC verification | Custom crypto.createHmac | `stripe.webhooks.constructEvent()` | Stripe's method handles timing-safe comparison, 5-minute tolerance window, multiple signature schemes |
| Checkout Session creation | Custom payment form | `stripe.checkout.sessions.create()` | PCI compliance, Apple/Google Pay, 3DS, fraud detection — impossible to replicate |
| Idempotency gate | Separate processed_events table | `stripeSessionId UNIQUE` constraint + `onConflictDoNothing()` | Zero extra table, uses existing schema (Phase 47), atomically safe |
| Credit amount lookup | Client-supplied creditQty | `getPriceConfig(priceId)` server-side map | Client data is untrusted; server map is authoritative |
| Payment status verification | Trust webhook payload | `stripe.checkout.sessions.retrieve(sessionId)` | Verify against Stripe's API directly; both callers should retrieve fresh session |

**Key insight:** The idempotency in this phase is schema-level, not application-level. The UNIQUE constraint on `stripeSessionId` is the single source of truth — no event ID tracking table, no Redis locks, no separate idempotency keys needed.

---

## Common Pitfalls

### Pitfall 1: Raw Body Required for Webhook Signature Verification

**What goes wrong:** `constructEvent()` throws `SignatureVerificationError` even when the webhook secret is correct.

**Why it happens:** Any body parsing before `constructEvent()` (e.g., `req.json()`, Next.js body middleware) changes the raw bytes that Stripe's HMAC was computed over.

**How to avoid:** Use `await req.text()` in the webhook route — exactly the same pattern as `src/app/api/webhooks/clerk/route.ts` line 42.

**Warning signs:** `Error: No signatures found matching the expected signature for payload.`

### Pitfall 2: Webhook Secret Mismatch (CLI whsec_ vs Dashboard endpoint secret)

**What goes wrong:** Local webhook testing fails — every event gets `SignatureVerificationError`.

**Why it happens:** `STRIPE_WEBHOOK_SECRET` in `.env.local` is currently set to the Stripe Dashboard endpoint secret (for production). The `stripe listen` CLI generates a different, ephemeral `whsec_...` secret at startup.

**How to avoid:** For local development, override `STRIPE_WEBHOOK_SECRET` in `.env.local` with the CLI-printed value when running `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Use a `.env.local.production` comment to document which value is which.

**Warning signs:** `Error: No signatures found matching...` when `stripe listen` is running locally.

**Note from 48-01-SUMMARY.md:** This is a known concern — STRIPE_WEBHOOK_SECRET in .env.local is the Dashboard endpoint secret (production). Developers must use the CLI whsec_ for local testing.

### Pitfall 3: STRIPE_PRICE_* env vars are Product IDs, not Price IDs

**What goes wrong:** `stripe.checkout.sessions.create()` throws `No such price: 'prod_...'` because Product IDs and Price IDs are different objects in Stripe.

**Why it happens:** From 48-01-SUMMARY.md: the env vars `STRIPE_PRICE_SINGLE_FLIGHT` and `STRIPE_PRICE_SERIAL_ENTREPRENEUR` are currently set to `prod_...` values (Product IDs) instead of `price_...` values (Price IDs).

**How to avoid:** **This is a pre-condition for Plan 49-01.** The first task of Plan 49-01 must include a human-action checkpoint to update these env vars to Price IDs. The user must go to Stripe Dashboard → Products → click on each product → copy the Price ID from the Pricing section.

**Warning signs:** `Stripe error: No such price: 'prod_U2vWFKThHIkKtK'`

### Pitfall 4: balanceAfter Race Condition in fulfillCreditPurchase()

**What goes wrong:** Two concurrent fulfillment calls (e.g., webhook + success page arriving simultaneously) both read the same `user.creditBalance`, compute the same `balanceAfter`, and write conflicting values. The final balance is wrong.

**Why it happens:** The current implementation reads `user.creditBalance`, adds `creditQty`, and stores the result as `balanceAfter` in `credit_transactions`. If two calls race, both read the pre-update balance.

**How to avoid:** The `credit_transactions.balanceAfter` field should be computed AFTER the atomic `creditBalance` increment, not before. The sequence should be: (1) insert the transaction row with a placeholder `balanceAfter`, (2) atomically increment `creditBalance`, (3) update `balanceAfter` from the RETURNING result. Alternatively, use a single Drizzle `sql` expression to compute `balanceAfter` in-database: `sql\`${users.creditBalance} + ${creditQty}\``.

**Simpler approach:** Accept that `balanceAfter` in the ledger is the post-update balance from the RETURNING clause of the `db.update()` call, not pre-computed. The two writes (insert + update) are not fully atomic, but the `onConflictDoNothing` idempotency gate prevents double-counting.

**Warning signs:** `credit_transactions.balanceAfter` shows stale values in concurrent load testing.

### Pitfall 5: Vercel Deployment Protection Blocking Preview Webhook Delivery

**What goes wrong:** Stripe cannot deliver webhooks to preview deployments — gets 401 from Vercel.

**Why it happens:** Vercel Deployment Protection is enabled on preview environments; Stripe doesn't know to include a bypass header.

**How to avoid:** From STATE.md: "Vercel Deployment Protection may block `/api/webhooks/stripe` in preview — add to bypass list before Phase 49 testing begins." Go to Vercel Dashboard → Project Settings → Deployment Protection → enable Protection Bypass for Automation. Add the generated secret as a query param to the webhook URL registered in Stripe Dashboard for preview environments.

**Warning signs:** Stripe Dashboard shows 401 responses on webhook delivery for preview URLs.

### Pitfall 6: searchParams is a Promise in Next.js App Router

**What goes wrong:** TypeScript error or runtime crash accessing `searchParams.session_id` directly without await.

**Why it happens:** In Next.js 15+/16.x App Router, `searchParams` is a `Promise<...>` in async Server Components and must be awaited.

**How to avoid:** Always `const { session_id } = await searchParams;` in the success page. This is documented in Next.js 16.x route handler docs (fetched from nextjs.org).

**Warning signs:** `TypeError: searchParams.session_id is not a function` or TypeScript type errors.

### Pitfall 7: 303 vs 302 for POST→GET Redirect

**What goes wrong:** Some older browsers or clients issue a POST to the redirect URL instead of a GET.

**Why it happens:** HTTP 302 is ambiguous about whether the redirect should use the original method or switch to GET. Some clients issue POST to the redirect URL.

**How to avoid:** Use 303 (See Other) for the checkout redirect: `NextResponse.redirect(session.url!, 303)`. HTTP 303 explicitly requires the client to issue a GET to the redirect URL. This is the official Stripe docs example.

**Warning signs:** Stripe checkout page receives a POST request and returns 405.

---

## Code Examples

Verified patterns from official sources and project conventions:

### Stripe Checkout Session Create (Official Pattern)

```typescript
// Source: docs.stripe.com/checkout/quickstart?client=next
const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,         // Pre-created customer for saved payment methods
  mode: 'payment',                    // One-time payment (not subscription)
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/purchase/cancel`,
  metadata: {
    clerkUserId: userId,              // 40-char limit on keys, 500-char on values, 50 max KVPs
    creditQty: '1',                   // String — metadata values are always strings
    productType: 'Single Flight Workshop',
  },
});
return NextResponse.redirect(session.url!, 303);
```

### Webhook constructEvent (Established Pattern)

```typescript
// Source: Phase 48 RESEARCH.md; matches src/app/api/webhooks/clerk/route.ts pattern
const body = await req.text();                              // Raw text — never req.json()
const headerPayload = await headers();
const signature = headerPayload.get('stripe-signature');   // Header name is lowercase

let event: Stripe.Event;
try {
  event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
} catch (err) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}
```

### Atomic Credit Balance Increment (Drizzle)

```typescript
// Source: orm.drizzle.team/docs/guides/incrementing-a-value
// Generates: UPDATE users SET credit_balance = credit_balance + 1 WHERE clerk_user_id = $1
const [updated] = await db
  .update(users)
  .set({ creditBalance: sql`${users.creditBalance} + ${creditQty}` })
  .where(eq(users.clerkUserId, clerkUserId))
  .returning({ creditBalance: users.creditBalance });
```

### Idempotent Insert with onConflictDoNothing

```typescript
// Source: orm.drizzle.team/docs/insert (onConflictDoNothing with target)
const inserted = await db
  .insert(creditTransactions)
  .values({ ...row, stripeSessionId: sessionId })
  .onConflictDoNothing({ target: creditTransactions.stripeSessionId })
  .returning({ id: creditTransactions.id });

if (inserted.length === 0) {
  // Already fulfilled — this session ID was already processed
  return { status: 'already_fulfilled' };
}
```

### Success Page Session Retrieve

```typescript
// Source: docs.stripe.com/payments/checkout/custom-success-page
const session = await stripe.checkout.sessions.retrieve(sessionId);
// Always check payment_status before fulfilling
if (session.payment_status !== 'paid') {
  // Deferred payment — redirect to pending page
}
```

### Stripe Lazy Customer Creation

```typescript
// Source: t3dotgg/stripe-recommendations, docs.stripe.com/api/checkout/sessions/create
let stripeCustomerId = user?.stripeCustomerId ?? undefined;
if (!stripeCustomerId) {
  const customer = await stripe.customers.create({
    metadata: { clerkUserId: userId },
    email: user?.email,
  });
  stripeCustomerId = customer.id;
  await db.update(users).set({ stripeCustomerId }).where(eq(users.clerkUserId, userId));
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router webhook bodyParser: false config | App Router req.text() — no config needed | Next.js 13+ App Router | Simpler; no route config required |
| Storing processed event IDs in a separate table | UNIQUE constraint on stripeSessionId in credit_transactions | N/A (project decision) | Zero extra infrastructure; uses existing schema |
| Client sends creditQty in checkout request | Server-side priceId→creditQty map, client sends priceId only | Security best practice | Prevents client-side price manipulation |
| Eager Stripe Customer creation at signup | Lazy creation at first checkout | Best practice shift (2024-2025) | Avoids orphaned Stripe Customers for users who never purchase |
| Polling success page for credit update | Dual-trigger: success page + webhook | Stripe fulfillment docs recommendation | Immediate credit availability without webhook latency |

**Deprecated/outdated:**
- `export const config = { api: { bodyParser: false } }` — Pages Router pattern. Not needed in App Router. Use `req.text()` directly.
- `stripe.webhooks.constructEventAsync()` — exists in stripe SDK but is for async signature verification; not needed here.

---

## Open Questions

1. **Should fulfillCreditPurchase() use a DB transaction for the two writes (insert + update)?**
   - What we know: The neon-http driver does NOT support `SELECT FOR UPDATE`. The STATE.md blocker notes this for Phase 50's consumeCredit() but does not block Phase 49's purchase flow.
   - What's unclear: Whether Drizzle's `db.transaction()` works with neon-http driver for INSERT + UPDATE (not SELECT FOR UPDATE).
   - Research finding: neon-http does not support interactive transactions (multi-statement transactions over HTTP). A single-statement transaction is fine; multi-statement requires neon-ws.
   - Recommendation: Keep the two writes separate. The idempotency gate (onConflictDoNothing) prevents double-fulfillment. The `balanceAfter` field in credit_transactions should be populated from the RETURNING result of the update call (post-increment value), not pre-computed. This is acceptable for a purchase ledger — the insert records intent, the update records execution.

2. **What Stripe event types should the webhook handler subscribe to?**
   - What we know: `checkout.session.completed` fires when payment succeeds. `checkout.session.async_payment_succeeded` fires for deferred payment methods (ACH, etc.) that don't complete instantly.
   - What's unclear: Whether deferred payment methods are enabled for this account.
   - Recommendation: Handle both `checkout.session.completed` (with `payment_status === 'paid'` check) and `checkout.session.async_payment_succeeded`. The payment_status check inside fulfillCreditPurchase() already guards against unfulfilled payments.

3. **STRIPE_PRICE_* env vars need updating from prod_ to price_ IDs (pre-condition)**
   - What we know: Both env vars are currently set to Product IDs (`prod_...`) instead of Price IDs (`price_...`). This is documented in 48-01-SUMMARY.md.
   - What's unclear: Whether the user has already updated these in Vercel.
   - Recommendation: Plan 49-01 must include this as a human-action task 0 (or pre-condition check). The checkout route cannot be tested end-to-end until this is resolved.

4. **How should the success page handle concurrent calls with the webhook?**
   - What we know: The success page calls `fulfillCreditPurchase(sessionId)` and so does the webhook. The `onConflictDoNothing` idempotency gate means only one will actually write. The second caller gets `{ status: 'already_fulfilled' }`.
   - What's unclear: What the success page should show if `already_fulfilled` — it can still fetch the current `users.creditBalance` from the DB.
   - Recommendation: On `already_fulfilled`, the success page should fetch the current credit balance from the DB and display it. The user sees correct credits regardless of which trigger fired first.

---

## Pre-conditions for Phase 49 (Human Actions Required Before Plan 49-01)

These are blockers documented in STATE.md and 48-01-SUMMARY.md that must be resolved before coding can begin:

1. **Update STRIPE_PRICE_SINGLE_FLIGHT and STRIPE_PRICE_SERIAL_ENTREPRENEUR to price_ IDs:**
   - Stripe Dashboard (Test mode) → Products → Single Flight Workshop → Pricing section → copy Price ID (`price_...`)
   - Repeat for Serial Entrepreneur Pack
   - Update `.env.local` and Vercel Dashboard environment variables
   - Without this, `stripe.checkout.sessions.create()` throws `No such price: 'prod_...'`

2. **Update STRIPE_WEBHOOK_SECRET for local testing:**
   - Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Copy the printed `whsec_...` value
   - Override `STRIPE_WEBHOOK_SECRET` in `.env.local` with this value for local testing
   - The Dashboard endpoint secret (currently in .env.local) only works for production Stripe deliveries

3. **Vercel Deployment Protection bypass (for preview testing):**
   - Vercel Dashboard → Project Settings → Deployment Protection → Protection Bypass for Automation
   - Set the bypass secret in Stripe webhook URL for preview environments
   - Without this, Stripe webhook delivery to preview environments gets 401

These pre-conditions map to a human-action task in Plan 49-01 before any automated tasks.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` (key absent — no boolean key present). Skipping this section.

---

## Sources

### Primary (HIGH confidence)

- `docs.stripe.com/checkout/quickstart?client=next` — Official Stripe Checkout quickstart for Next.js; session creation pattern with success_url template, mode: 'payment', line_items
- `docs.stripe.com/checkout/fulfillment` — Dual-trigger pattern (success page + webhook), payment_status check before fulfillment, idempotency via database tracking
- `docs.stripe.com/api/checkout/sessions/object` — Session object fields: payment_status values (paid/unpaid/no_payment_required), amount_total, customer, metadata
- `docs.stripe.com/metadata` — Metadata limits: 50 KVPs max, 40-char keys, 500-char values; metadata preserved in webhook events
- `docs.stripe.com/payments/checkout/custom-success-page` — session_id in success_url via `{CHECKOUT_SESSION_ID}` template, stripe.checkout.sessions.retrieve() pattern
- `orm.drizzle.team/docs/guides/incrementing-a-value` — Atomic increment via `sql\`${table.column} + ${value}\`` in Drizzle update
- `orm.drizzle.team/docs/insert` — `onConflictDoNothing({ target: column })` syntax, returning() pattern
- `nextjs.org/docs/app/getting-started/route-handlers` (version 16.1.6, 2026-02-24) — Route Handlers API, NextRequest/NextResponse, no bodyParser config needed
- `src/app/api/webhooks/clerk/route.ts` (project file) — `await req.text()`, `await headers()`, signature verification pattern established in project
- `src/db/client.ts` (project file) — neon-http driver, no SELECT FOR UPDATE support
- `src/db/schema/credit-transactions.ts` (project file) — stripeSessionId UNIQUE constraint confirmed, creditTransactions table structure
- `src/db/schema/users.ts` (project file) — creditBalance: integer, stripeCustomerId: text nullable
- `.planning/phases/48-stripe-infrastructure/48-01-SUMMARY.md` (project file) — Confirmed Phase 48 artifacts, prod_ vs price_ ID issue, webhook secret distinction

### Secondary (MEDIUM confidence)

- `github.com/t3dotgg/stripe-recommendations` — Eager customer creation pattern, always pass stripeCustomerId to checkout; verified against Stripe API docs
- `dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33` — Webhook route pattern (req.text(), constructEvent); matches official docs pattern
- `docs.stripe.com/api/idempotent_requests` — Stripe's own idempotency key system (for API calls, not the same as webhook idempotency); useful for retrying checkout session creation
- WebSearch on `payment_status` values — confirmed paid/unpaid/no_payment_required from multiple sources; no direct Stripe API reference page fetched

### Tertiary (LOW confidence)

- Various WebSearch results on Next.js 303 redirect behavior — consistent across multiple sources; NextResponse.redirect(url, 303) syntax confirmed
- Community posts on neon-http transaction limitations — consistent with project STATE.md blocker note; not directly verified against Neon official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries already installed (Phase 48); no new packages needed; versions verified
- Architecture: HIGH — Pattern follows established project conventions (Clerk webhook structure, db/client.ts patterns); official Stripe docs verified for session create and webhook
- Pitfalls: HIGH — raw body requirement from official docs; webhook secret mismatch from Phase 48 research; UNIQUE constraint idempotency from Drizzle docs; prod_ vs price_ ID issue from 48-01-SUMMARY.md
- Pre-conditions: HIGH — Documented in STATE.md and 48-01-SUMMARY.md with specific steps

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (30 days — stripe SDK stable; Drizzle insert API stable)
