---
status: diagnosed
phase: 57-guest-auth-and-join-flow
source: 57-01-SUMMARY.md, 57-02-SUMMARY.md
started: 2026-02-27T11:00:00Z
updated: 2026-02-28T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Share Link Copy
expected: On a multiplayer workshop, the WorkshopHeader shows a Share button (Share2 icon). Clicking it copies the /join/[token] URL to clipboard and shows a sonner toast confirming the link was copied. The icon briefly changes to a Check icon.
result: pass

### 2. Join Page with Valid Token
expected: Navigating to the copied /join/[token] URL (in an incognito/different browser) shows a full-screen overlay modal with dark backdrop (bg-black/60 + backdrop-blur). The modal displays the workshop title, facilitator name, a name input field, and a "Join Workshop" button.
result: pass

### 3. Guest Name Entry and Join
expected: Entering a name (2-30 characters) and clicking "Join Workshop" shows a loading spinner on the button. After submission succeeds, the modal closes and you enter the guest lobby. Submitting with fewer than 2 characters should be prevented.
result: pass
note: Fixed during UAT — GUEST_COOKIE_SECRET was missing from .env.local (malformed newline). Also hardened guest-cookie.ts with runtime guard.

### 4. Guest Lobby Display
expected: After joining, the guest sees a lobby view with: the workshop title, a "Waiting for facilitator" status message, a participant list showing their name with a colored avatar circle and a "You" badge, and a subtle pulse/bounce animation.
result: pass
note: Works after env var fix. Guest sees lobby correctly.

### 5. Lobby Participant List Updates
expected: When another participant joins (open another incognito tab with the same link), the lobby's participant list updates within ~3 seconds to show the new participant with their own color avatar.
result: skipped
reason: not retested after env var fix

### 6. Auto-Transition to Canvas
expected: When the facilitator starts the workshop (status becomes active), the lobby fades out (opacity transition over ~500ms) and the guest is automatically redirected to the workshop canvas page.
result: issue
reported: "Session status never transitions from 'waiting' to 'active'. No code exists to activate the session. Guest is stuck in lobby permanently."
severity: blocker

### 7. Auto-Rejoin on Page Refresh
expected: While in the lobby, refreshing the /join/[token] page automatically re-joins without showing the name entry modal again. The guest returns directly to the lobby with their previous name.
result: skipped
reason: not retested after env var fix

### 8. Late Joiner Redirect
expected: If a guest opens the join link after the workshop is already active, they see a brief "Workshop in progress..." message for ~2 seconds, then are automatically redirected to the canvas.
result: skipped
reason: blocked by test 6 — session can never become active

## Summary

total: 8
passed: 4
issues: 1
pending: 0
skipped: 3

## Gaps

- truth: "When facilitator starts the workshop, session transitions to active and guests auto-transition from lobby to canvas"
  status: failed
  reason: "User reported: Session status never transitions from 'waiting' to 'active'. No API endpoint or UI exists to activate the session. workshopSessions.status stays 'waiting' forever."
  severity: blocker
  test: 6
  root_cause: "No code exists anywhere to update workshopSessions.status from 'waiting' to 'active'. Session is created with status:'waiting' in workshop-actions.ts:108 but no activation mechanism was implemented. The guest lobby polls for active status that never comes."
  artifacts:
    - path: "src/actions/workshop-actions.ts"
      issue: "Creates session with status:'waiting' but no activation path"
    - path: "src/components/layout/workshop-header.tsx"
      issue: "Has Share button but no Start Session control"
    - path: "src/app/api/session-status/[token]/route.ts"
      issue: "Returns status correctly but status is always 'waiting'"
  missing:
    - "API endpoint or server action to transition workshopSessions.status from 'waiting' to 'active' (and set startedAt)"
    - "Either auto-activate when facilitator loads the workshop, or a manual 'Start Session' button in WorkshopHeader"
  debug_session: ""
