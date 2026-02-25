# Requirements: WorkshopPilot.ai

**Defined:** 2026-02-26
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## v1 Requirements

Requirements for v1.8 milestone. Each maps to roadmap phases.

### Onboarding

- [ ] **ONBD-01**: User sees a welcome modal on first visit explaining the app and key areas (chat, canvas, steps)
- [ ] **ONBD-02**: Welcome modal is dismissible and does not reappear after dismissal
- [ ] **ONBD-03**: Onboarding state persists across devices (DB-backed, not just localStorage)

### Billing

- [ ] **BILL-01**: User can purchase a Single Flight workshop credit ($79) via Stripe Checkout
- [ ] **BILL-02**: User can purchase a Serial Entrepreneur pack (3 credits, $149) via Stripe Checkout
- [ ] **BILL-03**: After purchase, credits are immediately available in user's account
- [ ] **BILL-04**: Stripe webhook handles payment confirmation with idempotent credit fulfillment
- [ ] **BILL-05**: Credit purchases are recorded in a transaction ledger

### Paywall

- [ ] **PAYW-01**: Steps 1-6 are free for all authenticated users
- [ ] **PAYW-02**: User sees an inline upgrade modal when attempting to proceed past Step 6 without credits
- [ ] **PAYW-03**: Upgrade modal uses outcome-framed copy ("Your Build Pack is 4 steps away")
- [ ] **PAYW-04**: After purchasing, user auto-returns to their workshop and continues into Step 7
- [ ] **PAYW-05**: Paywall is enforced server-side (not just client-side checks)
- [ ] **PAYW-06**: Existing workshops created before paywall launch are grandfathered as unlocked

### Credits

- [ ] **CRED-01**: User can see remaining workshop credits on the dashboard
- [ ] **CRED-02**: One credit is consumed when user unlocks Steps 7-10 for a workshop
- [ ] **CRED-03**: Credit consumption is atomic (no double-spend under concurrent requests)

### Pricing

- [ ] **PRIC-01**: Pricing page displays updated tiers: Single Flight ($79), Serial Entrepreneur ($149), Agency (Contact Sales)
- [ ] **PRIC-02**: Agency tier shows a Contact Sales button (no self-serve billing)
- [ ] **PRIC-03**: Single Flight and Serial Entrepreneur cards link to Stripe Checkout

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Payments

- **BILL-06**: User can re-purchase credits from dashboard (not just paywall)
- **BILL-07**: User receives email receipt after purchase (Stripe handles this)
- **BILL-08**: Agency tier self-serve monthly subscription billing

### Enhanced Onboarding

- **ONBD-04**: Contextual tooltips appear on first interaction with canvas and chat
- **ONBD-05**: Onboarding tour adapts to step context (deferred ONBD-03 from v1.6)

### Enhanced Paywall

- **PAYW-07**: Sneak peek of Step 7 content before purchase (locked preview)
- **PAYW-08**: Auto-unlock polling on success page return (eliminates webhook delay)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe Elements (embedded form) | Stripe Checkout redirect handles PCI, Apple Pay, Google Pay automatically — less code, zero PCI surface |
| Subscription billing for consumers | Credit-based model fits the use case better (one-time workshops, not recurring) |
| Refund processing in-app | Handle refunds manually through Stripe Dashboard for v1.8 |
| Multi-currency pricing | USD only for launch; Stripe Checkout handles currency display automatically |
| Free trial tier | Taste-test model (Steps 1-6 free) replaces traditional trial |
| Guided walkthrough tour | Welcome modal is sufficient; multi-step tours have 60%+ skip rates |
| PDF/PPT export | Deferred to separate milestone — orthogonal to payments |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | — | Pending |
| ONBD-02 | — | Pending |
| ONBD-03 | — | Pending |
| BILL-01 | — | Pending |
| BILL-02 | — | Pending |
| BILL-03 | — | Pending |
| BILL-04 | — | Pending |
| BILL-05 | — | Pending |
| PAYW-01 | — | Pending |
| PAYW-02 | — | Pending |
| PAYW-03 | — | Pending |
| PAYW-04 | — | Pending |
| PAYW-05 | — | Pending |
| PAYW-06 | — | Pending |
| CRED-01 | — | Pending |
| CRED-02 | — | Pending |
| CRED-03 | — | Pending |
| PRIC-01 | — | Pending |
| PRIC-02 | — | Pending |
| PRIC-03 | — | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 ⚠️

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after initial definition*
