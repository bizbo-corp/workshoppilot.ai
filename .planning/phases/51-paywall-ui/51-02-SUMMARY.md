---
phase: 51-paywall-ui
plan: "02"
subsystem: billing
tags: [paywall, stripe, return-to, redirect, credits, dashboard, open-redirect]

# Dependency graph
requires:
  - phase: 51-01
    provides: UpgradeDialog linking to /pricing?return_to=..., PaywallOverlay with sessionId prop
  - phase: 49-payment-api-layer
    provides: /api/billing/checkout route, /purchase/success page, /pricing page
  - phase: 50-credit-actions-server-enforcement
    provides: consumeCredit(), creditBalance in users table
provides:
  - Return-to-workshop flow after Stripe Checkout purchase (PAYW-04)
  - Open redirect prevention in checkout route, success page, and pricing page
  - Credit badge in dashboard header (CRED-01)
affects: [52-paywall-email, dashboard-layout, pricing-page, workshop-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Return-to param forwarding chain: upgrade-dialog → pricing?return_to → checkout form workshop_return_url → success page return_to → redirect"
    - "Open redirect prevention: /workshop/ prefix validation at every entry point (checkout route, success page, pricing page)"
    - "Server-side credit query in dashboard layout — passes creditBalance prop to client DashboardHeader"

key-files:
  created: []
  modified:
    - src/app/api/billing/checkout/route.ts
    - src/app/purchase/success/page.tsx
    - src/app/pricing/page.tsx
    - src/components/workshop/paywall-overlay.tsx
    - src/app/dashboard/layout.tsx
    - src/components/dashboard/dashboard-header.tsx

key-decisions:
  - "Open redirect validated at three points (checkout route, success page, pricing page) — defense in depth; no single point of failure"
  - "validReturnTo redirect placed AFTER payment_not_paid early return — preserves processing message for deferred payment methods (ACH)"
  - "Dashboard layout made async (Server Component) to query creditBalance — layout is the right place, avoids client-side fetch waterfall"
  - "creditBalance passed as optional prop (undefined when not logged in) — badge hidden rather than showing 0 in that edge case"

patterns-established:
  - "return_to chain: client URL param → hidden form field → Stripe success_url encoding → redirect after fulfillment"

requirements-completed: [PAYW-04, CRED-01]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 51 Plan 02: Paywall UI Summary

**Return-to-workshop redirect after Stripe Checkout purchase with open redirect prevention, plus credit balance badge in dashboard header**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T02:24:32Z
- **Completed:** 2026-02-26T02:26:19Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Modified `checkout/route.ts` to read `workshop_return_url` from JSON body or formData, validate it starts with `/workshop/`, and encode it as `return_to` in Stripe's success_url
- Modified `success/page.tsx` to read `return_to` from searchParams, validate the `/workshop/` prefix, and redirect on `fulfilled`/`already_fulfilled` — `payment_not_paid` still shows processing message (no redirect)
- Modified `pricing/page.tsx` to accept `searchParams`, validate `return_to`, and inject a `workshop_return_url` hidden input into all checkout forms when present
- Updated `PaywallOverlay.handleBuyCredits()` to navigate to `/pricing?return_to=/workshop/${sessionId}/step/7` (sessionId already available via props)
- Made `dashboard/layout.tsx` async; queries `creditBalance` from `users` table via Clerk `auth()` and passes it to `DashboardHeader`
- Added credit badge to `DashboardHeader` — olive pill showing "X credits" when balance > 0, muted pill showing "No credits" when zero, both linking to `/pricing`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add workshop_return_url to checkout route and return_to redirect to success page** - `f1b17cc` (feat)
2. **Task 2: Wire pricing return_to forwarding, PaywallOverlay return_to, and dashboard credit badge** - `5e72bc1` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/app/api/billing/checkout/route.ts` - Reads workshop_return_url, validates /workshop/ prefix, encodes in Stripe success_url
- `src/app/purchase/success/page.tsx` - Reads return_to, validates, redirects to workshop after fulfilled/already_fulfilled
- `src/app/pricing/page.tsx` - Async, reads return_to searchParam, injects workshop_return_url hidden input in checkout forms
- `src/components/workshop/paywall-overlay.tsx` - handleBuyCredits includes return_to in pricing URL
- `src/app/dashboard/layout.tsx` - Async, queries creditBalance, passes to DashboardHeader
- `src/components/dashboard/dashboard-header.tsx` - Credit badge with balance display, links to /pricing

## Decisions Made

- Open redirect validated at all three entry points (checkout route, success page, pricing page) — defense in depth, not just one validation point
- `redirect(validReturnTo)` placed outside any try/catch and after all early returns — required for Next.js NEXT_REDIRECT to propagate correctly
- `creditBalance` typed as `number | undefined` (not `number | null`) — `undefined` means "layout didn't pass it" (unauthenticated edge case), badge hidden gracefully

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Full PAYW-04 return-to-workshop flow complete: upgrade dialog → pricing?return_to → checkout with workshop_return_url → Stripe → success → workshop Step 7
- PaywallOverlay (direct navigation path) also wired
- Phase 52 (paywall email) can build on this: email capture is in the upgrade dialog flow, not the return-to flow

## Self-Check: PASSED

- checkout/route.ts: FOUND
- success/page.tsx: FOUND
- pricing/page.tsx: FOUND
- paywall-overlay.tsx: FOUND
- dashboard/layout.tsx: FOUND
- dashboard-header.tsx: FOUND
- 51-02-SUMMARY.md: FOUND
- Commit f1b17cc (Task 1): FOUND
- Commit 5e72bc1 (Task 2): FOUND

---
*Phase: 51-paywall-ui*
*Completed: 2026-02-26*
