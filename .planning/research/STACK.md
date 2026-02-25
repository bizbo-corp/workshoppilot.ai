# Stack Research

**Domain:** Stripe Checkout integration + credit system + onboarding welcome modal (v1.8)
**Researched:** 2026-02-26
**Confidence:** HIGH

> This is a focused addendum for v1.8. The existing stack (Next.js 16.1.1, React 19,
> Tailwind 4, shadcn/ui, Clerk, Neon/Drizzle, Gemini, Vercel) is validated in production
> and NOT re-researched here. Scope covers only new libraries and patterns needed for v1.8.

---

## New Stack Additions

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `stripe` (server SDK) | `^20.4.0` | Create Checkout Sessions server-side, verify webhook signatures, retrieve session data | Official Node.js SDK, v20 is the current major (released 2026-02-25). Built-in TypeScript types — no separate `@types/stripe` needed. Works in Next.js serverless and edge runtimes. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `stripe` (server only) | `^20.4.0` | `stripe.checkout.sessions.create()`, `stripe.webhooks.constructEvent()` | All Stripe work. Server Action for session creation; Route Handler for webhook. |
| shadcn Dialog | already installed (`radix-ui ^1.4.3`) | Welcome modal on first visit | Zero new install. Controlled via `useState` + `localStorage` flag. |
| shadcn Tooltip | already installed (`radix-ui ^1.4.3`, `tooltip.tsx` in project) | Contextual hints for new users | Already in project. `TooltipProvider` lives in `sidebar.tsx` — add to root `layout.tsx` only if tooltips are needed outside the sidebar context. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Stripe CLI | Forward Stripe webhook events to `localhost:3000` during development | Install via `brew install stripe/stripe-cli/stripe`. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. The CLI generates a local `whsec_` signing secret that differs from the production dashboard secret — keep both in `.env.local`. |

---

## Installation

```bash
# Core — server-side Stripe SDK only
npm install stripe@^20.4.0

# No client-side Stripe packages needed for redirect mode
# @stripe/stripe-js  — NOT required
# @stripe/react-stripe-js — NOT required

# No new tooltip or tour libraries — shadcn Tooltip + Dialog already installed

# Dev tool (macOS)
brew install stripe/stripe-cli/stripe
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `stripe` server SDK only | `stripe` + `@stripe/stripe-js` + `@stripe/react-stripe-js` | Only if switching to Stripe Embedded Checkout (iframe on your domain) or Stripe Elements (custom payment form). Redirect mode requires zero client-side Stripe JS. |
| Redirect-mode Checkout | Embedded Checkout (`ui_mode: "embedded"`) | Embedded is Stripe's preferred 2026 pattern and keeps the user on your domain. Requires client-side `@stripe/react-stripe-js`. Redirect is simpler, needs no client JS, and is sufficient for v1.8. Switch to embedded later if conversion data justifies it. |
| shadcn Dialog (built-in) | Shepherd.js, Intro.js, react-joyride | Only if building a multi-step guided product tour across pages. For a one-time welcome modal + a handful of contextual tooltips, shadcn Dialog + Tooltip is zero-cost, already olive-themed, and avoids a 30-100 KB dependency. |
| shadcn Tooltip (built-in) | Floating UI, tippy.js | shadcn Tooltip already wraps Radix UI Tooltip Primitive, which uses Floating UI under the hood. Adding a second tooltip library creates duplicate provider trees and conflicting positioning logic. |
| `credits` column on `users` table | Separate credits ledger table | A ledger (append-only `credit_transactions` table) is the correct pattern for audit trails and dispute resolution. Add it as a future enhancement at FFP when financial compliance matters. For v1.8, a simple integer column is sufficient. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@stripe/stripe-js` + `@stripe/react-stripe-js` | Adds ~80 KB to the client bundle for redirect mode where Stripe hosts the entire checkout page. Zero client-side Stripe code is needed when you redirect to `session.url`. | Server-only `stripe` package. Return `session.url` from a Server Action and call `router.push(url)`. |
| `redirectToCheckout()` | Removed from `@stripe/stripe-js` on 2025-09-30 per official Stripe changelog. Calling it will throw at runtime. | Create a Checkout Session server-side, return `session.url`, and navigate client-side via Next.js router or `window.location.href`. |
| Shepherd.js / react-joyride / intro.js | 30-100 KB+ tour libraries with complex state machines, non-olive styling to override, and coupling to DOM selectors that break on component refactors. | shadcn Dialog for the welcome modal; shadcn Tooltip for contextual hints. Both already installed, olive-themed, and zero additional bundle cost. |
| `micro-cors` middleware in Route Handler | Pages Router legacy pattern. Incompatible with App Router Route Handlers and causes body parsing issues. | In App Router, use `await request.text()` in the Route Handler to get the raw body. Next.js does not auto-parse Route Handler bodies — no CORS middleware needed. |
| Storing `clerkUserId` credits in Clerk user metadata | Clerk metadata is for auth-adjacent data (roles, plan tier label). Credits are financial data that require transactions, idempotency checks, and direct DB queries — none of which Clerk metadata supports reliably. | Neon Postgres `users.credits` column, updated via Drizzle in the webhook handler. |
| Stripe Customer Portal | Subscription management UI for managing recurring billing. Not applicable to one-time credit purchases without active subscriptions. | Handle refund edge cases via Stripe Dashboard manually at v1.8 scale. |

---

## Integration Points with Existing Stack

### Clerk + Stripe

1. In the Server Action for checkout: call `auth()` from `@clerk/nextjs/server` to get the authenticated `userId`
2. Pass `userId` as `metadata.clerkUserId` in `stripe.checkout.sessions.create()` — this is the thread that links payment to user
3. In the webhook Route Handler: extract `session.metadata.clerkUserId` from the `checkout.session.completed` event payload
4. Look up the user in Neon by `clerkUserId`, increment their credits atomically
5. `svix` is already in `package.json` for Clerk webhook signature verification — the Stripe webhook uses `stripe.webhooks.constructEvent()` instead (different signature algorithm, no svix involved)

### Neon + Drizzle Schema Additions

Two changes to the database are needed:

**1. Add to `src/db/schema/users.ts`:**

```typescript
// Existing columns remain; add:
credits: integer('credits').notNull().default(0),
stripeCustomerId: text('stripe_customer_id'),  // for future subscription linking
```

**2. New table `src/db/schema/credit-purchases.ts`:**

```typescript
import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

export const creditPurchases = pgTable(
  'credit_purchases',
  {
    id: text('id').primaryKey().$defaultFn(() => createPrefixedId('cp')),
    clerkUserId: text('clerk_user_id').notNull(),
    stripeSessionId: text('stripe_session_id').notNull().unique(), // idempotency key
    creditsAdded: integer('credits_added').notNull(),
    amountPaidCents: integer('amount_paid_cents').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clerkUserIdIdx: index('cp_clerk_user_id_idx').on(table.clerkUserId),
    stripeSessionIdIdx: index('cp_stripe_session_id_idx').on(table.stripeSessionId),
  })
);
```

The `stripeSessionId` unique constraint is the idempotency key — before crediting, check if a row exists for this session ID. Stripe retries failed webhooks; this prevents double-crediting.

### Paywall at Step 7

- Step navigation Server Action checks `user.credits > 0` (query `users` by `clerkUserId`) before allowing Step 7 unlock
- When Step 7 is first unlocked, decrement credits atomically: `UPDATE users SET credits = credits - 1 WHERE clerk_user_id = ? AND credits > 0` — the `AND credits > 0` prevents going negative under concurrent access
- If decrement affects 0 rows (credits were 0), return a paywall error to the client

---

## Checkout Flow (Redirect Mode)

```
User hits paywall modal
  → clicks "Buy credits"
  → Server Action: auth() → stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      metadata: { clerkUserId, creditsToAdd: '1' },
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
    })
  → returns session.url to client
  → router.push(session.url)  ← redirect to Stripe-hosted checkout

Stripe processes payment
  → POST /api/webhooks/stripe  (Route Handler)
      await request.text() → raw body
      stripe.webhooks.constructEvent(rawBody, sig, secret)
      if event.type === 'checkout.session.completed':
        check credit_purchases for stripeSessionId (idempotency)
        if not found: INSERT credit_purchase + UPDATE users SET credits = credits + creditsToAdd
  → returns 200 to Stripe

User lands on /dashboard?payment=success
  → success toast shown
  → dashboard re-fetches user credits
  → paywall modal gone
```

---

## Welcome Modal Flow

```
User signs up and arrives at /dashboard for first time
  → useEffect on mount: check localStorage.getItem('wp_onboarding_v1')
  → if null: show shadcn Dialog (welcome modal)
  → on modal close/dismiss: localStorage.setItem('wp_onboarding_v1', 'seen')
  → Dialog never shown again on this device
```

Key decision: localStorage, not database. Onboarding state is per-device UI state. Storing in DB adds latency to dashboard load and provides zero user value — users who clear localStorage see the welcome again, which is acceptable.

---

## Environment Variables (v1.8 Additions)

```bash
# .env.local additions
STRIPE_SECRET_KEY=sk_test_...           # Server-side only — never prefix with NEXT_PUBLIC_
STRIPE_WEBHOOK_SECRET=whsec_...         # From Stripe CLI (dev) or Dashboard webhook endpoint (prod)

# Stripe Price IDs — create Products + Prices in Stripe Dashboard
STRIPE_PRICE_SINGLE_FLIGHT=price_...   # $79 — 1 credit
STRIPE_PRICE_SERIAL=price_...          # $149 — 3 credits
```

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not needed for redirect mode. Omit it unless Embedded Checkout is adopted later.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `stripe@^20.4.0` | Node.js 18+, TypeScript 5 | TypeScript types built-in. No `@types/stripe`. Compatible with Next.js 16 serverless and edge runtimes. |
| `stripe@^20.4.0` | `@neondatabase/serverless@^1.0.2` | No conflict. Stripe SDK uses HTTP only; Neon serverless uses HTTP driver. No connection pooling interaction. |
| `stripe@^20.4.0` | `@clerk/nextjs@^6.37.3` | No conflict. Integration is metadata strings only — `clerkUserId` passed as Stripe session metadata. |
| `stripe@^20.4.0` | `drizzle-orm@^0.45.1` | No conflict. Stripe webhook handler updates Neon via Drizzle in a Route Handler. Standard async/await pattern. |

---

## Sources

- [stripe-node CHANGELOG](https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md) — v20.4.0 released 2026-02-25. HIGH confidence.
- [Stripe Checkout: how it works](https://docs.stripe.com/payments/checkout/how-checkout-works) — Redirect vs embedded mode. HIGH confidence.
- [Stripe Checkout Sessions quickstart](https://docs.stripe.com/payments/quickstart-checkout-sessions) — Session parameters and redirect pattern. HIGH confidence.
- [Stripe Metadata docs](https://docs.stripe.com/metadata) — `clerkUserId` in metadata available in webhook event. HIGH confidence.
- [Stripe Webhooks docs](https://docs.stripe.com/webhooks) — Raw body requirement, `checkout.session.completed` event. HIGH confidence.
- [redirectToCheckout removed 2025-09-30](https://docs.stripe.com/changelog/clover/2025-09-30/remove-redirect-to-checkout) — Confirmed deprecated and removed. HIGH confidence.
- [shadcn Tooltip docs](https://ui.shadcn.com/docs/components/tooltip) — TooltipProvider usage, already in project. HIGH confidence.
- [shadcn Dialog onboarding welcome block](https://www.shadcn.io/blocks/dialog-onboarding-welcome) — First-party onboarding dialog block. HIGH confidence.
- [App Router webhook raw body pattern](https://dev.to/thekarlesi/how-to-handle-stripe-and-paystack-webhooks-in-nextjs-the-app-router-way-5bgi) — `await request.text()` for raw body in Route Handler. MEDIUM confidence (community source, consistent with Stripe warning on body parsers).
- [Pre-paid credit billing with Stripe — Pedro Alonso](https://www.pedroalonso.net/blog/stripe-usage-credit-billing/) — Atomic decrement, idempotency, ledger schema. MEDIUM confidence (community, aligns with Stripe docs pattern).
- [Clerk + Stripe metadata integration](https://clerk.com/blog/exploring-clerk-metadata-stripe-webhooks) — Passing clerkUserId through Stripe session metadata. MEDIUM confidence (official Clerk blog).

---
*Stack research for: v1.8 Stripe Checkout + credit system + onboarding welcome modal*
*Researched: 2026-02-26*
*Previous: v1.3 EzyDraw + Visual Canvas (2026-02-12)*
