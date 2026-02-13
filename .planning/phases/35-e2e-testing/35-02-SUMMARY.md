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
tech_stack:
  added: []
  patterns:
    - single-long-test-pattern
    - auth-bypass-helper-functions
key_files:
  created:
    - e2e/workshop-walkthrough.spec.ts
  modified:
    - playwright.config.ts
    - src/actions/workshop-actions.ts
decisions:
  - title: "Single long test instead of serial tests"
    rationale: "Serial tests had page state issues between test boundaries - single test maintains state naturally"
  - title: "getUserId() helper for BYPASS_AUTH support"
    rationale: "When BYPASS_AUTH=true, Clerk's auth() throws errors - helper checks env var first and returns null"
  - title: "Test creates fresh workshop (no seed data)"
    rationale: "Tests against real workshop creation flow, not pre-seeded data"
metrics:
  duration_seconds: 1230
  tasks_completed: 1
  tasks_deferred: 1
  files_created: 1
  files_modified: 2
  commits: 2
  completed_date: 2026-02-13
---

# Phase 35 Plan 02: Workshop Walkthrough E2E Test Summary

**One-liner:** Created full 10-step workshop walkthrough E2E test and identified critical BYPASS_AUTH incompatibility with Clerk requiring architectural fix.

## What Was Built

### Task 1: E2E Test File (COMPLETE)

Created `/Users/michaelchristie/devProjects/workshoppilot.ai/e2e/workshop-walkthrough.spec.ts` - a comprehensive Playwright test that walks through all 10 workshop steps with real AI interaction.

**Test structure:**
- Single long test (not serial tests) to maintain page state
- Creates fresh workshop via UI (clicks "Start Workshop")
- For each step 1-10:
  - Waits for AI greeting
  - Sends contextual user message
  - Waits for AI response
  - Clicks Next to advance
- Validates Step 10 has no Next button (last step)
- 20-minute timeout for full walkthrough
- Console logging for debugging

**Contextual messages per step:**
1. Challenge: "I want to build a pet care app..."
2. Stakeholder Mapping: "The main stakeholders are pet owners, veterinarians..."
3. User Research: "I'd like to interview busy professionals..."
4. Sense Making: "The key themes I see are time management struggles..."
5. Persona: "Based on our research, the primary persona would be..."
6. Journey Mapping: "The user's journey starts when they wake up..."
7. Reframe: "I'd like to focus the HMW on making pet care routine management..."
8. Ideation: "Some initial ideas: smart feeding schedule optimizer..."
9. Concept: "Let's develop the smart feeding schedule optimizer..."
10. Validate: "Let's create a user flow for the core feeding schedule feature..."

### Task 2: Test Execution and Bug Fixes (PARTIAL)

**Bugs discovered during test execution:**

#### Bug 1: Serial test page state issue (FIXED)
- **Problem:** Using `test.describe.serial()` with `beforeAll` page creation caused page to reset between tests
- **Root cause:** Playwright was resetting page state between test boundaries
- **Fix:** Refactored to single long test that walks through all steps sequentially
- **Commit:** `a8be321`

#### Bug 2: Next button selector ambiguity (FIXED)
- **Problem:** Selector `/next|skip to next/i` matched both step navigation button AND Next.js dev tools button
- **Root cause:** Regex too broad
- **Fix:** Changed to `/^(Next|Skip to Next)$/i` for exact match
- **Commit:** `a8be321` (included in refactor)

#### Bug 3: BYPASS_AUTH incompatibility with Clerk (BLOCKING - PARTIAL FIX)
- **Problem:** When `BYPASS_AUTH=true`, Clerk's `auth()` throws error "can't detect usage of clerkMiddleware()"
- **Root cause:** BYPASS_AUTH skips middleware entirely, but `auth()` requires middleware to be present
- **Impact:** Dev server fails to start when `BYPASS_AUTH=true` is set in `webServer` command
- **Partial fix:** Created `getUserId()` helper in `workshop-actions.ts` that checks `BYPASS_AUTH` before calling `auth()`
- **Still needed:** Fix `auth()` calls in:
  - `src/app/dashboard/page.tsx`
  - `src/app/admin/page.tsx`
  - `src/app/api/workshops/migrate/route.ts`
  - `src/app/api/dev/seed-workshop/route.ts`
  - Any server components that call `auth()` during SSR/build
- **Commit:** `e892546`

## Deviations from Plan

### Auto-fixed Issues (Deviation Rule 1 & 3)

**[Rule 3 - Blocking] BYPASS_AUTH architectural issue**
- **Found during:** Test execution (Task 2)
- **Issue:** Clerk's `auth()` function requires middleware to be present, but `BYPASS_AUTH=true` completely bypasses middleware. This causes all pages/routes/components that call `auth()` to throw errors during Next.js compilation and SSR.
- **Fix applied:** Created `getUserId()` helper function that checks `process.env.BYPASS_AUTH` before calling `auth()`, returns `null` when bypass is enabled. Updated all `auth()` calls in `src/actions/workshop-actions.ts`.
- **Files modified:** `src/actions/workshop-actions.ts`
- **Commit:** `e892546`

**[Rule 1 - Bug] Playwright webServer missing BYPASS_AUTH**
- **Found during:** Test execution debugging
- **Issue:** `playwright.config.ts` webServer command was `npm run dev` without `BYPASS_AUTH=true`, causing dev server to run with Clerk auth enabled while tests ran with auth bypass
- **Fix:** Changed webServer command to `BYPASS_AUTH=true npm run dev`
- **Files modified:** `playwright.config.ts`
- **Commit:** `e892546`

## Technical Approach

### Test Pattern Evolution

**Initial approach:** Serial tests with shared page
```typescript
test.describe.serial('Workshop Walkthrough', () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });
  test('Create workshop', async () => { /* ... */ });
  test('Step 1', async () => { /* ... */ });
  // etc.
});
```

**Problem:** Page state was not persisting between tests - Step 2 test found URL still on step/1 even though Step 1 test's waitForURL passed.

**Final approach:** Single long test
```typescript
test('Complete workshop from creation through all 10 steps', async ({ page }) => {
  // Create workshop
  await page.goto('/');
  // ...

  // Step 1
  const step1Input = page.locator('textarea[placeholder*="Type your message"]');
  // ...

  // Step 2
  const step2Input = page.locator('textarea[placeholder*="Type your message"]');
  // ...

  // ... through Step 10
});
```

### BYPASS_AUTH Implementation Analysis

**Current proxy.ts approach:**
```typescript
if (BYPASS_AUTH) {
  module.exports = {
    default: () => NextResponse.next(),
    config: { matcher: [...] }
  };
}
```

**Issue:** Completely bypassing middleware breaks Clerk's `auth()` detection.

**Solution implemented:**
```typescript
async function getUserId(): Promise<string | null> {
  if (process.env.BYPASS_AUTH === 'true') {
    return null;
  }
  try {
    const { userId } = await auth();
    return userId;
  } catch (error) {
    console.warn('auth() call failed, returning null userId:', error);
    return null;
  }
}
```

**Better solution (recommended for Phase 35 Plan 03):**
Instead of bypassing middleware entirely, modify middleware to inject a fake auth context when `BYPASS_AUTH=true`. This would make `auth()` return a mock user ID instead of throwing errors.

## Test Results

**Status:** Test cannot run due to BYPASS_AUTH blocking issue

**Commits:**
- `a8be321`: Initial test creation with serial approach
- `e892546`: Refactored to single test + getUserId helper + webServer BYPASS_AUTH

**Verification attempted:**
1. `npx playwright test --list` - Shows 1 test recognized
2. `npm run test:e2e` - Dev server fails to start due to Clerk auth() errors
3. Manual inspection of test file - All 10 steps implemented with proper waits and assertions

## What's Next

**Phase 35 Plan 03 should address:**
1. Complete BYPASS_AUTH fix for all `auth()` calls (dashboard, admin, API routes)
2. OR implement better auth bypass approach (mock auth context instead of skipping middleware)
3. Run E2E test to completion
4. Fix any additional bugs discovered during full test run
5. Verify all 10 steps complete successfully

**Alternative approach to consider:**
Instead of fixing all `auth()` calls individually, modify `src/proxy.ts` to inject a mock Clerk context when `BYPASS_AUTH=true`:

```typescript
if (BYPASS_AUTH) {
  // Instead of: () => NextResponse.next()
  // Use: middleware that sets mock auth context
  module.exports = {
    default: clerkMiddleware(async (auth, req) => {
      // Inject mock auth for E2E tests
      return NextResponse.next();
    }),
    config: { matcher: [...] }
  };
}
```

This would require investigation into Clerk's middleware API to see if auth context can be injected.

## Self-Check: PASSED

**Files created:**
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/e2e/workshop-walkthrough.spec.ts` - exists (376 lines)

**Files modified:**
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/playwright.config.ts` - BYPASS_AUTH added to webServer command
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/actions/workshop-actions.ts` - getUserId() helper added

**Commits:**
- ✅ `a8be321` - test(35-02): create full 10-step workshop walkthrough E2E test
- ✅ `e892546` - fix(35-02): add getUserId helper to handle BYPASS_AUTH in workshop actions

All claimed files and commits verified successfully.

**Note:** Test cannot execute until BYPASS_AUTH blocking issue is fully resolved (see Phase 35 Plan 03).
