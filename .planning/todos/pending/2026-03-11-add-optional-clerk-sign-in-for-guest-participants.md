---
created: 2026-03-11T21:45:55.330Z
title: Add optional Clerk sign-in for guest participants
area: auth
files:
  - src/app/api/guest-join/route.ts
  - src/lib/auth/guest-cookie.ts
  - src/app/join/[token]/guest-join-flow.tsx
---

## Problem

Guest participants currently rely solely on an HttpOnly cookie (`wp_guest`) for identity. This cookie is browser-scoped and expires after 8 hours, meaning:
- Guests lose their identity when switching devices or browsers
- Guests cannot rejoin as the same participant from a different device
- There is no persistent cross-session identity for returning participants

## Solution

Add an optional Clerk sign-in flow for guest participants who want persistent cross-device identity:
- On the guest join page, offer a "Sign in for persistent identity" option alongside the current name-only flow
- If a guest signs in via Clerk, link their `clerkUserId` to the `sessionParticipants` record (currently always `null` for guests)
- On rejoin, check `clerkUserId` match in addition to cookie match for deduplication
- Existing cookie-only flow remains the default — Clerk sign-in is purely optional
- Consider UX: keep the join friction low, sign-in should be a secondary option not a gate
