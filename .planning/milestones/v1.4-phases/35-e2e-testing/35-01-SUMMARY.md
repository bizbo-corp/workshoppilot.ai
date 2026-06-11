---
phase: 35-e2e-testing
plan: 01
subsystem: testing-infrastructure
tags:
  - playwright
  - e2e
  - test-setup
  - auth-bypass
dependency_graph:
  requires: []
  provides:
    - playwright-config
    - e2e-helpers
    - auth-bypass-mechanism
  affects:
    - test-execution
tech_stack:
  added:
    - "@playwright/test": "^1.58.2"
    - chromium-browser
  patterns:
    - auth-bypass-via-env-var
    - ui-interaction-helpers
key_files:
  created:
    - playwright.config.ts
    - e2e/helpers/auth-bypass.ts
    - e2e/helpers/workshop-factory.ts
  modified:
    - src/proxy.ts
    - package.json
    - .gitignore
decisions:
  - title: "Desktop-only Chromium for Phase 35"
    rationale: "E2E tests only need desktop Chrome browser for this phase - multi-browser testing deferred"
  - title: "Sequential test execution (no fullyParallel)"
    rationale: "Tests share a real database, parallel execution would cause race conditions"
  - title: "BYPASS_AUTH env var for auth bypass"
    rationale: "Clean separation of test mode from production code, no Clerk API keys needed in CI"
  - title: "2-minute test timeout"
    rationale: "AI responses with real Gemini can be slow, especially on cold starts"
  - title: "Module.exports pattern for conditional middleware"
    rationale: "Next.js middleware requires CommonJS default export, conditional export based on BYPASS_AUTH"
metrics:
  duration_seconds: 223
  tasks_completed: 2
  files_created: 3
  files_modified: 3
  commits: 2
  completed_date: 2026-02-13
---

# Phase 35 Plan 01: Playwright Setup & Auth Bypass Summary

**One-liner:** Playwright configured for desktop E2E testing with BYPASS_AUTH env var skipping Clerk middleware for test access.

## What Was Built

Installed and configured Playwright for E2E testing against the local dev server with an auth bypass mechanism that allows tests to access protected routes (steps 4-10, dashboard) without Clerk authentication.

### Components Delivered

1. **Playwright Configuration** (`playwright.config.ts`)
   - Desktop Chromium-only test execution
   - Sequential test runs (no parallel) due to shared database
   - 2-minute test timeout for AI-powered flows
   - 30-second assertion timeout for streaming responses
   - Auto-start dev server on `http://localhost:3000`
   - Trace/screenshot/video capture on failure

2. **Auth Bypass Mechanism** (`src/proxy.ts`)
   - `BYPASS_AUTH` env var check at middleware level
   - When `true`, exports passthrough middleware instead of `clerkMiddleware`
   - Maintains same route matcher configuration
   - Works with `createWorkshopSession` action (falls back to `clerkUserId='anonymous'`)

3. **Workshop Factory Helpers** (`e2e/helpers/workshop-factory.ts`)
   - `createWorkshopViaUI()`: Clicks "Start Workshop" button, extracts sessionId from URL
   - `waitForAIGreeting()`: Waits for first AI message (60s timeout for cold starts)
   - `sendMessage()`: Types message, presses Enter, waits for AI response
   - `waitForAIResponse()`: Waits for new AI message by count
   - `clickNextStep()`: Clicks Next button, waits for URL change
   - `getAssistantMessageCount()`: Returns count of AI messages
   - `hasAssistantMessageWithText()`: Checks if AI response contains text

4. **NPM Scripts** (`package.json`)
   - `test:e2e`: Run Playwright tests with `BYPASS_AUTH=true`
   - `test:e2e:headed`: Run tests in headed mode (browser visible)
   - `test:e2e:debug`: Run tests in debug mode with Playwright Inspector

5. **Documentation** (`e2e/helpers/auth-bypass.ts`)
   - Explains auth bypass approach and usage
   - Documents that server actions gracefully handle missing auth

## Deviations from Plan

None - plan executed exactly as written.

## Technical Approach

### Auth Bypass Strategy

The plan specified modifying `src/proxy.ts` to conditionally bypass Clerk middleware. Implementation uses a dual-export pattern:

```typescript
const BYPASS_AUTH = process.env.BYPASS_AUTH === 'true';

if (BYPASS_AUTH) {
  module.exports = {
    default: () => NextResponse.next(),
    config: { matcher: [...] }
  };
} else {
  module.exports = {
    default: clerkMiddleware(...),
    config: { matcher: [...] }
  };
}
```

This approach completely skips Clerk's `auth()` calls when `BYPASS_AUTH=true`, eliminating the need for Clerk API keys during E2E testing.

### Workshop Factory Selectors

All selectors in `workshop-factory.ts` are based on actual component structure:

- **Start button**: `getByRole('button', { name: /start workshop/i })` - matches "Start Workshop" text
- **Chat input**: `textarea[placeholder*="Type your message"]` - unique textarea in chat panel
- **AI messages**: `.prose` class - wraps AI response markdown content
- **Next button**: `getByRole('button', { name: /next/i })` - matches "Next" or "Skip to Next" text
- **AI thinking indicator**: `text=AI is thinking...` - shown during streaming

### Test Timeout Rationale

- **Test timeout: 120s** - Gemini API responses can be slow, especially:
  - Cold starts (5-10s for first token)
  - Long responses (20-30s for streaming completion)
  - Rate limit retries (automatic backoff)
- **Assertion timeout: 30s** - Individual assertions should complete faster, but streaming responses need buffer time
- **AI greeting timeout: 60s** - First message has highest latency (cold start + auto-trigger)

## Verification Results

All verification steps passed:

1. `npx playwright --version` → `Version 1.58.2`
2. `cat playwright.config.ts` → Exists with correct testDir and baseURL
3. `grep "test:e2e" package.json` → Shows new npm scripts
4. `grep "BYPASS_AUTH" src/proxy.ts` → Confirms conditional bypass logic
5. `ls e2e/helpers/` → Shows `auth-bypass.ts` and `workshop-factory.ts`
6. `npm run test:e2e -- --list` → No errors (0 tests found as expected for Plan 01)

## What's Next

Plan 02 will create the actual E2E test files that consume these helpers:
- Happy path test (create workshop → navigate steps 1-10)
- Chat interaction test (send messages, verify AI responses)
- Canvas integration test (add post-its, verify persistence)

## Self-Check: PASSED

**Files created:**
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/playwright.config.ts` - exists
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/e2e/helpers/auth-bypass.ts` - exists
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/e2e/helpers/workshop-factory.ts` - exists

**Files modified:**
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/src/proxy.ts` - BYPASS_AUTH logic added
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/package.json` - test:e2e scripts added
- ✅ `/Users/michaelchristie/devProjects/workshoppilot.ai/.gitignore` - Playwright artifacts added

**Commits:**
- ✅ `537dca9` - chore(35-01): install and configure Playwright for E2E testing
- ✅ `94d57fe` - feat(35-01): implement auth bypass and workshop factory helpers

All claimed files and commits verified successfully.
