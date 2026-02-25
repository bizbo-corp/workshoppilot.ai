# Pitfalls Research: Stripe Checkout + Credit System + Paywall + Onboarding

**Domain:** Adding Stripe Checkout (redirect), credit-based purchasing, mid-workflow paywall, and first-run onboarding to existing Next.js 16.1.1 + Clerk + Neon + Drizzle app
**Researched:** 2026-02-26
**Confidence:** HIGH (Stripe official docs + t3dotgg recommendations + CVE disclosures + Drizzle ORM docs)

**Context:** WorkshopPilot.ai v1.8 adds: welcome modal onboarding, taste-test paywall at Step 7 (Steps 1-6 free), Stripe Checkout redirect for purchasing workshop credits, credit auto-unlock after purchase, and dashboard credit display. Existing stack: Clerk (auth), Neon Postgres (neon-http driver), Drizzle ORM, Zustand, Next.js App Router, Vercel deployment.

---

## Critical Pitfalls

### Pitfall 1: Webhook Race Condition — User Returns Before Webhook Arrives

**What goes wrong:**
User completes Stripe Checkout, gets redirected to the `success_url`, and immediately hits the paywall check — which reads from Neon and still shows zero credits because the `checkout.session.completed` webhook hasn't arrived yet (Stripe webhooks are async, typically 1-5 seconds behind the redirect). User sees "you have no credits" immediately after paying. They panic, click "buy again," and may get double-charged if idempotency isn't enforced.

**Why it happens:**
Developers treat the redirect to `success_url` as confirmation of payment. It is not. The `success_url` fires when Stripe redirects the browser — before Stripe has called your webhook endpoint and before your database has been updated. The payment confirmation lives in Stripe; your database is stale until the webhook updates it.

**How to avoid:**
Use a dual-trigger approach (per Stripe's official fulfillment docs):
1. On the `success_url` landing page, immediately call a server action that retrieves the session directly from Stripe API using the `session_id` query parameter (`stripe.checkout.sessions.retrieve(sessionId)`) and syncs credits to Neon synchronously.
2. The webhook also runs the same `fulfillCheckoutSession(session)` function as a safety net.
Both paths call one idempotent `fulfillCheckoutSession` function that checks if the session was already processed before crediting.

Pass `?session_id={CHECKOUT_SESSION_ID}` in the `success_url` so the landing page can retrieve session status immediately.

**Warning signs:**
- Users report "I paid but nothing happened" within minutes of launch
- Zero credits shown on dashboard right after successful Stripe redirect
- Support requests for duplicate charges

**Phase to address:** Stripe Checkout integration phase (webhook + success handler built together, not separately)

---

### Pitfall 2: Double Credit Fulfillment — Same Webhook Delivered Twice

**What goes wrong:**
Stripe guarantees at-least-once delivery, not exactly-once. Your webhook endpoint may receive the same `checkout.session.completed` event multiple times (network retry, Stripe's retry on non-2xx response, or duplicate delivery). Each call adds credits to the user's balance. A user who purchased 1 credit ends up with 2, 3, or more credits for free.

**Why it happens:**
Developers handle the webhook event and add credits in a single non-idempotent operation. They don't track which Stripe event IDs have already been processed. A 500 error on the first delivery causes Stripe to retry, and the second delivery fulfills again.

**How to avoid:**
Create a `stripe_webhook_events` table with `(event_id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ)`. At the start of every webhook handler: check if `event.id` exists in this table. If yes, return 200 immediately. If no, process the event and insert the `event_id` in the same database transaction as the credit addition. This makes fulfillment idempotent — identical to the dual-trigger approach: both the success-page sync and the webhook call `fulfillCheckoutSession(session)` which is guarded by the idempotency check on `session.id` (not `event.id`; use the session ID as the idempotency key since it's stable across both paths).

**Warning signs:**
- Credit balance higher than purchased
- Duplicate rows in a credits ledger table without the idempotency guard
- Stripe dashboard shows webhook retries for the same event ID

**Phase to address:** Stripe webhook handler phase — idempotency table must be created before any credits are granted

---

### Pitfall 3: Credit Double-Spend — Concurrent Workshop Unlock Requests

**What goes wrong:**
User has 1 credit remaining. They click "Unlock Step 7" twice in rapid succession (or have two browser tabs open). Both requests read the credit balance (1 credit), both see sufficient balance, both deduct 1 credit and unlock Step 7. The database ends up at -1 credits. User has bypassed the paywall for free on the second workshop.

**Why it happens:**
Serverless Vercel functions handle requests concurrently. If the credit check and deduction are two separate database operations (`SELECT` then `UPDATE`), there's a window between them where another request can read the same stale balance. This is a classic TOCTOU (time-of-check-to-time-of-use) race condition.

**How to avoid:**
Use a single atomic `UPDATE ... RETURNING` with a `WHERE credits_remaining > 0` constraint inside a Drizzle transaction with `SELECT FOR UPDATE` locking:

```typescript
// Correct: atomic check-and-deduct
const result = await db.transaction(async (tx) => {
  const [user] = await tx
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .for('update'); // SELECT FOR UPDATE — row-level lock

  if (!user || user.creditsRemaining < 1) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  const [updated] = await tx
    .update(users)
    .set({ creditsRemaining: user.creditsRemaining - 1 })
    .where(eq(users.clerkId, userId))
    .returning();

  return updated;
});
```

Never implement a `checkCredits()` function separate from `spendCredit()` — they must be one atomic transaction.

**Warning signs:**
- `creditsRemaining` column goes negative in production data
- Two workshops unlocked when user only had 1 credit
- Race condition only appears under load, not in local testing

**Phase to address:** Credit deduction logic phase — before the paywall gate is activated

---

### Pitfall 4: Paywall Bypass via Client-Side Checks Only

**What goes wrong:**
The Step 7 paywall check lives only in the React component or Zustand store — `if (user.credits > 0) { navigate to step 7 }`. A user opens browser DevTools, modifies Zustand state or disables the JavaScript that renders the paywall modal, and navigates directly to `/workshop/[id]/step/7`. The server happily serves Step 7 content without checking credits.

**Why it happens:**
Developers build the paywall as a UI concern — it "blocks" the UI from showing step content. The API routes and server actions that actually load step data and save AI responses don't verify credit status, because "the paywall modal would have stopped them."

**How to avoid:**
Paywall enforcement must live server-side. Specifically:
1. The server action or API route that advances to Step 7 (or saves AI responses for Steps 7-10) must call `verifyWorkshopAccess(workshopId, userId)` — a server-side function that queries Neon for the workshop's `unlockedAt` timestamp or the user's credit status.
2. Middleware protection is insufficient on its own due to CVE-2025-29927 (Next.js middleware bypass via `x-middleware-subrequest` header — patched in Next.js 15.2.3 but this project is on 16.1.1, verify patch status). Defense-in-depth: enforce at both middleware and server action levels.
3. The React component check is purely UX — it prevents the user from seeing the paywall repeatedly when already unlocked, it does not substitute for server-side enforcement.

**Warning signs:**
- Step 7 content loads when directly navigating to the URL without a credit
- Server actions for Steps 7-10 succeed for users with zero credits
- Workshop completion flow runs without credit verification

**Phase to address:** Server-side paywall enforcement phase — must be built before the UI paywall, not after

---

### Pitfall 5: Clerk userId → Stripe customerId Split Brain

**What goes wrong:**
The Stripe customer ID is not stored in Neon on signup. Instead, developers look up or create the Stripe customer at checkout time by searching Stripe for the user's email. This creates two problems: (a) if a user changes their email in Clerk, the lookup fails and a duplicate Stripe customer is created for the same Clerk user, and (b) there's no canonical single source of truth for the userId↔customerId mapping, leading to orphaned Stripe customers that never get credited.

**Why it happens:**
Stripe customer creation is deferred to "when the user needs to pay" rather than on user creation. The mapping is either stored only in Stripe metadata (fragile — Stripe is a billing system, not your database) or recreated ad-hoc each checkout.

**How to avoid:**
Create (or look up) the Stripe customer at user signup via Clerk's webhook (`user.created` event), store the resulting `stripe_customer_id` in a `users` table in Neon alongside `clerk_id`. Always create the Checkout Session using this stored `customer` ID — never create a customer during checkout. The `users` table becomes the canonical mapping:

```sql
users (
  id UUID PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  credits_remaining INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

On the Stripe customer object, always include `metadata: { clerkId: userId }` so you can recover the mapping from Stripe's side if Neon data is ever lost.

**Warning signs:**
- Multiple Stripe customers with the same email in the Stripe dashboard
- Webhook arrives with a `customer` ID not found in Neon
- User purchases credits but they're credited to a ghost customer record

**Phase to address:** Schema + Stripe customer provisioning phase — the very first phase of v1.8, before any checkout flow

---

### Pitfall 6: Webhook Signature Verification Broken by Body Parsing

**What goes wrong:**
The Stripe webhook handler returns `400 Webhook Error: No signatures found matching the expected signature for payload` in production even though the `STRIPE_WEBHOOK_SECRET` is correct. Every webhook is rejected, meaning credits are never granted to paying customers.

**Why it happens:**
In Next.js App Router, using `await request.json()` before passing the body to `stripe.webhooks.constructEvent()` breaks signature verification. `constructEvent()` requires the raw UTF-8 string body exactly as Stripe sent it. `request.json()` parses it into an object, destroying the raw string. The fix is `await request.text()` — but developers copy patterns from Pages Router docs that use `req.body` (already parsed by Next.js) or middleware that buffers differently.

**How to avoid:**
In the webhook route (`/api/webhooks/stripe/route.ts`):

```typescript
export async function POST(request: Request) {
  const body = await request.text(); // NOT request.json()
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }
  // ...
}
```

Also: ensure no middleware (including Clerk's `clerkMiddleware`) runs JSON body parsing before this route. The webhook endpoint should be excluded from Clerk auth middleware so Clerk doesn't consume the body stream.

**Warning signs:**
- Consistent 400 errors in Stripe webhook delivery logs
- Signature mismatch errors even with correct `STRIPE_WEBHOOK_SECRET`
- Works locally with Stripe CLI but fails in production

**Phase to address:** Stripe webhook handler phase — test with `stripe listen --forward-to localhost:3000/api/webhooks/stripe` before deploying

---

### Pitfall 7: Test Mode Keys Leaking into Production

**What goes wrong:**
Credits are granted to users after `checkout.session.completed` webhooks — but the Stripe dashboard shows no actual payments. Investigation reveals `STRIPE_SECRET_KEY=sk_test_...` is set in the Vercel production environment variables (copy-pasted from `.env.local` during setup). Users are "purchasing" with test card numbers in production because the publishable key is also a test key. Real money never changes hands.

**Why it happens:**
Developers configure Stripe in development with test keys, then copy the same `.env.local` values to Vercel without switching to live keys. The UI shows a Stripe Checkout page (it looks real) but processes test payments silently.

**How to avoid:**
Maintain a strict naming convention in Vercel environment variables with environment-scoped values:
- **Development:** `sk_test_...` / `pk_test_...`
- **Production:** `sk_live_...` / `pk_live_...`

Use separate webhook endpoints in Stripe dashboard: one for test mode (development) pointing at `localhost` via Stripe CLI, one for live mode pointing at the production URL. Add a startup assertion in the webhook handler:

```typescript
if (process.env.NODE_ENV === 'production' && process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  throw new Error('FATAL: Test Stripe key in production environment');
}
```

**Warning signs:**
- Stripe dashboard shows no revenue despite "successful" checkouts
- Test card numbers (4242 4242...) accepted in production
- `checkout.session.completed` events in Stripe test mode dashboard

**Phase to address:** Stripe environment setup phase (day zero) — before any code

---

### Pitfall 8: Onboarding State Lost on Browser Data Clear

**What goes wrong:**
The `hasSeenOnboarding` flag is stored in `localStorage`. User completes onboarding, dismisses the welcome modal, uses the app for a week. Then they clear browser history/cache, switch devices, or open an incognito tab. The welcome modal reappears. Repeat users are re-onboarded every time they switch browsers or clear storage. Worse: if a user dismisses the modal mid-tutorial and returns from a different device, they see the tour from the beginning with no memory of their prior session.

**Why it happens:**
`localStorage` is the path of least resistance for "has seen" flags. It works in development where the developer uses the same browser. It breaks silently in production across any storage boundary: device switch, incognito, browser data clear, cookie blocking.

**How to avoid:**
Store onboarding state in Neon on the `users` table, not localStorage. Add a single boolean column `onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE` (and optionally `onboarding_completed_at TIMESTAMPTZ`). Update it via a server action on modal dismiss. Read it server-side when rendering the dashboard — since the dashboard is behind Clerk auth and the user row is loaded on every dashboard request, this adds zero additional queries.

Use localStorage only as a hydration hint to prevent flash: read `localStorage.getItem('onboarding_done')` client-side to suppress the modal before the server-confirmed state loads. Never use it as the source of truth.

**Warning signs:**
- "I keep seeing the tutorial" in user feedback
- Onboarding analytics show inflated completion rates (users dismissing repeatedly)
- Reported in incognito mode during testing

**Phase to address:** Onboarding schema phase — add `onboarding_completed` column before building the modal component

---

### Pitfall 9: SSR Hydration Mismatch from Onboarding Modal

**What goes wrong:**
The welcome modal reads `localStorage` to determine whether to render. The server renders the page without the modal (server has no localStorage). The client hydrates and shows the modal (localStorage says first visit). React throws a hydration mismatch error in development and silently diverges in production — the modal may flash in and out, or behave inconsistently.

**Why it happens:**
Any `localStorage` read inside a component body (not inside `useEffect`) causes the server render to produce different HTML from the client hydration pass. Next.js App Router renders server components on the server — they can never access `window.localStorage`.

**How to avoid:**
Gate the modal render inside `useEffect` with a mounted flag:

```typescript
const [mounted, setMounted] = useState(false);
const [showModal, setShowModal] = useState(false);

useEffect(() => {
  setMounted(true);
  // DB-sourced truth: passed as server prop
  if (!hasCompletedOnboarding) {
    setShowModal(true);
  }
}, [hasCompletedOnboarding]);

if (!mounted) return null; // suppress modal during SSR
```

Better: pass `hasCompletedOnboarding` as a server prop from the dashboard server component (queried from Neon), then the client component renders deterministically. The modal is always hidden on server render (SSR outputs no modal HTML), and the client shows it based on the server-provided prop. Zero hydration mismatch.

**Warning signs:**
- `Error: Hydration failed because the initial UI does not match` in the console
- Modal flashes briefly on every page load before hiding
- `suppressHydrationWarning` appearing in code reviews (escape hatch being used as a crutch)

**Phase to address:** Onboarding modal implementation phase — design the data flow (server prop, not localStorage) before writing the component

---

### Pitfall 10: Abandoned Checkout Sessions — User Never Returns

**What goes wrong:**
User opens Stripe Checkout (redirected away from the app) but closes the browser tab, gets distracted, or hits Back. A Checkout Session was created but never completed. The user later tries to click "Upgrade" again — your code creates a *new* Checkout Session. Over time, the Stripe dashboard fills with abandoned sessions and the user potentially has confusion around multiple pending "transactions." More critically: if your `success_url` relies on the `session_id` parameter to sync credits, a user who bookmarks the success URL and visits it again triggers a second sync attempt — caught only if idempotency is in place.

**Why it happens:**
Checkout Sessions are fire-and-forget: create → redirect → wait. There's no app-side state tracking the pending session. Developers don't implement the `checkout.session.expired` webhook, so abandoned sessions are invisible.

**How to avoid:**
Store the pending `checkout_session_id` in the `users` table (nullable). Before creating a new Checkout Session, check if a non-expired session exists for this user and redirect to it via `session.url` (Stripe sessions are reusable until expired). Handle `checkout.session.expired` to clear the pending session ID from Neon. Stripe sessions expire after 24 hours by default (configurable to 30 min minimum).

For the `success_url` bookmark problem: idempotency on `fulfillCheckoutSession` (see Pitfall 2) handles this automatically — the second sync attempt sees the session already processed and returns without crediting again.

**Warning signs:**
- High session creation count vs. low completion count in Stripe dashboard
- Multiple pending `checkout_session_id` rows for the same user
- Users complaining that clicking "Upgrade" starts a new checkout every time

**Phase to address:** Stripe Checkout creation phase — implement session reuse before launch

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store credits in Clerk `publicMetadata` instead of Neon | No schema change needed | Credits aren't auditable, no transaction history, Clerk API becomes billing dependency, hard to query across users | Never — Clerk metadata is for auth attributes, not financial state |
| Client-side credit check in Zustand only | Faster paywall UI | Bypassable, stale on concurrent sessions, doesn't survive page refresh | Never for enforcement — client check is UX only |
| Single webhook event type (`checkout.session.completed` only) | Simpler handler | Misses async payment methods; missed payment_intent.succeeded events for retry scenarios | Acceptable for MVP if only card payments are enabled |
| localStorage for onboarding state | Zero backend work | Resets on browser clear, device switch, incognito — users see tutorial repeatedly | Acceptable as hydration hint only, never as source of truth |
| Create Stripe customer during checkout | No extra signup step | Race conditions if user checks out twice simultaneously; no stable customerId before payment | Never — create customer at user signup |
| Check webhook signature in development only | Faster local dev | Signature check bypass pattern creeps into production code | Never — verify in all environments; use Stripe CLI for local testing |
| Use `client_reference_id` instead of `customer` for user mapping | Simpler if customer not pre-created | `client_reference_id` is untyped string, not validated by Stripe, easier to fake or mismatch | Only as secondary reference alongside a real `customer` object |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Checkout | Using `payment_intent.succeeded` for fulfillment | Use `checkout.session.completed` for Checkout-initiated flows; `payment_intent.succeeded` is for PaymentIntents API, not Checkout |
| Stripe webhooks | `await request.json()` before `constructEvent()` | `await request.text()` — raw body required for HMAC signature verification |
| Stripe webhooks | Same handler URL for test and live webhooks | Separate webhook endpoints in Stripe dashboard (or at minimum separate secrets via env var scoping) |
| Clerk + Stripe | Storing `stripeCustomerId` in Clerk `publicMetadata` | Store in Neon `users` table — Clerk metadata is slow to update, not queryable server-side without API call, wrong domain |
| Neon + Drizzle | Using `neon-http` driver with long-running transactions | `neon-http` is request/response — each query is a separate HTTP call. Use `neon-ws` (WebSocket) driver for transactions requiring `SELECT FOR UPDATE` |
| Next.js middleware | Relying solely on middleware for paywall enforcement | CVE-2025-29927 allows middleware bypass via `x-middleware-subrequest` header; enforce at server action level too |
| Stripe Checkout | Creating session without pre-existing Stripe customer | Customer ID must exist before session creation; create on signup or first checkout with idempotency |
| Vercel env vars | Copying `.env.local` test keys to Vercel production | Set live keys explicitly in Vercel dashboard for Production environment; test keys for Preview/Development |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching Stripe customer status on every page load | Slow dashboard, Stripe rate limit errors (100 req/s) | Cache in Neon; only fetch from Stripe on webhook events and explicit sync triggers | ~500 daily active users hitting dashboard |
| Blocking webhook handler on slow DB operations | Stripe retries after 30s timeout, duplicate deliveries | Return 200 immediately after idempotency check; run heavy DB work after response via `waitUntil()` or background job | Any webhook with slow Neon cold start |
| Full workshop credit check on every step render | N+1 queries as users navigate between steps | Load credit/unlock status once at workshop entry, store in Zustand, re-validate only on paywall hit | 10+ concurrent users |
| Querying `stripe_webhook_events` without index | Slow idempotency check as events accumulate | Index `event_id` (or make it PRIMARY KEY); add TTL cleanup after 30 days | ~100k processed events |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting `metadata.userId` from Stripe webhook without re-verifying against Clerk session | Attacker crafts fake webhook with different userId to steal credits | Always verify webhook signature first (`constructEvent`), then the userId in metadata must match an existing Neon user row — not just "any string" |
| Exposing `STRIPE_SECRET_KEY` client-side | Full Stripe account compromise | Never prefix with `NEXT_PUBLIC_`; only publishable key (`pk_`) goes client-side |
| No rate limiting on "create checkout session" endpoint | Stripe session spam, cost amplification | Rate limit with Upstash or Vercel's edge rate limiting; max 1 active session per user |
| Paywall check only in middleware | CVE-2025-29927 allows `x-middleware-subrequest` header to bypass Next.js middleware entirely | Server actions and API routes must independently verify workshop unlock status from Neon |
| Storing `credits_remaining` only in Clerk metadata (client-readable) | User modifies local token cache or Clerk JWT to show higher credit count | Credit truth lives in Neon only; Clerk metadata is a convenience display cache, never authoritative |
| No CSRF protection on credit spend endpoint | Cross-site request tricks user into burning credits | Next.js Server Actions have built-in CSRF protection via origin header check — use Server Actions, not plain API routes, for credit spend |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Success page shows "pending" while webhook processes | User thinks payment failed, contacts support or repurchases | Immediately sync on `success_url` load (Pitfall 1); show "almost there" spinner for max 3 seconds, then confirm |
| No email receipt / confirmation after credit purchase | Users unsure if payment went through, chargeback risk | Stripe automatically sends email receipts if customer email is set on the Checkout Session — always set `customer_email` or use pre-created customer |
| Welcome modal appears on every workshop entry, not just first visit | Experienced users rage-click through tutorial every session | `onboarding_completed` column in DB; never show modal again after first dismissal |
| Paywall hits mid-AI-conversation with no warning | User is 6 steps invested, discovers paywall at Step 7 during AI response | Show taste-test status (e.g., "3 free steps remaining") in header early; surface paywall prompt before the step loads, not mid-conversation |
| Credit count not visible until paywall hit | Users surprised by paywall existence | Dashboard header shows "X credits" (or "Upgrade" if zero) at all times for authenticated users |
| "Buy more credits" CTA takes user away mid-workshop | User loses workshop context on return | Inline upgrade modal (not redirect) — open Stripe Checkout in new tab or popup; on return, poll for credit update and auto-continue |
| No refund/cancellation messaging | Users feel locked in, chargeback spikes | Include "contact support for refunds" link in purchase confirmation email and on dashboard |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Stripe webhook handler:** Often missing signature verification — verify `constructEvent()` is called with `request.text()` (not `request.json()`), `stripe-signature` header, and `STRIPE_WEBHOOK_SECRET`
- [ ] **Credit deduction:** Often missing `SELECT FOR UPDATE` transaction — verify concurrent requests can't both deduct from the same balance simultaneously
- [ ] **Webhook idempotency:** Often missing duplicate delivery guard — verify `stripe_webhook_events` table (or equivalent) prevents double-credit on Stripe retry
- [ ] **Paywall enforcement:** Often missing server-side check — verify that server actions for Steps 7-10 reject requests from users whose workshop is not unlocked, regardless of client state
- [ ] **Onboarding persistence:** Often missing DB column — verify `onboarding_completed` is in Neon and the welcome modal reads from it, not localStorage
- [ ] **Stripe customer pre-creation:** Often missing on signup — verify `users.stripe_customer_id` is populated before any checkout attempt, not during it
- [ ] **Live vs test keys:** Often wrong environment — verify Vercel Production environment uses `sk_live_` and `pk_live_` keys, and the Stripe webhook is registered in live mode
- [ ] **Success-page sync:** Often missing — verify the `success_url` handler calls Stripe API to retrieve session status rather than just displaying "thank you"
- [ ] **Checkout session reuse:** Often missing — verify a pending session is reused if user clicks "Upgrade" again before the previous session expires
- [ ] **Credit display:** Often missing — verify dashboard shows credit count server-side (from Neon), not from Clerk metadata or client-side Zustand only

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double-credited users (duplicate webhooks) | MEDIUM | Query `stripe_webhook_events` to find duplicates; audit user credit balances against Stripe payment records; manually deduct excess credits via admin script; add idempotency table retroactively |
| User paid but got no credits (webhook failure) | MEDIUM | Pull `checkout.session.completed` events from Stripe dashboard; manually replay via admin endpoint that calls `fulfillCheckoutSession(sessionId)`; send apology email |
| Negative credit balance (concurrent spend) | LOW | Clamp to 0 in application layer; add `CHECK (credits_remaining >= 0)` constraint to prevent future negatives; audit affected workshops for unauthorized access |
| Test payments processed in production | HIGH | Stripe test payments have no financial impact but appear as real sessions in your DB; identify by `livemode: false` on Stripe event; delete test user records; rotate to live keys; inform any affected "users" (likely internal testers only) |
| Onboarding shown repeatedly | LOW | Add `onboarding_completed` column, backfill to TRUE for all existing users (they've already used the app), deploy |
| Paywall bypass (client-side only) | HIGH | Immediately add server-side check to all Step 7-10 server actions; audit DB for workshops at step 7+ with zero credits (indicates bypass); revoke access to unauthorized workshops; no refunds needed (no money was lost, just free access) |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Webhook race condition (stale credits on redirect) | Stripe Checkout + webhook handler phase | Test: complete checkout, check dashboard within 1 second of redirect — credits visible |
| Double credit fulfillment | Stripe webhook handler phase | Test: replay same `checkout.session.completed` event twice — credit count unchanged after second replay |
| Credit double-spend | Credit deduction logic phase | Test: fire two concurrent unlock requests with 1 credit — only one succeeds, balance = 0 not -1 |
| Paywall bypass (client-side only) | Server-side paywall enforcement phase | Test: `curl` Step 7 server action endpoint with no workshop unlock — returns 403 |
| Clerk-Stripe split brain | Schema + user provisioning phase (first phase) | Verify: `users` table has `stripe_customer_id` populated for all new signups before checkout |
| Webhook signature failure | Stripe webhook handler phase | Test: send request to webhook endpoint without valid signature — returns 400; with valid — returns 200 |
| Test keys in production | Stripe environment setup (day zero) | Verify: Vercel Production env vars contain `sk_live_` not `sk_test_` before any real user payment |
| Onboarding reappearing | Onboarding schema + modal phase | Test: dismiss modal, clear localStorage, reload — modal does not reappear |
| SSR hydration mismatch | Onboarding modal implementation phase | Verify: no hydration warnings in console; modal renders consistently across SSR and client |
| Abandoned checkout sessions | Stripe Checkout creation phase | Test: create session, abandon it, click Upgrade again — existing session is reused (or new created after expiry) |

---

## Sources

- [Stripe Fulfill Orders (official) — dual-trigger pattern, idempotency requirement](https://docs.stripe.com/checkout/fulfillment)
- [Stripe Webhooks — at-least-once delivery guarantee, retry behavior](https://docs.stripe.com/webhooks)
- [Stripe Checkout Session Expire — abandoned session handling](https://docs.stripe.com/api/checkout/sessions/expire)
- [t3dotgg/stripe-recommendations — split brain problem, sync function pattern, pre-create customer](https://github.com/t3dotgg/stripe-recommendations)
- [CVE-2025-29927 — Next.js middleware bypass via x-middleware-subrequest header](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [Stripe webhook race condition solution — billing webhook race condition blog](https://excessivecoding.com/blog/billing-webhook-race-condition-solution-guide)
- [Drizzle ORM SELECT FOR UPDATE — row-level locking for credit atomicity](https://github.com/drizzle-team/drizzle-orm/discussions/1337)
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions)
- [Next.js App Router Stripe Webhook Signature Verification — request.text() pattern](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f)
- [Clerk + Stripe Metadata — exploring metadata with webhooks](https://clerk.com/blog/exploring-clerk-metadata-stripe-webhooks)
- [OnboardJS + Supabase — database-persisted onboarding state](https://onboardjs.com/blog/supabase-onboarding-persistence-onboardjs)
- [Next.js Hydration Error — SSR/client mismatch with localStorage](https://nextjs.org/docs/messages/react-hydration-error)
- [Stripe Test Mode vs Live Mode — environment key confusion](https://www.quantledger.app/blog/stripe-test-mode-vs-live-mode-analytics)

---
*Pitfalls research for: Stripe Checkout + credit system + paywall + onboarding (v1.8)*
*Researched: 2026-02-26*
