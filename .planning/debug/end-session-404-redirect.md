---
status: diagnosed
trigger: "After facilitator ends a multiplayer workshop session, redirect to /dashboard/workshops/ws_... returns 404"
created: 2026-02-28T13:00:00Z
updated: 2026-02-28T13:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - redirect URL /dashboard/workshops/{workshopId} points to a route that does not exist
test: Checked src/app directory structure for matching Next.js route
expecting: A page.tsx under src/app/dashboard/workshops/[workshopId]/ -- none found
next_action: Return diagnosis

## Symptoms

expected: After ending a multiplayer session, the facilitator is redirected to a workshop detail page
actual: Facilitator is redirected to /dashboard/workshops/ws_uh7kngj3djqjkjortkyit46n which returns 404
errors: 404 page not found
reproduction: End a multiplayer workshop session as facilitator
started: Phase 58 (facilitator-controls)

## Eliminated

(none needed -- root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-28T13:00:00Z
  checked: src/app directory structure (all route directories)
  found: No /dashboard/workshops/ directory exists. Dashboard is a flat page at src/app/dashboard/page.tsx with no sub-routes. Workshop detail pages live at src/app/workshop/[sessionId]/ (note: uses sessionId, NOT workshopId).
  implication: The redirect URL /dashboard/workshops/${workshopId} is a non-existent route

- timestamp: 2026-02-28T13:00:00Z
  checked: facilitator-controls.tsx line 181
  found: router.push(`/dashboard/workshops/${workshopId}`) -- uses workshopId and a non-existent route
  implication: This is the primary 404 source for the facilitator

- timestamp: 2026-02-28T13:00:00Z
  checked: session-ended-overlay.tsx line 48
  found: router.push(`/dashboard/workshops/${workshopId}`) -- same broken URL for participants
  implication: Both facilitator AND participant redirects are broken

- timestamp: 2026-02-28T13:00:00Z
  checked: Dashboard page (src/app/dashboard/page.tsx) link patterns
  found: All links use /workshop/${sessionId}/step/${stepNum} or /workshop/${sessionId}/outputs -- session-based routing, never workshop-ID-based routing
  implication: The app consistently uses sessionId for workshop routes, not workshopId. The redirect should either go to /dashboard (flat listing) or to /workshop/${sessionId}/... if a detail page is desired.

## Resolution

root_cause: Both facilitator-controls.tsx (line 181) and session-ended-overlay.tsx (line 48) redirect to `/dashboard/workshops/${workshopId}` -- a route that does not exist in the Next.js app. The app has no `/dashboard/workshops/` sub-routes at all. The dashboard is a flat page at `/dashboard` and workshop pages use `/workshop/[sessionId]/...` with session IDs, not workshop IDs.
fix: (not applied -- diagnosis only)
verification: (not applied)
files_changed: []
