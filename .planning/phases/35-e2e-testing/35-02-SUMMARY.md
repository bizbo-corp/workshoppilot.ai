---
phase: 35-e2e-testing
plan: 02
subsystem: testing-e2e-tests
tags:
  - playwright
  - e2e
  - integration-test
  - auth-bypass
dependency_graph:
  requires:
    - playwright-config
    - e2e-helpers
    - auth-bypass-mechanism
  provides:
    - workshop-walkthrough-test
  affects:
    - dev-workflow
    - step-navigation
tech_stack:
  added: []
  patterns:
    - single-long-test-pattern
    - server-action-redirect-pattern
key_files:
  created:
    - e2e/workshop-walkthrough.spec.ts
  modified:
    - playwright.config.ts
    - src/actions/workshop-actions.ts
    - src/proxy.ts
    - src/components/workshop/step-navigation.tsx
    - src/components/canvas/react-flow-canvas.tsx
decisions:
  - title: "Single long test instead of serial tests"
    rationale: "Serial tests had page state issues between test boundaries - single test maintains state naturally"
  - title: "Always use clerkMiddleware even with BYPASS_AUTH"
    rationale: "Bypassing middleware entirely broke auth() in server components. Keeping clerkMiddleware running but skipping route protection lets auth() return {userId: null} properly"
  - title: "Server action redirect instead of router.push"
    rationale: "router.push after server action with revalidatePath doesn't work in Next.js App Router due to transition batching. redirect() from server action is the idiomatic pattern"
  - title: "Evaluate clicks for test reliability"
    rationale: "el.click() via evaluate bypasses overlay issues from React Flow watermark"
  - title: "Test creates fresh workshop (no seed data)"
    rationale: "Tests against real workshop creation flow, not pre-seeded data"
metrics:
  duration_seconds: 96
  tasks_completed: 2
  tasks_deferred: 0
  files_created: 1
  files_modified: 5
  commits: 4
  completed_date: 2026-02-13
---

# Phase 35 Plan 02: Workshop Walkthrough E2E Test Summary

**One-liner:** Full 10-step workshop walkthrough E2E test passes with real AI — all steps create, interact, and navigate correctly.

## What Was Built

### Task 1: E2E Test File (COMPLETE)

Created `e2e/workshop-walkthrough.spec.ts` — a comprehensive Playwright test that walks through all 10 workshop steps with real Gemini AI interaction.

**Test structure:**
- Single long test maintaining page state across all steps
- Creates fresh workshop via UI (clicks "Start Workshop")
- For each step 1-10: waits for AI greeting → sends contextual message → waits for AI response → clicks Next
- Validates Step 10 has no Next button (last step)
- 20-minute timeout, 1.6 minute actual execution time

### Task 2: Test Execution and Bug Fixes (COMPLETE)

**5 bugs discovered and fixed during test execution:**

#### Bug 1: BYPASS_AUTH broke Clerk auth() (FIXED)
- **Problem:** Original approach used `() => NextResponse.next()` middleware which broke `auth()` context
- **Fix:** Always use `clerkMiddleware` wrapper, just skip route protection when BYPASS_AUTH=true
- **Files:** `src/proxy.ts`

#### Bug 2: Recursive getUserId() (FIXED)
- **Problem:** `getUserId()` called itself instead of `auth()` (infinite recursion)
- **Fix:** Simplified to `const { userId } = await auth()`
- **Files:** `src/actions/workshop-actions.ts`

#### Bug 3: router.push after server action doesn't work (FIXED)
- **Problem:** `revalidatePath` in server action interfered with `router.push` navigation
- **Fix:** Use `redirect()` from server action instead (idiomatic Next.js pattern)
- **Files:** `src/actions/workshop-actions.ts`, `src/components/workshop/step-navigation.tsx`

#### Bug 4: React Flow watermark overlapping UI (FIXED)
- **Problem:** React Flow attribution badge at bottom-right could interfere with navigation
- **Fix:** Added `proOptions={{ hideAttribution: true }}`
- **Files:** `src/components/canvas/react-flow-canvas.tsx`

#### Bug 5: Step 8 multiple textareas (FIXED)
- **Problem:** Step 8 has sub-step tabs with 3 textareas, causing strict mode violation
- **Fix:** Use `.first()` to target the active sub-step's textarea
- **Files:** `e2e/workshop-walkthrough.spec.ts`

## Test Results

**Status: ALL 10 STEPS PASS**

```
✓ Workshop Walkthrough > Complete workshop from creation through all 10 steps (1.6m)
1 passed (1.6m)
```

**Per-step flow verified:**
- Step 1-7: Standard flow (greeting → message → response → navigate)
- Step 8: Sub-step handling (Mind Mapping tab → send message → navigate)
- Step 9-10: Standard flow, Step 10 confirms no Next button

**Network pattern per step:**
- POST to current step → 303 redirect → POST to next step → 200 OK

## Commits

- `a8be321`: test(35-02): create full 10-step workshop walkthrough E2E test
- `e892546`: fix(35-02): add getUserId helper to handle BYPASS_AUTH in workshop actions
- `8c06e9f`: docs(35-02): complete phase plan summary with BYPASS_AUTH blocker documented
- `4af2d0e`: fix(35-02): resolve auth bypass, step navigation, and test reliability issues

## Self-Check: PASSED

**Files created:**
- ✅ `e2e/workshop-walkthrough.spec.ts` — exists, all 10 steps

**Files modified:**
- ✅ `src/proxy.ts` — clean clerkMiddleware with BYPASS_AUTH passthrough
- ✅ `src/actions/workshop-actions.ts` — getUserId fixed, redirect-based advance
- ✅ `src/components/workshop/step-navigation.tsx` — removed router.push
- ✅ `src/components/canvas/react-flow-canvas.tsx` — hidden attribution
- ✅ `playwright.config.ts` — BYPASS_AUTH in webServer command

**Test passes:** `npm run test:e2e` → 1 passed (1.6m)
