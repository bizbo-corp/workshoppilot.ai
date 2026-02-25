# Phase 48: Stripe Infrastructure - Research

**Researched:** 2026-02-26
**Domain:** Stripe SDK installation, singleton initialization, environment configuration, Stripe Dashboard product/price setup, Stripe CLI local webhook testing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-01 | User can purchase a Single Flight workshop credit ($79) via Stripe Checkout | Requires: stripe singleton with secret key, `STRIPE_PRICE_SINGLE_FLIGHT` env var pointing to a Stripe Price ID, Stripe Checkout Session creation with that price ID |
| BILL-02 | User can purchase a Serial Entrepreneur pack (3 credits, $149) via Stripe Checkout | Requires: stripe singleton, `STRIPE_PRICE_SERIAL_ENTREPRENEUR` env var pointing to a Stripe Price ID, Checkout Session creation with that price ID |
</phase_requirements>

---

## Summary

Phase 48 establishes the Stripe infrastructure layer that all subsequent payment phases (49-51) depend on. It has no user-visible features — its deliverables are: the `stripe` npm package installed, a `src/lib/billing/stripe.ts` server-only singleton, five environment variables configured in `.env.local` and Vercel, two Products/Prices created in the Stripe Dashboard, and the Stripe CLI wired for local webhook forwarding.

The Stripe Node.js SDK (stripe@20.4.0, pinned API version `2026-02-25.clover`) is installed as a server-only dependency. Because this project uses Stripe Checkout redirect mode — not Elements/embedded — the `@stripe/stripe-js` and `@stripe/react-stripe-js` client-side packages are **not needed**. The redirect flow creates a Checkout Session server-side and returns a URL; no Stripe JavaScript runs in the browser.

The singleton follows the same startup-assertion pattern used by `src/db/client.ts`: throw at module initialization if required env vars are absent. An additional production-safety assertion throws if `STRIPE_SECRET_KEY` is a test key (`sk_test_`) while `VERCEL_ENV === 'production'`. Products are created once in the Stripe Dashboard (or via CLI) and their Price IDs stored in environment variables — this is the established pattern for fixed-price checkout without hardcoding IDs.

**Primary recommendation:** Install `stripe@^20.4.0` server-only, create `src/lib/billing/stripe.ts` with `import 'server-only'` + startup assertions, manually create two Products in the Stripe Dashboard test mode, record the Price IDs as `STRIPE_PRICE_SINGLE_FLIGHT` and `STRIPE_PRICE_SERIAL_ENTREPRENEUR`, and wire the Stripe CLI with `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.4.0 | Official Stripe Node.js SDK — server-side API calls, webhook verification | Only official Stripe server SDK; pinned to API version `2026-02-25.clover`; no alternative |
| server-only | (included in Next.js) | Prevents accidental client-side import of Stripe singleton | Next.js built-in guard; causes a build error if file is imported in a Client Component |

### Packages NOT Needed for This Phase

| Package | Why Excluded |
|---------|-------------|
| @stripe/stripe-js | Client-side Stripe.js loader — only needed for Elements/embedded forms. Redirect mode requires zero client-side Stripe JS. |
| @stripe/react-stripe-js | React wrapper for Stripe Elements — not needed for redirect Checkout. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `import 'server-only'` guard | Directory naming conventions | `server-only` causes a build error — hard enforcement. Naming conventions are soft and can be bypassed. |
| Dashboard-created prices stored in env vars | Hardcoded Price IDs in code | Env vars allow test→prod switching without code change. Hardcoding forces code changes per environment. |
| Stripe Checkout redirect | Stripe Elements / embedded | Redirect: zero PCI surface, Stripe hosts the form, supports Apple/Google Pay automatically. Elements: more control but requires PCI SAQ A-EP, more code. Decision locked in STATE.md. |

**Installation:**
```bash
npm install stripe@^20.4.0
```

No `--save-dev` — stripe is a runtime server dependency, not a dev tool.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── billing/
│       └── stripe.ts        # Server-only singleton — the ONLY export in this phase
├── app/
│   └── api/
│       └── webhooks/
│           └── stripe/
│               └── route.ts # Created in Phase 49, but the directory should be noted
scripts/
└── verify-env.ts            # Must be updated to include Stripe env vars
```

### Pattern 1: Server-Only Stripe Singleton

**What:** A single Stripe instance initialized at module load time, guarded by `import 'server-only'`, with startup assertions for required env vars and a production/test-key mismatch check.

**When to use:** Import `stripe` from `@/lib/billing/stripe` in any Server Component, Route Handler, or Server Action that calls the Stripe API. Never import it in Client Components.

**Example:**
```typescript
// src/lib/billing/stripe.ts
// Source: https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/
// Adapted to match project patterns from src/db/client.ts
import 'server-only';
import Stripe from 'stripe';

// Fail fast: throw at module initialization if key is missing (same pattern as db/client.ts)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY environment variable is not set. Configure your Stripe API key.'
  );
}

// Production safety: prevent test keys from reaching production
if (
  process.env.VERCEL_ENV === 'production' &&
  process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')
) {
  throw new Error(
    'STRIPE_SECRET_KEY is a test key (sk_test_*) but VERCEL_ENV is production. Use production Stripe keys.'
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover', // Pinned to stripe@20.4.0 default
  typescript: true,
});
```

**Key design choices:**
- `apiVersion: '2026-02-25.clover'` — This is the default for stripe@20.4.0. Pinning explicitly makes upgrades intentional and prevents silent API changes.
- `typescript: true` — Enables full TypeScript type inference on API responses.
- No global singleton `let stripe: Stripe` pattern needed — Next.js module system caches the module, making the exported const naturally singleton per process.

### Pattern 2: Environment Variable Naming

```
# Server-only (no NEXT_PUBLIC_ prefix — must NOT be exposed to browser)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SINGLE_FLIGHT=price_...
STRIPE_PRICE_SERIAL_ENTREPRENEUR=price_...

# Client-accessible (NEXT_PUBLIC_ prefix — safe to expose)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Note: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is configured in this phase even though the client won't use it in Phase 48. It will be needed if any future phase adds client-side price display or Elements integration.

### Pattern 3: Stripe Dashboard Product/Price Creation

Products are created manually in the Stripe Dashboard (test mode). The resulting Price IDs are stored as env vars. This is the standard pattern for fixed-price checkout.

**Steps:**
1. Navigate to Stripe Dashboard → Products → Add product
2. Product: "Single Flight Workshop" → Pricing: One time → $79.00 USD → Add product
3. Copy the Price ID (format: `price_1...`) → set as `STRIPE_PRICE_SINGLE_FLIGHT`
4. Product: "Serial Entrepreneur Pack" → Pricing: One time → $149.00 USD → Add product
5. Copy the Price ID → set as `STRIPE_PRICE_SERIAL_ENTREPRENEUR`

**Naming convention for Stripe Products:**
- Single Flight: `$79` / 1 credit — description: "1 workshop credit. Unlock Steps 7–10 for one Build Pack."
- Serial Entrepreneur: `$149` / 3 credits — description: "3 workshop credits. Run up to three Build Pack workshops."

These names appear in Stripe Dashboard, receipts, and the Stripe Checkout page.

### Pattern 4: Stripe CLI Local Webhook Forwarding

```bash
# Install (macOS)
brew install stripe/stripe-cli/stripe

# Authenticate (opens browser, links to your Stripe account)
stripe login

# Start forwarding (run this alongside `npm run dev`)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a webhook signing secret (`whsec_...`) at startup — this becomes `STRIPE_WEBHOOK_SECRET` in `.env.local` for local development. This is a **different** value from the Dashboard-configured webhook secret; the CLI secret is ephemeral and changes each `stripe login` session.

```bash
# Trigger a test event manually
stripe trigger checkout.session.completed
```

### Anti-Patterns to Avoid

- **Importing `stripe` in a Client Component:** The `import 'server-only'` guard turns this into a build error, but be aware. STRIPE_SECRET_KEY must never reach the browser.
- **Not pinning `apiVersion`:** Leaving apiVersion unpinned means a stripe package upgrade could silently change the API contract. Always pin.
- **Using Dashboard webhook secret for local testing:** The Dashboard webhook secret only works for events Stripe sends to the configured HTTPS endpoint. Local testing requires the CLI-generated `whsec_` secret.
- **Creating multiple Stripe instances per request:** The module-level export is naturally singleton; don't instantiate `new Stripe(...)` inside route handlers or Server Actions.
- **Storing Price IDs in code constants instead of env vars:** This forces a code change to switch environments. Env vars allow test/prod Price IDs to differ without touching code.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC verification | `stripe.webhooks.constructEvent(body, sig, secret)` | Timing-safe comparison, tolerance window, multiple signature schemes — easy to get wrong |
| Checkout Session creation | Custom payment form | `stripe.checkout.sessions.create(...)` | PCI compliance, Apple/Google Pay, 3DS, fraud detection — impossible to replicate |
| Production key guard | Custom env validation | `STRIPE_SECRET_KEY.startsWith('sk_test_')` assertion at startup | Same pattern as Clerk key guard in `scripts/verify-env.ts` |

**Key insight:** Stripe's SDK handles all cryptographic operations, rate limiting, and API versioning. The only custom code in this phase is the singleton wrapper with safety assertions.

---

## Common Pitfalls

### Pitfall 1: Webhook Secret Mismatch (Local vs Production)

**What goes wrong:** Developer uses the Stripe Dashboard webhook secret in `.env.local` instead of the CLI-generated one. Every local webhook verification fails with `SignatureVerificationError`.

**Why it happens:** There are two different webhook secrets: (1) the Dashboard-configured endpoint secret for production/preview, and (2) the CLI-generated `whsec_...` that the `stripe listen` command prints at startup.

**How to avoid:** Use the CLI-printed `whsec_...` value for `STRIPE_WEBHOOK_SECRET` in `.env.local`. Use the Dashboard endpoint secret for the Vercel production environment variable. Document this distinction in a comment in the webhook route.

**Warning signs:** `Error: No signatures found matching the expected signature for payload.` in local logs while `stripe listen` is running.

### Pitfall 2: Raw Body Required for Webhook Verification

**What goes wrong:** Webhook signature verification fails because `req.json()` or body parsing middleware consumed the raw bytes before `constructEvent`.

**Why it happens:** Stripe's HMAC signature is computed over the raw request bytes. Any transformation (JSON parsing, decoding, re-encoding) changes the bytes and breaks signature verification.

**How to avoid:** Use `await req.text()` (not `req.json()`) in the webhook route handler — identical to the pattern used in the existing Clerk webhook at `src/app/api/webhooks/clerk/route.ts`.

**Warning signs:** `Webhook signature verification failed` even when the secret is correct.

### Pitfall 3: Vercel Deployment Protection Blocks Preview Webhooks

**What goes wrong:** Stripe cannot deliver webhooks to preview deployments because Vercel's Deployment Protection returns 401.

**Why it happens:** Vercel Pro/Team plans enable Deployment Protection by default on preview environments. Stripe webhook delivery doesn't know to include a bypass header.

**How to avoid:** In Vercel Dashboard → Project Settings → Deployment Protection → enable "Protection Bypass for Automation". Add the generated `VERCEL_AUTOMATION_BYPASS_SECRET` value as a query param to the Stripe webhook URL: `https://preview-url.vercel.app/api/webhooks/stripe?x-vercel-protection-bypass=<secret>`. Document this in a comment in the webhook route.

**Warning signs:** Stripe Dashboard shows webhook delivery failures with status 401 on preview deployments.

**Note from STATE.md:** "Phase 48: Vercel Deployment Protection may block `/api/webhooks/stripe` in preview — add to bypass list before Phase 49 testing begins." This is a known concern — address it in Phase 48 setup.

### Pitfall 4: Client Component Accidentally Imports Stripe Singleton

**What goes wrong:** A developer imports `@/lib/billing/stripe` in a Client Component, bundling the Stripe SDK and (potentially) the secret key into the client bundle.

**Why it happens:** Without `import 'server-only'`, Next.js does not prevent server modules from being imported client-side.

**How to avoid:** The `import 'server-only'` at the top of `stripe.ts` causes a build error: `You're importing a component that needs "server-only"...`. This makes the mistake impossible to ship.

**Warning signs:** Build error mentioning `server-only` module in a client bundle context.

### Pitfall 5: Missing `stripe` Dependency in `scripts/verify-env.ts`

**What goes wrong:** Production build succeeds even when Stripe env vars are missing, causing runtime errors after deploy.

**Why it happens:** `scripts/verify-env.ts` is the pre-build check (run in `vercel-build` script) and currently only checks Clerk + DB + Google AI vars. Stripe vars are not validated.

**How to avoid:** Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_SINGLE_FLIGHT`, and `STRIPE_PRICE_SERIAL_ENTREPRENEUR` to the `requiredVars` array in `scripts/verify-env.ts`. Add a production assertion for `STRIPE_SECRET_KEY` (no `sk_test_` prefix when `VERCEL_ENV === 'production'`).

---

## Code Examples

Verified patterns from official sources and project conventions:

### Stripe Singleton (`src/lib/billing/stripe.ts`)
```typescript
// Source: https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/
// Pattern: matches src/db/client.ts startup-assertion style
import 'server-only';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY environment variable is not set. Configure your Stripe API key.'
  );
}

if (
  process.env.VERCEL_ENV === 'production' &&
  process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')
) {
  throw new Error(
    'STRIPE_SECRET_KEY is a test key (sk_test_*) but VERCEL_ENV is production.'
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});
```

### Webhook Route (Preview of Phase 49 Pattern — for context only)
```typescript
// src/app/api/webhooks/stripe/route.ts (created in Phase 49)
// Source: https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/
import { stripe } from '@/lib/billing/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.text(); // Raw text — NOT req.json()
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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle event...
  return NextResponse.json({ received: true }, { status: 200 });
}
```

### Stripe CLI Local Testing
```bash
# Install (macOS)
brew install stripe/stripe-cli/stripe

# Authenticate
stripe login

# Forward all events to local server (copy the printed whsec_ into .env.local)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

### Checkout Session Creation with Metadata (Preview of Phase 49 Pattern)
```typescript
// Source: Stripe Checkout documentation
// Pattern: pass clerkUserId in metadata so webhook can fulfill credits
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ price: process.env.STRIPE_PRICE_SINGLE_FLIGHT!, quantity: 1 }],
  success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/dashboard`,
  metadata: {
    clerkUserId,   // Retrieved from auth() — used by webhook to look up user
    productType: 'single_flight', // Which credit bundle was purchased
  },
});
// Then: redirect(session.url!)
```

### Updated `scripts/verify-env.ts` additions
```typescript
// Add to requiredVars array:
'STRIPE_SECRET_KEY',
'STRIPE_WEBHOOK_SECRET',
'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
'STRIPE_PRICE_SINGLE_FLIGHT',
'STRIPE_PRICE_SERIAL_ENTREPRENEUR',

// Add to production key checks:
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (stripeKey?.startsWith('sk_test_')) {
  console.error('❌ STRIPE_SECRET_KEY is a test key but VERCEL_ENV is production');
  hasErrors = true;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `@stripe/node` + `stripe-node` packages | Single `stripe` package covers all server usage | ~2019 | Simpler install |
| `import Stripe = require('stripe')` (CommonJS) | `import Stripe from 'stripe'` (ES modules) | stripe v12+ | TypeScript-native, no `require()` |
| API version as account default (unset in code) | Explicit `apiVersion` in constructor | Best practice | Prevents silent breaking changes on SDK upgrade |
| Manual test key check in application logic | `import 'server-only'` + startup assertion | Next.js 13+ | Build-time enforcement vs runtime |
| Stripe Elements (embedded form, client-side JS) | Stripe Checkout redirect (server-side redirect to Stripe-hosted page) | Available since ~2018, becoming preferred | Zero client-side Stripe JS, zero PCI surface for this project |

**Deprecated/outdated:**
- `apiVersion: '2024-09-30.acacia'`: Earlier guide recommendation — stripe@20.4.0 uses `2026-02-25.clover`. Use the version matching the installed package.
- `@stripe/stripe-js` in this project: Not needed for redirect Checkout. Do not install.

---

## Open Questions

1. **Stripe Customer pre-creation timing**
   - What we know: The `users` table has `stripeCustomerId text` column (added in Phase 47). The STATE.md blocker notes: "Stripe Customer pre-creation timing — at signup (extend Clerk webhook) or lazy at first checkout."
   - What's unclear: Which phase implements this? Phase 48 (extend the Clerk webhook now) or Phase 49 (lazy creation inside the checkout route)?
   - Recommendation: Defer to Phase 49 (lazy at first checkout). Phase 48 is strictly infrastructure — no API calls to Stripe at runtime. Creating a Stripe Customer at signup requires a live Stripe API call in the Clerk webhook, which is outside Phase 48's scope. The `stripeCustomerId` column stays NULL until Phase 49.

2. **Webhook secret for preview vs production**
   - What we know: Vercel Deployment Protection may block preview webhooks. The bypass uses `VERCEL_AUTOMATION_BYPASS_SECRET` as a query param.
   - What's unclear: Whether the current project has Deployment Protection enabled on preview.
   - Recommendation: During Phase 48 setup, check Vercel Dashboard → Project Settings → Deployment Protection. If enabled, create the automation bypass secret now (it's an env var configuration task that fits Phase 48's scope) so Phase 49 testing isn't blocked.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` (key absent). Skipping this section.

---

## Sources

### Primary (HIGH confidence)
- stripe@20.4.0 npm registry — confirmed version `20.4.0` as latest stable, default `apiVersion: '2026-02-25.clover'`
- `github.com/stripe/stripe-node CHANGELOG.md` — confirmed 20.4.0 release date 2026-02-25 and pinned API version
- `docs.stripe.com/webhooks` — webhook signature verification pattern, `constructEvent` usage, raw body requirement
- `docs.stripe.com/payments/checkout/how-checkout-works` — confirmed @stripe/stripe-js NOT required for redirect mode
- `docs.stripe.com/metadata` — metadata limits (50 KVPs, 40-char keys, 500-char values), Checkout Sessions support metadata
- `docs.stripe.com/products-prices/manage-prices` — Dashboard product/price creation flow, Price ID format
- `vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection` — Protection Bypass for Automation, `x-vercel-protection-bypass` query parameter pattern
- `src/db/client.ts` (project file) — startup assertion pattern (`if (!process.env.X) throw new Error(...)`) used as template
- `scripts/verify-env.ts` (project file) — existing pre-build env validation pattern, production key check pattern
- `src/app/api/webhooks/clerk/route.ts` (project file) — `await req.text()` raw body pattern, webhook verification structure

### Secondary (MEDIUM confidence)
- `pedroalonso.net/blog/stripe-nextjs-complete-guide-2025` — stripe.ts singleton with `import 'server-only'` pattern, CLI commands, environment variable naming (verified against official Stripe docs)
- `docs.stripe.com/stripe-cli/use-cli` — `brew install stripe/stripe-cli/stripe`, `stripe login`, `stripe listen --forward-to` (verified via WebSearch)

### Tertiary (LOW confidence)
- WebSearch results on `server-only` package usage — consistent across multiple sources but not directly verified against Next.js official docs for this project's Next.js 16.1.1 version

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — stripe@20.4.0 is latest, verified via npm registry; no client packages needed confirmed by official Stripe docs
- Architecture: HIGH — singleton pattern matches existing `src/db/client.ts`; `server-only` import is standard Next.js pattern; API version confirmed from changelog
- Pitfalls: HIGH — raw body requirement verified from official docs; webhook secret distinction (CLI vs Dashboard) documented in official Stripe CLI docs; Vercel bypass documented in official Vercel docs

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — stripe SDK is relatively stable; apiVersion could change on next SDK release)
