---
phase: 50-credit-actions-server-enforcement
plan: 02
subsystem: payments
tags: [paywall, server-actions, next-js, drizzle, stripe, credits]

# Dependency graph
requires:
  - phase: 50-credit-actions-server-enforcement
    provides: "billing-actions.ts with consumeCredit(), getCredits(), PAYWALL_CUTOFF_DATE"
provides:
  - "Modified advanceToNextStep() with Step 6→7 credit gate returning paywallRequired union"
  - "PaywallOverlay client component for blocked direct URL access to Steps 7-10"
  - "StepPage Server Component paywall check gating Steps 7-10 for non-unlocked workshops"
  - "paywall-config.ts constant module (PAYWALL_CUTOFF_DATE extracted from use server file)"
affects: [51-paywall-ui, phase-52-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PAYWALL_CUTOFF_DATE in separate lib/billing/paywall-config.ts (not in use server file) — Next.js prohibits non-async exports from use server modules"
    - "Server Component paywall: check creditConsumedAt/createdAt from already-fetched session relation, no extra DB query"
    - "advanceToNextStep returns union type — normal path redirects (never resolves), paywall path returns without redirect"
    - "PaywallOverlay calls router.refresh() on successful consumeCredit() to trigger Server Component re-render"

key-files:
  created:
    - src/components/workshop/paywall-overlay.tsx
    - src/lib/billing/paywall-config.ts
  modified:
    - src/actions/workshop-actions.ts
    - src/app/workshop/[sessionId]/step/[stepId]/page.tsx
    - src/actions/billing-actions.ts

key-decisions:
  - "PAYWALL_CUTOFF_DATE moved to lib/billing/paywall-config.ts — Next.js 'use server' constraint prohibits non-async exports; all three consumers import from config module"
  - "advanceToNextStep gate returns BEFORE updateStepStatus — Step 6 stays in_progress when paywall fires; Phase 51 calls consumeCredit() then advanceToNextStep() again"
  - "StepPage paywall check reuses already-fetched session.workshop relation (no extra DB query) — creditConsumedAt and createdAt available from Phase 47 schema"
  - "PaywallOverlay uses router.refresh() (not redirect) — refreshes Server Component in-place to reveal step content after credit consumption"

patterns-established:
  - "Non-async paywall constants live in lib/billing/ (not in actions/) to stay compatible with use server restrictions"
  - "Paywall gate checks: isUnlocked (creditConsumedAt !== null) OR isGrandfathered (createdAt < PAYWALL_CUTOFF_DATE)"

requirements-completed: [PAYW-01, PAYW-05, PAYW-06]

# Metrics
duration: 25min
completed: 2026-02-26
---

# Phase 50 Plan 02: Step 6→7 Credit Gate and Server Component Paywall Summary

**Server-side paywall enforcement with Step 6→7 gate in advanceToNextStep() and StepPage blocking direct URL access to Steps 7-10 for non-unlocked workshops**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-26T23:20:00Z
- **Completed:** 2026-02-26T23:45:58Z
- **Tasks:** 3 + 1 auto-fix deviation
- **Files modified:** 5

## Accomplishments
- `advanceToNextStep()` now gates the Step 6→7 boundary: returns `{ paywallRequired, hasCredits, creditBalance }` for non-unlocked, non-grandfathered workshops without marking Step 6 complete or redirecting
- New `PaywallOverlay` client component renders when users navigate directly to Steps 7-10 on a locked workshop — shows credit balance, "Use 1 Credit to Unlock" or "Buy Credits" CTA, and "Back to Step 6" escape hatch
- `StepPage` Server Component now checks `creditConsumedAt` and `createdAt` for steps 7-10 before loading any chat messages or canvas data — prevents data leakage for locked workshops
- Auto-fixed build-breaking bug: `PAYWALL_CUTOFF_DATE` moved from `billing-actions.ts` (a `'use server'` file) to `lib/billing/paywall-config.ts` — Next.js prohibits non-async exports from server action files
- Full `next build` passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Step 6→7 credit gate to advanceToNextStep()** - `ebb1d20` (feat)
2. **Task 2: Create PaywallOverlay and add Server Component paywall check** - `d203578` (feat)
3. **Task 3: TypeScript compilation and end-to-end verification + deviation fix** - `1a41de1` (fix)

## Files Created/Modified
- `src/components/workshop/paywall-overlay.tsx` - New client component: lock UI, credit balance display, consumeCredit/router.refresh flow
- `src/lib/billing/paywall-config.ts` - New constants module: PAYWALL_CUTOFF_DATE (extracted from use server file)
- `src/actions/workshop-actions.ts` - Modified: advanceToNextStep() union return type, Step 6→7 credit gate, PAYWALL_CUTOFF_DATE import path updated
- `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` - Modified: paywall check block for steps 7-10, PaywallOverlay import, PAYWALL_CUTOFF_DATE import path updated
- `src/actions/billing-actions.ts` - Modified: PAYWALL_CUTOFF_DATE declaration removed (now imported from paywall-config)

## Decisions Made
- `PAYWALL_CUTOFF_DATE` moved to `lib/billing/paywall-config.ts` — Next.js `'use server'` files can only export async functions; the constant is a plain `Date` value. All consumers now import from the config module.
- `advanceToNextStep()` gate fires BEFORE `updateStepStatus()` — Step 6 stays `in_progress` when paywall triggers. Phase 51 UI will call `consumeCredit()` then `advanceToNextStep()` again; the second call passes through (workshop now has `creditConsumedAt` set).
- `PaywallOverlay` uses `router.refresh()` after successful `consumeCredit()` — triggers Server Component re-render in-place rather than redirect; the paywall check will now pass and render the step content.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved PAYWALL_CUTOFF_DATE to separate module — Next.js 'use server' violation**
- **Found during:** Task 3 (build verification)
- **Issue:** `billing-actions.ts` has `'use server'` directive and exported `PAYWALL_CUTOFF_DATE` as a `Date` constant. Next.js enforces that `'use server'` files may only export async functions. This caused build failure for all routes that transitively imported `billing-actions.ts` (including `/api/workshops/[workshopId]/complete`).
- **Fix:** Created `src/lib/billing/paywall-config.ts` as a plain (non-server-action) module holding the constant. Updated all three consumers (`billing-actions.ts`, `workshop-actions.ts`, `page.tsx`) to import from the config module.
- **Files modified:** `src/lib/billing/paywall-config.ts` (created), `src/actions/billing-actions.ts`, `src/actions/workshop-actions.ts`, `src/app/workshop/[sessionId]/step/[stepId]/page.tsx`
- **Verification:** `npx next build` passes with zero errors after fix
- **Committed in:** `1a41de1` (Task 3 fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug fix)
**Impact on plan:** Essential fix. The bug was latent in Plan 50-01 (billing-actions.ts was already a use server file exporting a constant) but only surfaced when Plan 50-02 added the import to workshop-actions.ts, which is consumed by route handlers. Moving to a config module is the correct pattern for shared constants in Next.js server action files.

## Issues Encountered
- None beyond the auto-fixed `'use server'` export constraint.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 50-02 complete: server-side paywall enforcement fully wired
- Phase 51 (Paywall UI) can build on `paywallRequired` return from `advanceToNextStep()` to show the confirmation dialog
- `PaywallOverlay` is fully functional for direct URL access — Phase 51 handles the inline dialog at Step 6
- Steps 1-6 are completely unaffected; no regressions

## Self-Check: PASSED

- FOUND: src/components/workshop/paywall-overlay.tsx
- FOUND: src/lib/billing/paywall-config.ts
- FOUND: .planning/phases/50-credit-actions-server-enforcement/50-02-SUMMARY.md
- FOUND commit: ebb1d20 (Task 1)
- FOUND commit: d203578 (Task 2)
- FOUND commit: 1a41de1 (Task 3)

---
*Phase: 50-credit-actions-server-enforcement*
*Completed: 2026-02-26*
