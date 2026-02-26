---
phase: 51-paywall-ui
plan: "01"
subsystem: ui
tags: [paywall, dialog, shadcn, lucide, credits, stripe]

# Dependency graph
requires:
  - phase: 50-credit-actions-server-enforcement
    provides: advanceToNextStep() paywallRequired return, consumeCredit(), PAYWALL_CUTOFF_DATE, creditConsumedAt column
  - phase: 49-payment-api-layer
    provides: /pricing page, return_to param handling, Stripe checkout
provides:
  - Inline UpgradeDialog component with outcome-framed paywall copy (PAYW-03)
  - StepNavigation paywallRequired handling — opens dialog instead of redirect
  - isPaywallLocked computed in workshop layout from DB fields
  - Lock icon badges on Steps 7-10 in WorkshopSidebar and MobileStepper
affects: [52-paywall-email, pricing-page, workshop-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline dialog paywall gate (not page redirect) — user stays in context"
    - "advanceToNextStep() dual return: NEXT_REDIRECT throws for navigation, paywallRequired returns for dialog"
    - "isPaywallLocked computed server-side in layout, passed as prop to client components"

key-files:
  created:
    - src/components/workshop/upgrade-dialog.tsx
  modified:
    - src/components/workshop/step-navigation.tsx
    - src/app/workshop/[sessionId]/layout.tsx
    - src/components/layout/workshop-sidebar.tsx
    - src/components/layout/mobile-stepper.tsx

key-decisions:
  - "UpgradeDialog as named export (not default) — consistent with project component conventions"
  - "NEXT_REDIRECT rethrown in handleUseCredit() — required for Next.js redirect() to fire from within dialog action"
  - "isPaywallLocked computed in server layout, passed as optional prop — client components remain pure/presentational"
  - "Lock icon shows opacity-60 on Steps 7-10 (not full opacity) — visually distinguishable from not_started steps"

patterns-established:
  - "Paywall dialog pattern: check paywallRequired return from server action, open dialog with credits state"
  - "Server layout computes billing state (isPaywallLocked) and passes to client stepper components"

requirements-completed: [PAYW-02, PAYW-03]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 51 Plan 01: Paywall UI Summary

**Inline UpgradeDialog with outcome-framed copy, paywallRequired handler in StepNavigation, and lock badges on Steps 7-10 in sidebar and mobile stepper**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T02:16:10Z
- **Completed:** 2026-02-26T02:21:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `upgrade-dialog.tsx` — shadcn Dialog with outcome-framed headline ("Your Build Pack is 4 steps away"), 60% progress bar, dual CTA paths (hasCredits / no credits), "Save and decide later" ghost dismiss
- Modified `step-navigation.tsx` `handleNext()` to capture `paywallRequired` return from `advanceToNextStep()` and open UpgradeDialog with credits state — NEXT_REDIRECT properly rethrown
- Workshop layout computes `isPaywallLocked` from `creditConsumedAt`, `createdAt`, and `PAYWALL_CUTOFF_DATE`; passes to both stepper components
- Both `WorkshopSidebar` and `MobileStepper` show `Lock` icon with `opacity-60` on Steps 7-10 when `isPaywallLocked=true`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create UpgradeDialog and wire paywallRequired in StepNavigation** - `b2f92a2` (feat)
2. **Task 2: Add lock badges to WorkshopSidebar and MobileStepper with isPaywallLocked from layout** - `834f289` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/components/workshop/upgrade-dialog.tsx` - Inline paywall dialog: outcome-framed copy, dual CTAs (credit vs pricing), NEXT_REDIRECT rethrow
- `src/components/workshop/step-navigation.tsx` - Added paywallRequired handling in handleNext(), UpgradeDialog in JSX
- `src/app/workshop/[sessionId]/layout.tsx` - Computes isPaywallLocked from workshop DB fields, passes to sidebar/stepper
- `src/components/layout/workshop-sidebar.tsx` - Lock icon on Steps 7-10 when isPaywallLocked
- `src/components/layout/mobile-stepper.tsx` - Lock icon on Steps 7-10 when isPaywallLocked (sheet view)

## Decisions Made

- NEXT_REDIRECT rethrown in UpgradeDialog's `handleUseCredit()` — advanceToNextStep() calls redirect() which throws; must propagate out of the dialog's try/catch for Next.js to handle navigation
- `isPaywallLocked` optional prop with `?` — layout passes it, but components degrade gracefully if omitted (no lock icons shown)
- Lock icon uses `opacity-60` (not full opacity like completed steps) — distinguishes paywall-locked from not_started states visually

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Inline upgrade dialog fully wired: Step 6 → paywall → dialog → credit consumption → Step 7
- Lock badges in both stepper views signal the gate to users before they hit it
- Phase 52 can build on this: email capture at paywall, analytics events, A/B copy variants

---
*Phase: 51-paywall-ui*
*Completed: 2026-02-26*
