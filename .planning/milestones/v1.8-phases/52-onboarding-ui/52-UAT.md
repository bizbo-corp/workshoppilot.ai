---
status: diagnosed
phase: 52-onboarding-ui
source: [52-01-SUMMARY.md]
started: 2026-02-26T03:00:00Z
updated: 2026-02-26T03:12:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Welcome modal appears for first-time user
expected: Navigate to the dashboard as a new user (or one with onboardingComplete=false). A welcome modal should appear centered on screen with a Sparkles icon in an olive circle at the top, titled "Welcome to WorkshopPilot".
result: pass

### 2. Modal shows three key feature areas
expected: The modal displays three feature rows with icons — AI Chat (message icon), Canvas (grid icon), and Steps (checklist icon). Each row has an olive-tinted icon container and descriptive text.
result: issue
reported: "Console Error — We are cleaning up async info that was not on the parent Suspense boundary. This is a bug in React. This error is going on."
severity: major

### 3. Taste-test model explanation visible
expected: Below the three feature areas, the modal shows a note about the free tier: "Steps 1-6 are free — experience the full workshop flow before deciding to unlock your Build Pack."
result: pass

### 4. Get Started button dismisses modal
expected: Clicking the "Get Started" button closes the modal immediately. The modal disappears without any delay or flash.
result: pass

### 5. Modal does not reappear after refresh
expected: After dismissing the modal, refresh the page (Cmd+R / F5). The welcome modal should NOT reappear — the dismiss state is persisted to the database.
result: pass

### 6. Existing user does not see modal
expected: Sign in as a user who has previously dismissed the modal (onboardingComplete=true). The dashboard loads normally with no welcome modal visible.
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "The modal displays three feature rows with icons without console errors"
  status: failed
  reason: "User reported: Console Error — We are cleaning up async info that was not on the parent Suspense boundary. This is a bug in React. This error is going on."
  severity: major
  test: 2
  root_cause: "@radix-ui/react-id v1.1.1 calls setState inside useLayoutEffect (legacy React 16/17 shim). React 19 tracks async work and expects a Suspense boundary to park it. WelcomeModal opens immediately on mount (useState(true)), triggering Radix Presence/useId useLayoutEffect+setState during hydration with no client-side Suspense boundary."
  artifacts:
    - path: "src/components/dashboard/welcome-modal.tsx"
      issue: "Dialog open=true on first render triggers Radix useLayoutEffect+setState during hydration"
    - path: "src/app/dashboard/page.tsx"
      issue: "No Suspense boundary wrapping WelcomeModal"
  missing:
    - "Defer open state with useEffect to avoid hydration-time Radix useLayoutEffect trigger"
    - "Add Suspense fallback={null} wrapper around WelcomeModal in dashboard page"
  debug_session: ""
