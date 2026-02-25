# Project Research Summary

**Project:** WorkshopPilot.ai v1.8 — Onboarding + Payments
**Domain:** SaaS monetization (Stripe Checkout redirect, credit-based purchasing, mid-workflow paywall) + first-run onboarding (welcome modal, contextual tooltip)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

WorkshopPilot.ai v1.8 introduces first-time revenue infrastructure: a taste-test paywall at Step 7, one-time credit purchases via Stripe Checkout redirect, and a lightweight first-run onboarding modal. The existing stack (Next.js 16.1.1, Clerk, Neon/Drizzle, shadcn/ui, Vercel) requires minimal new dependencies — only `stripe@^20.4.0` (server-only) needs to be installed. All onboarding UI components (shadcn Dialog and Tooltip) are already in the project. The key database additions are two new columns on `users` (`creditBalance`, `onboardingComplete`), one column on `workshops` (`creditConsumedAt`), and a new `credit_transactions` ledger table that serves as both the idempotency guard and audit trail. The layered architecture — schema first, then server logic, then UI — is non-negotiable: partial payment infrastructure creates financial and security exposure.

The recommended implementation uses Stripe Checkout redirect mode (not embedded or custom Elements), which requires zero client-side Stripe JS, keeps the checkout page on Stripe's servers, and automatically includes Apple Pay and Google Pay. Credit fulfillment uses a dual-trigger pattern: the `success_url` landing page immediately calls `stripe.checkout.sessions.retrieve(sessionId)` to sync credits synchronously (preventing the stale-credit UX failure), and the `checkout.session.completed` webhook provides the guaranteed delivery path. Both triggers call the same idempotent `fulfillCreditPurchase()` function, guarded by a `UNIQUE` constraint on `stripeSessionId` in the ledger table. The paywall check lives in the Step 7 Server Component (not middleware, not client-side state), and credit deduction is an atomic server action using `SELECT FOR UPDATE` row-level locking. Onboarding state lives in Neon (not localStorage or Clerk publicMetadata) to persist across devices and browsers without hydration mismatches.

The primary risks are financial and security-critical: webhook race conditions (user returns before webhook arrives), double credit fulfillment (Stripe at-least-once delivery guarantee), credit double-spend (concurrent unlock requests), and paywall bypass via client-side-only enforcement. All four have established prevention patterns that must be implemented in dependency order. The one notable technical gap is that the `neon-http` driver (used throughout the existing codebase) does not support `SELECT FOR UPDATE` interactive transactions — this requires either a secondary `neon-ws` client for transactional credit operations, or accepting the conditional-UPDATE atomic pattern as sufficient for v1.8 concurrency levels.

## Key Findings

### Recommended Stack

The existing stack handles v1.8 without architectural change. The only new production dependency is `stripe@^20.4.0` (server-only). No client-side Stripe packages are needed for redirect-mode Checkout — `@stripe/stripe-js` and `@stripe/react-stripe-js` add ~80KB to the bundle for zero benefit when Stripe hosts the checkout page. No tour libraries (Shepherd.js, react-joyride, Intro.js) should be installed — they add 30-100KB, have 60%+ skip rates in research, and the project already has shadcn Dialog and Tooltip installed. The Stripe CLI (`brew install stripe/stripe-cli/stripe`) is required for local webhook development.

**Core technologies:**
- `stripe@^20.4.0` (server-only): Checkout session creation, webhook signature verification — official SDK, built-in TypeScript types, compatible with Next.js serverless and edge runtimes; released 2026-02-25
- `shadcn Dialog` (already installed): Welcome modal — zero new dependency, olive-themed, official `dialog-onboarding-welcome` reference block available from shadcn
- `shadcn Tooltip` (already installed): Step 1 contextual tooltip — wraps Radix UI Floating UI; adding a second tooltip library creates duplicate provider trees
- Stripe CLI (dev tool): Local webhook forwarding (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)

**Critical version and environment requirements:**
- `stripe@^20.4.0` — current major, built-in TypeScript types, no separate `@types/stripe` needed
- `redirectToCheckout()` was removed from `@stripe/stripe-js` on 2025-09-30 — do not use
- `STRIPE_SECRET_KEY` must never be prefixed `NEXT_PUBLIC_` — server-side only
- Vercel Production environment must use `sk_live_` / `pk_live_` keys — not test keys copied from `.env.local`
- `/api/webhooks/stripe` must be in the public routes list in `src/proxy.ts` so Clerk middleware does not consume the raw request body

### Expected Features

The v1.8 scope covers three distinct feature areas. All P1 items must ship together — partial payment infrastructure (e.g., checkout without webhooks, or paywall without server-side enforcement) creates security and financial exposure.

**Must have (P1 — v1.8 launch):**
- Welcome modal on first visit (shadcn Dialog, `users.onboardingComplete` DB column, one-click dismiss, never shown again)
- One contextual tooltip on Step 1 chat panel (orientation to split-screen layout, shadcn Tooltip, fires once per user)
- Paywall gate at Step 7 — server-side credit check in Step Server Component and `advanceToNextStep` Server Action (never client-only)
- In-place paywall upgrade modal: outcome-focused headline ("Your Build Pack is 4 steps away"), progress context, feature list, pricing, CTA, "save and decide later" dismiss option
- DB schema: `users.creditBalance` + `users.onboardingComplete` columns, `workshops.creditConsumedAt` column, `credit_transactions` ledger table with `stripeSessionId UNIQUE` constraint
- Stripe Checkout session creation via Route Handler (`/api/billing/checkout`) returning `303` redirect
- Stripe webhook handler (`/api/webhooks/stripe`) with `await request.text()` raw body, signature verification, idempotent fulfillment
- Dual-trigger credit fulfillment: `/billing/success/page.tsx` syncs credits via Stripe API immediately; webhook provides guaranteed delivery
- Credit display badge on dashboard ("X credits remaining" or "No credits — get one")
- `?payment=success` redirect handling: toast notification + credit display refresh
- Pricing page updated (Single Flight $79 / 1 credit, Serial Entrepreneur $149 / 3 credits, Agency "Contact Sales")
- Locked step indicators (Steps 7-10 show lock badge in stepper when `creditBalance === 0`)

**Should have (P2 — post-P1 validation):**
- Auto-unlock into Step 7 after payment (1-second poll on success redirect, then navigate)
- Blurred Build Pack sneak peek in paywall modal (conversion lift, low implementation effort)
- Serial Entrepreneur 3-credit pack as second purchase option in modal and pricing page
- Stripe Customer Portal link from account settings (receipt access — one API call)

**Defer to MMP+:**
- Agency tier subscription billing (Stripe Billing, different integration from Checkout)
- A/B testing on paywall copy, pricing, and CTA text
- Admin credit gifting / manual allocation UI
- Email drip sequence for users who dismiss paywall without purchasing
- Usage analytics funnel (step-by-step conversion, paywall hit rate, purchase rate)

**Anti-features confirmed (do not build):**
- Multi-step guided tour (Shepherd.js / Intro.js / react-joyride) — 60%+ skip rate, 80KB+ bundle, brittle DOM selectors that break on UI changes
- Subscription billing for one-off users — target users run 1-3 workshops/year; monthly churn post-first-use approaches 100%
- Time-limited free trial — creates anxiety in a multi-hour workflow; step-based gate aligns with natural investment moment
- Client-side-only paywall enforcement — bypassable via DevTools, Zustand state manipulation, or direct URL navigation
- Free credits on sign-up — eliminates paywall intent; 6 free steps IS the free value

### Architecture Approach

The architecture extends the existing layered pattern (middleware → server components/actions → data layer) without introducing new patterns. The paywall check lives in the Step Server Component, not middleware (which cannot make async DB queries with workshop context and is vulnerable to CVE-2025-29927 middleware bypass). Credit consumption is an atomic server action. Onboarding state is stored in Neon (not localStorage or Clerk publicMetadata) because the `users` table is already queried on every dashboard load, onboarding is app-level data not auth-level data, and DB state persists across devices and browsers without hydration mismatch risk. The checkout flow uses a Route Handler (not a Server Action) returning a `303` redirect — Stripe docs explicitly recommend this for explicit control over the redirect response header.

**Major components:**

1. **`src/db/schema/`** (MODIFIED + NEW): Add `creditBalance int DEFAULT 0`, `onboardingComplete bool DEFAULT false` to `users`; add `creditConsumedAt timestamp nullable` to `workshops`; create `credit_transactions` ledger table with `stripeSessionId UNIQUE` constraint and `type` enum (`purchase | consumption`)
2. **`src/lib/billing/stripe.ts`** (NEW): Stripe SDK singleton — initialize once with `process.env.STRIPE_SECRET_KEY`, reuse across server actions and route handlers
3. **`src/app/api/billing/checkout/route.ts`** (NEW): Route Handler that creates Stripe Checkout session and returns `303` redirect to `session.url`; derives `creditQty` from `priceId` server-side via a lookup table — never trusts client-sent quantity
4. **`src/app/api/webhooks/stripe/route.ts`** (NEW): Stripe webhook handler; uses `await request.text()` (never `request.json()`); calls `fulfillCreditPurchase()` which inserts into `credit_transactions` with `onConflictDoNothing()` then updates `users.creditBalance`
5. **`src/app/billing/success/page.tsx`** (NEW): Dual-trigger fulfillment — calls `stripe.checkout.sessions.retrieve(sessionId)` immediately on load and runs `fulfillCreditPurchase()` synchronously so credits are visible before the webhook arrives
6. **`src/actions/billing-actions.ts`** (NEW): `consumeCredit()` (atomic deduction, `SELECT FOR UPDATE` or conditional UPDATE), `markOnboardingComplete()`, `createCheckoutSession()`
7. **`src/actions/workshop-actions.ts`** (MODIFIED): `advanceToNextStep()` calls `consumeCredit()` at Step 6→7 boundary; sets `workshop.creditConsumedAt` on success; returns `{ paywallRequired: true }` on failure
8. **`src/app/workshop/.../step/[stepId]/page.tsx`** (MODIFIED): Checks `workshop.creditConsumedAt != null` (skip balance check if set) or `users.creditBalance > 0` for steps 7-10; passes `paywallActive` prop to `StepContainer`
9. **`src/components/billing/upgrade-modal.tsx`** (NEW): In-place paywall modal shown when `paywallActive=true`; outcome headline, progress context ("6 of 10 steps complete"), feature list, pricing, primary CTA, "save and decide later" dismiss
10. **`src/components/onboarding/welcome-modal.tsx`** (NEW): Receives `showWelcomeModal` prop from dashboard server component; calls `markOnboardingComplete()` on dismiss; Step 1 tooltip wired separately
11. **`src/proxy.ts`** (MODIFIED): Add `/api/webhooks/stripe` to public routes

### Critical Pitfalls

1. **Webhook race condition — stale credits on success redirect** — User returns from Stripe before the `checkout.session.completed` webhook arrives (typically 1-5 second lag). Shows zero credits immediately after paying. Prevention: dual-trigger pattern — `success_url` landing page calls `stripe.checkout.sessions.retrieve(sessionId)` directly and fulfills credits synchronously. Both paths call the same idempotent `fulfillCreditPurchase()`.

2. **Double credit fulfillment — Stripe at-least-once delivery** — Stripe retries webhooks on non-2xx responses; same event may fire multiple times. Prevention: `credit_transactions.stripeSessionId UNIQUE` constraint + `INSERT ... onConflictDoNothing()` makes the insert idempotent. Balance update after a no-op insert is safe (adding 0 is a no-op if the unique insert was skipped).

3. **Credit double-spend — concurrent workshop unlock requests** — Two concurrent requests both read `creditBalance = 1`, both deduct 1, balance goes to -1. User bypasses paywall for free. Prevention: atomic `UPDATE users SET credit_balance = credit_balance - 1 WHERE credit_balance > 0` with `SELECT FOR UPDATE` row-level lock inside a Drizzle transaction. Requires `neon-ws` driver (not `neon-http`) for interactive transactions.

4. **Paywall bypass via client-side checks only** — User modifies Zustand state or navigates directly to `/workshop/[id]/step/7`. Prevention: server-side credit check in Step Server Component + all Step 7-10 Server Actions. CVE-2025-29927 allows Next.js middleware bypass via `x-middleware-subrequest` header — middleware alone is insufficient; server actions must enforce independently.

5. **Webhook signature verification broken by body parsing** — Using `await request.json()` before `stripe.webhooks.constructEvent()` destroys the raw body and breaks signature verification (consistent 400 errors). Prevention: always `await request.text()`; ensure `/api/webhooks/stripe` is in public routes so Clerk does not parse the body stream.

6. **Test mode keys in production** — `sk_test_...` in Vercel production causes credits to be granted for fake payments with no real revenue. Prevention: add startup assertion `if (NODE_ENV === 'production' && STRIPE_SECRET_KEY.startsWith('sk_test_')) throw new Error('FATAL: Test Stripe key in production')`. Verify before first real transaction.

7. **Onboarding state lost on browser data clear** — `localStorage`-only onboarding flag resets when user clears storage, switches devices, or uses incognito. Prevention: `users.onboardingComplete` column in Neon is the source of truth. Pass as server prop from dashboard Server Component — zero hydration mismatch. Do not use `localStorage` as the source of truth.

## Implications for Roadmap

The build order has strict dependency requirements. Schema must precede server logic, which must precede UI. The onboarding track is fully independent from the Stripe track after Phase 1 (schema) and can run in parallel. All P1 features must ship together before real transactions are enabled.

### Phase 1: Database Foundation
**Rationale:** Every subsequent phase depends on stable schema. No server action, UI component, or webhook handler can be built correctly without the underlying columns and tables. This phase has zero external dependencies and zero risk of rework if done first.
**Delivers:** Drizzle migrations for `users.creditBalance`, `users.onboardingComplete`, `workshops.creditConsumedAt`, and the `credit_transactions` ledger table with `stripeSessionId UNIQUE` constraint. Also adds `users.stripeCustomerId` for future portal access.
**Addresses:** Pitfalls 2 (idempotency via UNIQUE constraint established in schema), 3 (atomic deduction foundation), 7 (onboarding persistence), and Clerk-Stripe split brain prevention
**Avoids:** Building server logic against an unmigrated schema — the most common cause of rework in payment integrations

### Phase 2: Stripe Infrastructure Setup
**Rationale:** Environment variables, SDK singleton, and Stripe Dashboard configuration (Products, Prices) are prerequisites for all Route Handlers and Server Actions that call the Stripe API. Must happen before any code is written.
**Delivers:** `stripe@^20.4.0` installed, `src/lib/billing/stripe.ts` singleton, all `STRIPE_*` env vars in `.env.local` and Vercel dashboard, Stripe Products and Price IDs created and recorded in env vars, Stripe CLI configured for local webhook forwarding, startup key-mode assertion added.
**Addresses:** Pitfall 6 (test keys in production caught before first real transaction)
**Avoids:** Shipping payment code before environment is correctly configured

### Phase 3: Payment API Layer (Checkout + Webhook)
**Rationale:** The two server-side payment endpoints must exist before any UI can trigger purchases or receive fulfillment. Build and test these together — webhook without the checkout session creator (or vice versa) leaves the system unverifiable. This is the most security-critical phase.
**Delivers:** `/api/billing/checkout/route.ts` (Checkout session creation, server-side `priceId → creditQty` lookup, `303` redirect), `/api/webhooks/stripe/route.ts` (signature verification via `request.text()`, idempotent `fulfillCreditPurchase()`), `/billing/success/page.tsx` (dual-trigger sync — retrieves session from Stripe API on load), `/billing/cancel/page.tsx`.
**Uses:** `stripe@^20.4.0`, `credit_transactions` table (Phase 1), Stripe CLI for local testing
**Addresses:** Pitfalls 1 (dual-trigger prevents race condition), 2 (idempotent fulfillment via UNIQUE constraint), 5 (raw body signature verification), 6 (startup assertion)
**Research flag:** Standard Stripe patterns with official docs — skip `research-phase`

### Phase 4: Credit Actions and Server-Side Paywall Enforcement
**Rationale:** Server-side enforcement must be built before the paywall UI. Building UI first creates a window where the product looks gated but the server allows bypass. The `consumeCredit()` Server Action and modified `advanceToNextStep()` are the security primitives that all subsequent UI builds on.
**Delivers:** `src/actions/billing-actions.ts` (`consumeCredit` with atomic deduction, `markOnboardingComplete`, `getCredits`), modified `advanceToNextStep()` with Step 6→7 credit gate (returns `{ paywallRequired: true }` when credits are insufficient), `/api/credits` endpoint for client-side credit polling after payment.
**Addresses:** Pitfalls 3 (atomic credit deduction with row-level lock), 4 (server-side paywall enforcement independent of client state)
**Implementation note:** Resolve `neon-http` vs `neon-ws` driver decision before coding `consumeCredit()` — see Gaps section

### Phase 5: Paywall UI
**Rationale:** With server enforcement established (Phase 4), the UI layer is purely UX — not a security boundary. Build with confidence that the server will reject unauthorized requests regardless of client state.
**Delivers:** Modified `step/[stepId]/page.tsx` (credit check via `workshop.creditConsumedAt` and `users.creditBalance`, passes `paywallActive` prop), `upgrade-modal.tsx` (outcome headline, "6 of 10 steps complete" progress context, feature list, pricing, primary CTA, "save and decide later" dismiss), locked step indicators in stepper, `credit-badge.tsx` on dashboard header.
**Addresses:** UX pitfall — paywall must not be a surprise; locked step indicators and credit badge telegraph the gate before users reach Step 7
**Research flag:** Standard shadcn/ui component patterns — skip `research-phase`

### Phase 6: Onboarding UI (Independent Track)
**Rationale:** Fully independent from the Stripe track after Phase 1. Can run in parallel with Phases 3-5, or sequentially after Phase 5. Only prerequisite is the `users.onboardingComplete` DB column from Phase 1.
**Delivers:** `welcome-modal.tsx` (shadcn Dialog, outcome headline "Turn your idea into a Product Brief — in one session.", upfront paywall disclosure "Steps 1-6 free, Steps 7-10 + Build Pack require one workshop credit.", single CTA "Start My First Workshop"), modified `dashboard/page.tsx` (reads `onboardingComplete`, passes `showWelcomeModal` prop), `markOnboardingComplete()` wired to modal dismiss, Step 1 contextual tooltip on chat panel.
**Addresses:** Pitfalls 7 (DB-persisted onboarding state, not localStorage), 8 (SSR hydration mismatch prevention via server prop pattern — modal never rendered server-side)
**Research flag:** Standard shadcn/ui component patterns, official `dialog-onboarding-welcome` reference block — skip `research-phase`

### Phase 7: Pricing Page + Integration Test
**Rationale:** Static content updates and end-to-end validation. Pricing page can technically ship before Phase 3 (no payment infra required for content), but positioning here ensures it reflects the completed and tested credit system.
**Delivers:** Updated `/pricing/page.tsx` (Single Flight $79, Serial Entrepreneur $149, Agency "Contact Sales", "Buy Now" CTA links to `/api/billing/checkout`), `?payment=success` toast handling, end-to-end integration test: Steps 1-6 → paywall modal → Stripe Checkout → return → Step 7 unlocked → dashboard shows correct credit count.
**Research flag:** No research needed — static content and established patterns from Phases 3-5

### Phase 8: P2 Enhancements (Post-Launch Validation)
**Rationale:** Conversion-lift features that require the P1 payment flow to be live and producing real data before they are worth implementing. Auto-unlock timing in particular depends on actual Stripe webhook latency observed in production.
**Delivers:** Auto-unlock into Step 7 (1-second poll on success redirect, then navigate if credits > 0 and pending workshop exists), blurred Build Pack sneak peek in paywall modal, Serial Entrepreneur 3-credit pack as second purchase option, Stripe Customer Portal link from account settings.
**Research flag:** Auto-unlock poll timing — verify actual webhook latency in production before hardcoding the 1-second delay

### Phase Ordering Rationale

- **Schema first** is non-negotiable: idempotency constraints, atomic deduction logic, and onboarding persistence all depend on DB structure being stable before code is written against it
- **Payment API before paywall UI** prevents a window where the product looks gated but the server allows bypass — this is a critical security sequencing requirement, not an arbitrary ordering preference
- **Dual-trigger fulfillment built in Phase 3 as a single unit** ensures the system is never in a partially-working state (webhook-only leaves users seeing stale credits after payment; success-page-only is not guaranteed on network failures)
- **Onboarding independence** from Stripe allows Phase 6 to run concurrently with Phases 3-5 if team capacity allows — no shared dependencies after Phase 1
- **P2 enhancements deferred** until Phase 7 integration test confirms P1 is working correctly in production with real Stripe transactions

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 (Credit Actions):** The `neon-http` driver limitation with `SELECT FOR UPDATE` needs a confirmed resolution before writing `consumeCredit()`. Two options: (a) create a secondary `neon-ws` client specifically for transactional credit operations, or (b) use the conditional-UPDATE atomic pattern (`UPDATE users SET credit_balance = credit_balance - 1 WHERE credit_balance > 0 RETURNING`) without explicit row locking, accepting this is safe at v1.8 concurrency levels. Validate which approach is compatible with the existing Drizzle client configuration before coding begins.

Phases with standard patterns (skip `research-phase`):
- **Phase 3 (Payment API):** Stripe Checkout redirect, webhook handler, and idempotent fulfillment are thoroughly documented in official Stripe docs and confirmed by multiple corroborating community sources
- **Phase 5 (Paywall UI):** shadcn Dialog and Tooltip are already installed and themed; component patterns are first-party documented
- **Phase 6 (Onboarding UI):** shadcn `dialog-onboarding-welcome` is an official Shadcn reference block; DB-sourced server prop pattern is established in the existing codebase

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | `stripe@^20.4.0` confirmed from official changelog released 2026-02-25; shadcn component availability verified against existing project; no new dependencies beyond server-only Stripe SDK |
| Features | HIGH | Paywall UX patterns from Appcues, Monetizely, Foundational Edge, and Kinde; Stripe implementation patterns from official docs with corroborating community guides; credit system patterns from Pedro Alonso guide aligned with Stripe docs |
| Architecture | HIGH (Stripe/webhooks/credit schema); MEDIUM (Clerk metadata vs DB onboarding tradeoff) | Official Stripe docs and direct codebase inspection provide HIGH confidence. The onboarding storage decision (DB vs Clerk metadata) is well-reasoned; both approaches work but DB is more consistent with existing patterns |
| Pitfalls | HIGH | CVE-2025-29927 is a confirmed and documented CVE; dual-trigger race condition prevention is from official Stripe fulfillment docs; t3dotgg/stripe-recommendations provides practitioner-level validation; `SELECT FOR UPDATE` limitation confirmed in Drizzle ORM GitHub discussions |

**Overall confidence:** HIGH

### Gaps to Address

- **`neon-http` vs `neon-ws` for credit deduction transaction:** The existing codebase uses `neon-http` throughout. `SELECT FOR UPDATE` row locking requires WebSocket connections (`neon-ws`). Resolve during Phase 4 planning: either create a secondary `neon-ws` client used only for the `consumeCredit()` transaction, or accept the conditional-UPDATE pattern (`WHERE credit_balance > 0`) as sufficient for v1.8 concurrency levels (likely safe until hundreds of simultaneous users). Do not leave this decision to implementation time.

- **Vercel Deployment Protection on webhook route:** Vercel's Deployment Protection may block `/api/webhooks/stripe` in preview deployments, causing webhook failures during staging tests. Add the webhook path to the Deployment Protection bypass list before Phase 3 testing begins.

- **Stripe Customer pre-creation timing:** Research recommends creating the Stripe Customer at user signup (via Clerk `user.created` webhook). The existing `/api/webhooks/clerk/route.ts` handler would need extension. If this adds Phase 1 complexity, an acceptable v1.8 alternative is creating the customer lazily (first checkout) with `clerkUserId` as the idempotency key. Decide before Phase 2 begins.

- **`creditConsumedAt` race condition on parallel workshop starts:** If a user somehow starts two workshops simultaneously and advances both to Step 7 before either `creditConsumedAt` is set, the atomic credit check in Phase 4 must handle this. The `SELECT FOR UPDATE` lock on the `users` row protects the balance; `creditConsumedAt` is set per-workshop after deduction, so each workshop correctly consumes one credit. Validate this path in the Phase 7 integration test.

## Sources

### Primary (HIGH confidence)
- [Stripe Checkout: how it works](https://docs.stripe.com/payments/checkout/how-checkout-works) — redirect vs embedded mode, session creation parameters
- [Stripe Fulfill Orders](https://docs.stripe.com/checkout/fulfillment) — dual-trigger pattern, idempotency requirement (official)
- [Stripe Webhooks](https://docs.stripe.com/webhooks) — at-least-once delivery, retry behavior, raw body requirement
- [Stripe Webhook Signature Verification](https://docs.stripe.com/webhooks/signature) — `constructEvent()` raw body requirement
- [stripe-node CHANGELOG](https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md) — v20.4.0 released 2026-02-25
- [redirectToCheckout removal 2025-09-30](https://docs.stripe.com/changelog/clover/2025-09-30/remove-redirect-to-checkout) — confirmed removed from SDK
- [CVE-2025-29927](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) — Next.js middleware bypass via `x-middleware-subrequest` header
- [Clerk Add Onboarding Flow](https://clerk.com/docs/references/nextjs/add-onboarding-flow) — onboarding state patterns
- [Neon Serverless Driver](https://neon.com/docs/serverless/serverless-driver) — neon-http transaction limitations
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) — transaction patterns
- [shadcn dialog-onboarding-welcome block](https://www.shadcn.io/blocks/dialog-onboarding-welcome) — first-party onboarding dialog reference
- Existing codebase inspection: `src/proxy.ts`, `src/db/schema/users.ts`, `src/app/api/webhooks/clerk/route.ts`, `src/actions/workshop-actions.ts`, `src/app/workshop/[sessionId]/step/[stepId]/page.tsx`

### Secondary (MEDIUM confidence)
- [t3dotgg/stripe-recommendations](https://github.com/t3dotgg/stripe-recommendations) — split brain problem, pre-create customer, sync function pattern (practitioner-level guidance)
- [Pedro Alonso: Stripe + Next.js Complete Guide 2025](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) — implementation patterns, consistent with official docs
- [Pedro Alonso: Pre-paid Credit Billing with Stripe](https://www.pedroalonso.net/blog/stripe-usage-credit-billing/) — atomic decrement, idempotency, ledger schema
- [Clerk + Stripe Metadata blog](https://clerk.com/blog/exploring-clerk-metadata-stripe-webhooks) — passing clerkUserId through session metadata
- [Kinde: Freemium to Premium conversion](https://www.kinde.com/learn/billing/conversions/freemium-to-premium-converting-free-ai-tool-users-with-smart-billing-triggers/) — paywall trigger timing research
- [Appcues: Freemium upgrade prompts](https://www.appcues.com/blog/best-freemium-upgrade-prompts) — paywall copy patterns and conversion data
- [Monetizely: Strategic paywall timing](https://www.getmonetizely.com/articles/mastering-freemium-paywalls-strategic-timing-for-saas-success) — step-gate vs time-limit comparison
- [Drizzle ORM SELECT FOR UPDATE GitHub discussion](https://github.com/drizzle-team/drizzle-orm/discussions/1337) — row-level locking patterns
- [Stripe webhook race condition blog](https://excessivecoding.com/blog/billing-webhook-race-condition-solution-guide) — dual-trigger solution pattern
- [WorkshopPilot monetisation.md](/.planning/monetisation.md) — internal planning doc confirming credit model decision

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
