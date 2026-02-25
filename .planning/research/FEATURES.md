# Feature Research

**Domain:** SaaS onboarding UX + taste-test paywalls + credit-based purchasing (Stripe)
**Researched:** 2026-02-26
**Confidence:** HIGH (onboarding patterns), HIGH (paywall UX), HIGH (Stripe credit implementation)

---

## Context: What Is Being Added

This research covers three distinct feature areas for WorkshopPilot.ai v1.8:

1. **Lightweight onboarding** — welcome modal + one contextual tooltip on first visit; not a heavy guided tour
2. **Taste-test paywall** — Steps 1-6 free, Step 7+ gated behind a workshop credit
3. **Credit purchasing** — Stripe Checkout one-time payment for workshop credits, with auto-unlock on success

The existing stack (Clerk auth, Neon/Drizzle, Next.js App Router, shadcn/ui) shapes every implementation decision below.

---

## Feature Area 1: Lightweight First-Run Onboarding

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Welcome modal on first visit only | Every SaaS product greets new users; missing = cold and confusing | LOW | Show once, never again. Gate on `hasSeenWelcome` flag in Clerk `publicMetadata`. |
| Skip/dismiss option prominently placed | Users hate feeling trapped in tutorials | LOW | "Skip" in top-right corner or as secondary CTA. Must be one click to dismiss. |
| Short copy (headline + 2-3 bullets + CTA) | Users don't read long welcome screens; they scroll or skip immediately | LOW | No feature lists. Outcome-focused. "Here's what you'll create." |
| Single primary CTA | Clear next action required | LOW | "Start My First Workshop" or "Let's Go" — not "Learn More". |
| Does not show to returning users | Re-showing onboarding to returning users is a product failure | LOW | Persist seen-flag to Clerk metadata. Check on every auth, not just first page load. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "What you'll create" outcome preview | Users who understand the outcome before starting complete at higher rates; sets expectations, reduces drop-off | LOW | Show deliverable icons (PRD, Tech Specs, User Stories) or a screenshot of the Build Pack outputs page. |
| Upfront paywall disclosure in modal | Prevents paywall shock at Step 7, which damages trust | LOW | Single line: "Steps 1–6 are free. Steps 7–10 + Build Pack require one workshop credit." |
| One contextual tooltip on Step 1 entry | Orients users to the split-screen layout (chat left + canvas right) which is non-standard for most users | LOW | Position pointer at the chat panel. One tooltip, one dismiss. No tour. shadcn `Tooltip` or a simple positioned `div`. |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multi-step guided tour (Shepherd.js, Intro.js, Onborda) | Looks thorough on paper | 60%+ skip rate in research; adds 80KB+ to bundle; brittle DOM selectors break on UI changes; distracts from the actual product | Single welcome modal + one contextual tooltip |
| Onboarding checklist / progress bar | Looks like a sign of a complete product | Creates pressure, not delight; the 10-step stepper already IS the checklist — adding another redundantly copies it | The step stepper serves this role |
| Video autoplay in welcome modal | Feels rich and informative | Browser autoplay blocked; modal becomes heavy; users don't watch tutorial videos before using a product | Static deliverable preview image or icon grid |
| Setup wizard / profile questions | Personalization sounds valuable | Adds friction before the first value moment; WorkshopPilot has one workflow, not multiple paths | Jump straight to workshop creation |
| Email drip onboarding sequence | Re-engages dormant users | Out of scope for v1.8; Clerk's built-in emails handle minimal communication | Defer to MMP |

### Implementation Pattern

**Storage strategy:** `hasSeenWelcome: true` stored in Clerk `publicMetadata` — not localStorage. Rationale: persists across devices and browsers; Clerk is already the auth layer; eliminates localStorage SSR hydration issues native to Next.js App Router.

**When to show:** After Clerk auth resolves, before dashboard renders. Check `user.publicMetadata.hasSeenWelcome`. If falsy → mount Dialog. On dismiss → call `clerkClient.users.updateUserMetadata(userId, { publicMetadata: { hasSeenWelcome: true } })` via Server Action.

**Component:** shadcn `Dialog` — already in the project's component library, zero new dependency. shadcn publishes an official `dialog-onboarding-welcome` block as a reference implementation.

**Contextual tooltip:** Show on Step 1 first entry if `hasSeenWorkshopTip` is false in Clerk metadata. shadcn `Tooltip` or a simple absolutely-positioned div. Fire-and-forget: set flag on first hover or click anywhere in chat panel.

**Welcome modal copy pattern:**
- Headline: "Turn your idea into a Product Brief — in one session."
- Body: "Our AI facilitates a structured design thinking workshop. Map your problem, understand your users, walk away with a PRD and Tech Specs ready for any AI coder."
- Fine print: "Steps 1–6 are free. Steps 7–10 + Build Pack require one workshop credit."
- CTA: "Start My First Workshop"

---

## Feature Area 2: Taste-Test Paywall (Mid-Workflow Gate)

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Clear gate location (visible before hitting it) | Users must know where free ends; surprises damage trust and kill conversion | LOW | Show "Step 7+ requires a workshop credit" indicator in the stepper before they reach it — not a surprise. |
| Upgrade modal immediately at the gate point | Standard pattern: when you hit a paywall, you see options in-place | MEDIUM | Modal fires at Step 6 → Step 7 transition when user has 0 credits. No page redirect to pricing. |
| "What you're unlocking" messaging in modal | Users convert when they see specific value, not generic upgrade prompts | LOW | List Steps 7–10 by name + Build Pack deliverables. "You're 4 steps from your Build Pack." |
| Ability to dismiss and come back (progress preserved) | Users may not purchase immediately; forcing purchase or losing work causes churn | LOW | Auto-save already exists. Modal needs a "Save my progress & decide later" dismiss option. |
| Free tier feels genuinely useful, not crippled | Steps 1–6 must feel valuable on their own; if the free portion feels like a demo, users won't invest enough to hit the paywall with intent | MEDIUM | Steps 1–6 (Challenge → Journey Map) produce real, usable research outputs. This is the taste-test by design. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Progress context in paywall modal | "You've completed 6 of 10 steps — you're more than halfway there" leverages sunk cost + momentum psychology | LOW | Research confirms paywalls with progress context convert at materially higher rates than generic upgrade prompts. |
| Sneak peek of Build Pack in modal | Users who can see what they're buying (blurred PRD excerpt or deliverable list with icons) convert higher | LOW | Show blurred/watermarked Build Pack outputs or an icon row of deliverables. Established in monetisation.md as a key pattern. |
| Credit balance check before showing modal | If user already has a credit, show "Use Your Credit" CTA instead of the purchase flow — avoids friction for repeat users | LOW | Query credit count before gating. If credits > 0 → auto-advance to Step 7 without any modal. |
| Stepper indicator for locked steps | Gray-out or "lock" badge on Steps 7-10 in the stepper for users with 0 credits | LOW | Signals premium value without blocking the free experience; educates users before they reach the gate. |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Time-limited free trial instead of step gate | Feels more flexible | For a multi-hour workshop, time limits create anxiety not engagement; step-based gate aligns with natural investment moment | Keep the step gate — 6 free steps is the right taste-test length |
| Soft paywall only (visible-but-locked steps, no modal) | Graying out locked steps signals premium value | Visible-but-locked with no clear purchase path creates frustration, not desire; requires a direct upgrade path inline | Hard gate at Step 7 with immediate modal + purchase option |
| Subscription tier for one-off users | Recurring revenue | Target users (founders, idea-havers) run 1-3 workshops per year; monthly subscription creates immediate churn post-completion | Credits model — sell outcomes, not access |
| Free credits on sign-up | Removes friction, increases activation | Eliminates the paywall entirely before it creates intent; if users know they get a free credit, they don't value the product | 6 free steps IS the free value; no free credits needed |
| Hard redirect to pricing page at gate | Feels like a "wall" | Breaks the workflow context; forces user to lose workshop momentum; converts worse than inline modal | In-place upgrade modal, no redirect |

### Paywall Modal Design Pattern

Based on research, highest-converting paywall modals contain these elements:

1. **Headline:** Outcome-focused. "Your Build Pack is 4 steps away." NOT "Upgrade Required" or "Access Restricted."
2. **Progress context:** "You've invested time completing 6 of 10 steps — you're past the halfway point."
3. **What's unlocked:** Specific named list — Reframing Challenge, Ideation, Concept Development, Validate, PRD, Tech Specs.
4. **Sneak peek:** Blurred Build Pack output or icon grid of deliverables.
5. **Pricing:** Primary option prominently displayed. Secondary option ("or 3 credits for $149") below as text link.
6. **Primary CTA:** "Get My Workshop Credit — $79" (action-oriented, price inline, no ambiguity about what happens next).
7. **Secondary action:** "Save my progress & decide later" (dismisses without data loss, soft close).
8. **Trust signal:** "Instant access. No subscription. Your credit never expires."

**Trigger timing:** Fires when user clicks "Complete Step 6" / "Next" from Step 6 AND has 0 credits. Does not fire on page load. Does not fire mid-step. Server-side check in step navigation: `if (targetStep >= 7 && user.workshopCredits < 1) → return gated`.

**Paywall location in code:** Step navigation Server Action. Credit check is server-side (not client-side) to prevent bypass.

---

## Feature Area 3: Credit-Based Purchasing (Stripe Checkout)

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Redirect to Stripe-hosted checkout | Industry standard; users trust Stripe's UI for payment entry; Apple Pay/Google Pay included automatically | LOW | `stripe.checkout.sessions.create({ mode: 'payment', ... })` → redirect to Stripe URL. No custom payment form. |
| Return to app after payment (success redirect) | Users expect to land back in the product immediately after paying | LOW | `success_url: /dashboard?payment=success` — detect query param, show toast, refresh credit display. |
| Credit balance visible on dashboard | Users need to see their credit state without hunting in account settings | LOW | Prominent badge/pill in dashboard header: "2 credits" or "No credits — get one". |
| Webhook-driven credit fulfillment (not redirect-driven) | Redirect can be aborted (browser close, network drop); webhook is authoritative and retry-able | MEDIUM | `checkout.session.completed` webhook → update DB credits. Return 200 only after successful DB write. |
| Idempotent webhook handler | Stripe retries webhooks on failure; credits must not double-add on retry | MEDIUM | Check `stripeCheckoutSessionId` in purchases table before processing. If found and status=completed → return 200 immediately. |
| Stripe webhook signature verification | Security baseline — without this, anyone can POST fake payment events to your endpoint | LOW | `stripe.webhooks.constructEvent(rawBody, sigHeader, WEBHOOK_SECRET)`. Raw body required — must bypass Next.js JSON body parser. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auto-unlock into Step 7 after payment | Removes the "now what?" friction after purchasing; user returns from Stripe and continues the workshop without a manual click | MEDIUM | On `?payment=success` landing: show "Activating your credit..." state, poll `/api/credits` once (500ms delay for webhook to process), then navigate to Step 7. |
| Serial Entrepreneur 3-credit pack | Second purchase option for users with multiple ideas; higher ASP, better margin per credit | LOW | Second `stripe.Price` object. Add as secondary option in paywall modal and pricing page. |
| Customer Portal link (receipt access) | Users need purchase receipts for expense reporting | LOW | Stripe Customer Portal URL is one API call: `stripe.billingPortal.sessions.create()`. Link from account/settings page. |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Stripe Elements (custom in-app payment form) | More UI control | Requires PCI compliance scope; Apple Pay/Google Pay require extra SDK integration; 3x longer to implement; mobile responsiveness must be hand-rolled | Stripe Checkout redirect — Stripe handles UI, compliance, mobile, localization |
| Subscription billing (monthly/annual) | Recurring revenue baseline | Target users run 1-3 workshops per year; subscription churn post-first-use will be near 100%; ongoing support overhead without proportional LTV | One-time credits only for v1.8. Agency as "Contact Sales" only. |
| Usage-based billing (per AI message or per step) | Granular monetization | Unpredictable cost for users; high cognitive overhead to track spending; metering infrastructure required | Workshop-level credits: 1 credit = 1 full workshop (Steps 1-10 + Build Pack). Clean unit. |
| In-app credit animation / gamification | Engagement | Premature; adds complexity; zero conversion impact at this stage | Simple numeric badge is sufficient |
| Admin credit gifting UI | Useful eventually | Out of scope for v1.8; direct DB edit or Stripe credit balance is sufficient for any manual cases | Defer to MMP |

### Technical Architecture: Credit System

**DB schema additions (Drizzle/Neon):**

```typescript
// Add to existing users table
workshopCredits: integer('workshop_credits').notNull().default(0),
stripeCustomerId: text('stripe_customer_id'),  // for portal access later

// New purchases table (idempotency guard)
purchases: {
  id: uuid, userId: text (FK), stripeCheckoutSessionId: text (unique),
  creditsPurchased: integer, pricePaidCents: integer,
  status: text, // 'pending' | 'completed' | 'failed'
  createdAt: timestamp
}
```

**Atomic credit consumption (prevents race conditions):**

```typescript
// In step navigation guard (Server Action)
const result = await db.update(users)
  .set({ workshopCredits: sql`workshop_credits - 1` })
  .where(and(
    eq(users.id, userId),
    gt(users.workshopCredits, 0)  // Inline balance check — atomic
  ))
  .returning()

if (result.length === 0) {
  // 0 rows updated = user had 0 credits = gate them
  return { gated: true }
}
```

**Stripe Checkout session (Server Action):**

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ price: STRIPE_PRICE_ID_SINGLE_FLIGHT, quantity: 1 }],
  metadata: {
    userId: user.id,      // Clerk user ID — passed to webhook
    credits: '1',
    packageId: 'single-flight'
  },
  customer_email: user.emailAddresses[0].emailAddress,
  success_url: `${BASE_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/dashboard?payment=cancelled`,
})
return { url: session.url }  // Redirect client to this URL
```

**Webhook handler (`POST /api/webhooks/stripe`):**

```typescript
// Raw body required — Next.js must NOT parse this route with JSON bodyParser
const rawBody = await request.text()
const sig = request.headers.get('stripe-signature')!
const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)

if (event.type === 'checkout.session.completed') {
  const session = event.data.object
  const { userId, credits } = session.metadata as { userId: string; credits: string }

  // Idempotency: bail if already processed
  const existing = await db.query.purchases.findFirst({
    where: eq(purchases.stripeCheckoutSessionId, session.id)
  })
  if (existing?.status === 'completed') return new Response('OK', { status: 200 })

  // Atomic: grant credits + record purchase in one transaction
  await db.transaction(async (tx) => {
    await tx.update(users)
      .set({ workshopCredits: sql`workshop_credits + ${parseInt(credits)}` })
      .where(eq(users.id, userId))

    await tx.insert(purchases).values({
      userId,
      stripeCheckoutSessionId: session.id,
      creditsPurchased: parseInt(credits),
      status: 'completed'
    })
  })

  // Optional: sync to Clerk publicMetadata for fast middleware checks
  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: { workshopCredits: newCreditTotal }
  })
}
return new Response('OK', { status: 200 })
```

**Post-payment auto-unlock (success redirect handler):**

```typescript
// In /dashboard?payment=success handler (client component)
useEffect(() => {
  if (searchParams.get('payment') === 'success') {
    // Webhook may not have fired yet — poll once with short delay
    setTimeout(async () => {
      const { credits } = await fetch('/api/credits').then(r => r.json())
      if (credits > 0 && pendingWorkshopId) {
        router.push(`/workshop/${pendingWorkshopId}/step/7`)
      }
    }, 1000)
    toast.success('Workshop credit activated!')
  }
}, [])
```

---

## Feature Dependencies

```
[Welcome Modal Onboarding]
    └──requires──> Clerk publicMetadata flag: hasSeenWelcome
    └──requires──> shadcn Dialog (already in project)
    └──independent──> Can ship before payment features

[Contextual Tooltip (Step 1)]
    └──requires──> Clerk publicMetadata flag: hasSeenWorkshopTip
    └──independent──> Standalone from payment features

[Taste-Test Paywall Gate]
    └──requires──> workshopCredits column in users DB table
    └──requires──> Server Action credit check in step navigation
    └──launches──> Paywall Upgrade Modal

[Paywall Upgrade Modal]
    └──requires──> Paywall Gate (above)
    └──launches──> Stripe Checkout Session (on primary CTA click)
    └──enhances──> Sneak peek / Build Pack preview (v1.8 follow-on)

[Stripe Checkout Credit Purchase]
    └──requires──> workshopCredits DB column + purchases table
    └──requires──> Stripe account + STRIPE_SECRET_KEY + STRIPE_PRICE_IDs
    └──requires──> /api/webhooks/stripe endpoint (raw body, no JSON parser)
    └──requires──> STRIPE_WEBHOOK_SECRET in environment
    └──enables──> Auto-unlock into Step 7

[Auto-unlock into Step 7]
    └──requires──> Stripe Checkout success redirect
    └──requires──> DB credits updated before poll resolves
    └──NOTE──> Webhook fires within seconds but redirect is faster — use 1s poll

[Credit Display on Dashboard]
    └──requires──> workshopCredits DB column (read on dashboard load)
    └──independent──> Can ship before payment infra (shows 0 credits)

[Pricing Page Update]
    └──independent──> Static content change, no payment infra dependency
    └──should ship early──> Sets correct user expectations before payment flow exists
```

### Key Dependency Notes

- **Auto-unlock timing risk:** The `checkout.session.completed` webhook fires within seconds, but the `success_url` redirect fires first. The DB may not have credits when the success page loads. Mitigation: 1-second delay + single poll before auto-advancing to Step 7. Show "Activating your credit..." loading state.
- **Clerk publicMetadata as cache:** DB is the source of truth for credits. Clerk metadata is a fast cache for middleware access control. Always read from DB for gating decisions. Sync Clerk after DB transaction, not before.
- **Raw body for webhooks:** Next.js App Router's `request.json()` parses and discards the raw body, breaking Stripe signature verification. The webhook route must use `request.text()` and must not be wrapped in any JSON middleware.
- **Server-side gating only:** Step navigation credit check must be a Server Action, not a client-side guard. Client-side guards are bypassable.

---

## MVP Definition

### Launch With (v1.8 — Must Have)

- [ ] Welcome modal on first visit (shadcn Dialog, `hasSeenWelcome` in Clerk metadata, dismissed = never shows again)
- [ ] One contextual tooltip on Step 1 chat panel (orientation, shadcn Tooltip, dismissed = never shows again)
- [ ] Paywall gate at Step 7 transition (Server Action, server-side credit check, returns `{ gated: true }` when credits = 0)
- [ ] Paywall upgrade modal (in-place, outcome-focused headline, feature list, pricing, purchase CTA, "save & decide later")
- [ ] `workshopCredits` column in users table + `purchases` table (Drizzle migration)
- [ ] Stripe Checkout session creation (Server Action, `mode: 'payment'`, metadata with `userId` + `credits`)
- [ ] Stripe webhook handler (`/api/webhooks/stripe`, signature verification, idempotency, atomic DB transaction)
- [ ] Credit display on dashboard ("X credits remaining" badge or "No credits — get one" CTA)
- [ ] Success redirect handling (`?payment=success` → toast + credit display refresh)
- [ ] Pricing page updated with new tiers (Single Flight $79, Serial Entrepreneur $149, Agency "Contact Sales")
- [ ] Locked step indicators (Steps 7-10 in stepper show lock badge when user has 0 credits)

### Add After Validation (v1.8 Follow-On)

- [ ] Auto-unlock into Step 7 after payment (poll `/api/credits` on success redirect, then navigate) — delightful UX, requires timing finesse
- [ ] Sneak peek / blurred Build Pack preview in paywall modal — increases conversion, low effort
- [ ] Serial Entrepreneur 3-credit pack as second purchase option in modal and pricing page
- [ ] Stripe Customer Portal link from account settings page (one API call for receipt access)

### Future Consideration (MMP+)

- [ ] Agency tier subscription billing (Stripe Billing, not Checkout — different integration)
- [ ] A/B testing on paywall modal copy, pricing, and CTA text
- [ ] Admin credit gifting / manual allocation UI
- [ ] Email drip sequence for users who dismiss paywall without purchasing
- [ ] Workshop credit expiration (if business model shifts)
- [ ] Usage analytics funnel (step-by-step conversion, paywall hit rate, purchase rate)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Welcome modal (first visit) | MEDIUM | LOW | P1 |
| Step 1 contextual tooltip | LOW | LOW | P1 |
| Paywall gate at Step 7 (server-side) | HIGH | MEDIUM | P1 |
| Paywall upgrade modal | HIGH | MEDIUM | P1 |
| DB schema: credits + purchases | HIGH | LOW | P1 |
| Stripe Checkout session creation | HIGH | LOW | P1 |
| Stripe webhook + idempotent credit grant | HIGH | MEDIUM | P1 |
| Credit display on dashboard | MEDIUM | LOW | P1 |
| Success redirect handling + toast | HIGH | LOW | P1 |
| Pricing page update (new tiers) | MEDIUM | LOW | P1 |
| Locked step indicators in stepper | MEDIUM | LOW | P1 |
| Auto-unlock into Step 7 | HIGH | MEDIUM | P2 |
| Sneak peek in paywall modal | MEDIUM | LOW | P2 |
| Serial Entrepreneur 3-credit pack | MEDIUM | LOW | P2 |
| Customer Portal link | LOW | LOW | P2 |

**Priority key:**
- P1: Must have for v1.8 launch
- P2: Should have — add once P1 is stable and tested
- P3: Nice to have — future milestone

---

## Patterns to Follow (Synthesized from Research)

### Onboarding: Orient, Don't Educate

Users want to use the product, not learn about it. Research consistently shows that welcome modals work when they contain only: what the product does in one line, what the user will create, and a single CTA to start. Feature tours, benefit lists, and multi-step walkthroughs all have high skip rates and add maintenance overhead.

The single contextual tooltip (Step 1, chat panel) is sufficient orientation for the split-screen layout. Everything else the user learns by doing — which is appropriate for a product that IS a learning-by-doing process.

### Paywall: Bridge, Not Barrier

Research across multiple sources shows paywalls convert when framed as "the final step to finishing something you've already started" rather than "access denied." The specific language matters:

- BAD: "Upgrade to continue" / "This feature requires a paid plan"
- GOOD: "You're 4 steps from your Build Pack" / "You've done the hard part — let's finish it"

The 6-step taste-test is well-calibrated. By Step 6 (Journey Map), the user has invested significant time, produced real outputs, and experienced the AI's facilitation quality. This is the correct moment for the gate — after the "wow moment" but before the synthesis/output phase that delivers the most obvious value.

### Credits: Clarity Over Cleverness

Credit systems confuse users when the unit is ambiguous. "1 workshop credit" must mean exactly one thing everywhere it appears: one complete workshop from Step 1-10 plus the Build Pack. Stated plainly in the welcome modal, the paywall modal, the pricing page, and the dashboard badge. No secondary definitions, no partial-use rules.

---

## Competitor Feature Analysis

| Feature | Typeform (workflow gating) | Canva (first-run + credits) | ChatGPT Plus (upgrade modal) | WorkshopPilot v1.8 Approach |
|---------|--------------------------|----------------------------|------------------------------|------------------------------|
| Onboarding | Multi-step welcome wizard | 3-slide feature tour | None — jumps straight to chat | Single modal, outcome headline, one CTA |
| First-run tooltip | Overlay tour on workspace | Contextual tooltips on hover | None | One tooltip on Step 1 chat panel only |
| Paywall trigger | Form response/field limit | Export or template features | Message limit reached | Step 7 workflow gate (after 6 free steps) |
| Upgrade modal | Mid-creation "Upgrade" dialog | Feature-locked click → pricing modal | "You've reached your limit" modal with plan options | "Your Build Pack is 4 steps away" + feature list |
| Purchase model | Subscription only | Subscription + credit packs | Subscription only | One-time credit packs ($79 / $149 for 3) |
| Post-purchase UX | Subscription active immediately | Feature unlocks instantly | Subscription active | Auto-unlock into Step 7 (poll-based) |
| Credit display | N/A | Credits balance in toolbar | N/A | Credits badge in dashboard header |

---

## Sources

- [SaaS Onboarding UX Best Practices — Userpilot](https://userpilot.medium.com/onboarding-ux-patterns-and-best-practices-in-saas-c46bcc7d562f)
- [7 User Onboarding Best Practices for 2026 — Formbricks](https://formbricks.com/blog/user-onboarding-best-practices)
- [shadcn dialog-onboarding-welcome block](https://www.shadcn.io/blocks/dialog-onboarding-welcome)
- [How freemium SaaS products convert users with upgrade prompts — Appcues](https://www.appcues.com/blog/best-freemium-upgrade-prompts)
- [Finding the right point to trigger a paywall — Sankalp Jonna](https://www.sankalpjonna.com/posts/finding-the-right-point-in-your-ux-to-trigger-a-paywall)
- [Mastering Freemium Paywalls: Strategic Timing — Monetizely](https://www.getmonetizely.com/articles/mastering-freemium-paywalls-strategic-timing-for-saas-success)
- [Strategic Paywalls: Where and When to Gate Features — Foundational Edge](https://foundationaledge.com/strategic-paywalls-where-and-when-to-gate-your-saas-features)
- [Freemium to Premium: Converting AI Tool Users — Kinde](https://www.kinde.com/learn/billing/conversions/freemium-to-premium-converting-free-ai-tool-users-with-smart-billing-triggers/)
- [Implementing Pre-paid Credit Billing with Next.js and Stripe — Pedro Alonso](https://www.pedroalonso.net/blog/stripe-usage-credit-billing/)
- [Stripe Checkout and Webhook in Next.js 15 — John Gragson / Medium](https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e)
- [Exploring Clerk Metadata with Stripe Webhooks — Clerk](https://clerk.com/blog/exploring-clerk-metadata-stripe-webhooks)
- [SaaS Credits System Guide 2026 — ColorWhistle](https://colorwhistle.com/saas-credits-system-guide/)
- [NextJS Credit System for SaaS App — Jordan Steinberg / Medium](https://medium.com/@jsteinb/nextjs-using-stripe-to-build-a-credit-system-for-your-saas-app-3562e1608c25)
- [WorkshopPilot monetisation.md — internal planning doc](/.planning/monetisation.md)

---

*Feature research for: WorkshopPilot.ai v1.8 — Onboarding + Payments*
*Researched: 2026-02-26*
