---
status: resolved
trigger: "/api/guest-join returns 500 Internal Server Error when guest submits name"
created: 2026-02-27T00:00:00Z
updated: 2026-02-27T00:00:00Z
---

## Current Focus

hypothesis: GUEST_COOKIE_SECRET env var is missing, causing signGuestCookie to crash with undefined secret
test: Searched all .env files for GUEST_COOKIE_SECRET
expecting: Variable not found in any .env file
next_action: Report root cause

## Symptoms

expected: POST /api/guest-join returns 200 with participant data and sets guest cookie
actual: POST /api/guest-join returns 500 Internal Server Error
errors: "POST http://localhost:3000/api/guest-join 500 (Internal Server Error)" in browser console
reproduction: Navigate to /join/[token], enter name, click "Join Workshop"
started: First time testing this endpoint (phase 57 UAT)

## Eliminated

(none needed - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-27T00:00:00Z
  checked: guest-cookie.ts line 17
  found: `const SECRET = process.env.GUEST_COOKIE_SECRET!;` - reads env var at module load time
  implication: If GUEST_COOKIE_SECRET is not set, SECRET is undefined

- timestamp: 2026-02-27T00:00:00Z
  checked: .env.local and .env.development.local for GUEST_COOKIE_SECRET
  found: Neither file contains GUEST_COOKIE_SECRET
  implication: SECRET is undefined; createHmac('sha256', undefined) throws TypeError at runtime

- timestamp: 2026-02-27T00:00:00Z
  checked: All project files referencing GUEST_COOKIE_SECRET
  found: Only guest-cookie.ts and planning docs reference it. No .env.example or .env file has it.
  implication: The env var was never added to .env.local after the code was written

- timestamp: 2026-02-27T00:00:00Z
  checked: route.ts line 103 - signGuestCookie call
  found: signGuestCookie calls createHmac('sha256', SECRET) where SECRET is undefined
  implication: This is the exact crash point - Node crypto.createHmac throws when key is undefined

- timestamp: 2026-02-27T00:00:00Z
  checked: DB schema (session-participants.ts) vs route.ts insert
  found: Schema and insert match perfectly - all required fields provided, types align
  implication: DB insert is NOT the issue

- timestamp: 2026-02-27T00:00:00Z
  checked: Migration 0009 for session_participants table
  found: Table creation SQL matches schema definition exactly
  implication: DB table exists and schema is correct

## Resolution

root_cause: GUEST_COOKIE_SECRET environment variable is missing from .env.local. The guest-cookie.ts module reads `process.env.GUEST_COOKIE_SECRET` at line 17 (module load time), which evaluates to `undefined`. When the route handler reaches line 103 and calls `signGuestCookie()`, `createHmac('sha256', undefined)` throws a TypeError, causing the unhandled 500.
fix: Add GUEST_COOKIE_SECRET=<random-32-byte-hex> to .env.local
verification: N/A (diagnosis only)
files_changed: []
