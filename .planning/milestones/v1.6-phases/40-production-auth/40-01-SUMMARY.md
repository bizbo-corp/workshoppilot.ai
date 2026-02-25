---
phase: 40-production-auth
plan: 01
subsystem: auth
tags: [clerk, nextjs, sonner, toast, modal, middleware]

# Dependency graph
requires: []
provides:
  - Olive-themed Clerk SignIn modal overlay (ghost sign-in button, no separate sign-up entry)
  - ClerkProvider appearance config with olive color variables (#6b7a2f primary)
  - MutationObserver-based Clerk error → sonner toast surfacing
  - AuthGuard client component for protected pages (shows sign-in modal in-place)
  - Proxy middleware change: protected page routes pass through, API routes return 401
  - Dashboard page: returns DashboardUnauthenticated instead of redirecting when !userId
affects: [40-02-production-auth, future auth, workshop-pages, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Clerk appearance variables on ClerkProvider for global olive theming
    - MutationObserver pattern for intercepting Clerk inline errors as toasts
    - AuthGuard client component pattern for in-place modal on protected pages
    - Middleware pass-through for page routes (vs 401 for API routes)

key-files:
  created:
    - src/components/auth/auth-guard.tsx
    - src/components/dashboard/dashboard-unauthenticated.tsx
  modified:
    - src/app/layout.tsx
    - src/components/layout/landing-header.tsx
    - src/components/layout/header.tsx
    - src/components/auth/sign-in-modal.tsx
    - src/components/auth/sign-up-modal.tsx
    - src/components/auth/auth-wall-modal.tsx
    - src/proxy.ts
    - src/app/dashboard/page.tsx
    - src/components/layout/workshop-header.tsx

key-decisions:
  - "Sign in button uses ghost/subtle style (no background, no border) to blend with header"
  - "Single entry point: one Sign in button opens Clerk SignIn modal which has built-in sign-up link"
  - "Clerk errors surfaced as sonner toasts via MutationObserver watching .cl-formFieldErrorText/.cl-alert__text"
  - "Protected page routes pass through middleware (NextResponse.next()), API routes return 401"
  - "AuthGuard is a client component that shows SignInModal when !isSignedIn — no redirect needed"
  - "auth-wall-modal right column changed from SignUp to SignIn for unified single flow"

patterns-established:
  - "AuthGuard pattern: useAuth() hook, loading skeleton, SignInModal open={true} when !isSignedIn"
  - "MutationObserver pattern: watch Clerk form container, dedup errors with seen Set + timeout"
  - "ClerkProvider appearance: set global olive variables once in layout.tsx, not per-component"

requirements-completed: [AUTH-01, AUTH-02, AUTH-04]

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 40 Plan 01: Production Auth — Sign-in & Olive Theme Summary

**Clerk modal auth with olive theme, single sign-in entry point, sonner toast errors, and in-place AuthGuard for protected pages instead of redirect**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T04:06:40Z
- **Completed:** 2026-02-25T04:10:44Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Single ghost-styled "Sign in" button in all headers opens unified Clerk SignIn modal (Clerk handles sign-in/sign-up toggle internally — no separate sign-up button)
- ClerkProvider in `layout.tsx` applies olive appearance variables globally (colorPrimary: #6b7a2f, card/input/text tokens wired to CSS variables)
- MutationObserver watches Clerk form container for `.cl-formFieldErrorText` and `.cl-alert__text` changes, fires `toast.error()` via sonner while keeping inline Clerk errors `sr-only`
- AuthGuard client component renders SignInModal when `!isSignedIn`, loading skeleton while Clerk hydrates — protected pages show auth modal in-place (no redirect to `/`)
- Middleware updated to pass protected page routes through (AuthGuard handles UI) and return 401 for unauthenticated API routes
- Dashboard page returns `<DashboardUnauthenticated>` when server-side `!userId` instead of `redirect('/')`

## Task Commits

1. **Task 1: Restyle sign-in entry points and configure Clerk olive appearance** - `cb5e2b4` (feat)
2. **Task 2: Rebuild sign-in modal as unified olive-themed Clerk overlay with toast errors** - `909f6e8` (feat)

## Files Created/Modified

- `src/app/layout.tsx` - Added Clerk appearance prop with olive color variables to ClerkProvider
- `src/components/layout/landing-header.tsx` - Ghost Sign in button, Dashboard link + UserButton when signed in, removed sign-up split
- `src/components/layout/header.tsx` - Ghost Sign in button, Dashboard link + UserButton when signed in, removed SignUpModal
- `src/components/auth/sign-in-modal.tsx` - Rebuilt: lucide X icon, backdrop-blur, rounded-xl, MutationObserver for toast errors, sr-only inline errors, removed onSwitchToSignUp prop
- `src/components/auth/sign-up-modal.tsx` - Updated: lucide X icon, backdrop-blur, rounded-xl, removed onSwitchToSignIn prop
- `src/components/auth/auth-wall-modal.tsx` - Right column uses SignIn instead of SignUp, lucide X icon, rounded-xl, backdrop-blur
- `src/components/auth/auth-guard.tsx` (new) - Client component: loading skeleton while !isLoaded, SignInModal when !isSignedIn
- `src/components/dashboard/dashboard-unauthenticated.tsx` (new) - Server component renders AuthGuard for unauthenticated dashboard visits
- `src/proxy.ts` - Protected page routes: NextResponse.next() (pass through); API routes: 401 JSON
- `src/app/dashboard/page.tsx` - Returns DashboardUnauthenticated when !userId (replaces redirect('/'))
- `src/components/layout/workshop-header.tsx` - Removed onSwitchToSignUp prop from SignInModal call (Rule 3 fix)

## Decisions Made

- Ghost-style sign-in button (no background, no border) blends into header — matches "not high-contrast" user decision
- Single `<SignIn>` Clerk component handles both sign-in and sign-up flows (Clerk built-in "Don't have an account? Sign up" link)
- MutationObserver approach for toast errors: uses `sr-only` on Clerk's inline errors so they're accessible but invisible, observer reads textContent and fires `toast.error()`
- `DashboardUnauthenticated` is a separate server-renderable client component rather than inline JSX in the server page, keeping the server component clean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed onSwitchToSignUp prop from workshop-header.tsx**
- **Found during:** Task 2 (Rebuild sign-in modal)
- **Issue:** `workshop-header.tsx` was still passing `onSwitchToSignUp` prop to `<SignInModal>` after that prop was removed from the interface. Would cause TypeScript error.
- **Fix:** Removed the `onSwitchToSignUp` prop from the `<SignInModal>` call in `workshop-header.tsx`
- **Files modified:** src/components/layout/workshop-header.tsx
- **Verification:** `npx tsc --noEmit` passes clean; `npx next build` succeeds
- **Committed in:** 909f6e8 (Task 2 commit)

**2. [Rule 1 - Bug] Restored redirect import in dashboard/page.tsx**
- **Found during:** Task 2 (Dashboard page update)
- **Issue:** Removed `redirect` import when swapping `redirect('/')` for `DashboardUnauthenticated`, but `redirect('/dashboard')` is still used in the webhook race condition handler at line 58
- **Fix:** Added `import { redirect } from 'next/navigation'` back to the file
- **Files modified:** src/app/dashboard/page.tsx
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** 909f6e8 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking import removal, 1 missing import bug)
**Impact on plan:** Both fixes necessary for TypeScript compilation and runtime correctness. No scope creep.

## Issues Encountered

None — both deviations discovered and fixed during TypeScript check before committing.

## User Setup Required

**Clerk production domain configuration is required before workshoppilot.ai sign-in works.**

Per `user_setup` in the plan frontmatter, the following manual steps are needed in Clerk Dashboard:

1. **Switch to production Clerk keys** — In `.env.local` or Vercel Dashboard, replace `pk_test_*`/`sk_test_*` with `pk_live_*`/`sk_live_*` keys from the workshoppilot.ai Clerk instance
2. **Add allowed origin** — Clerk Dashboard → workshoppilot.ai instance → Settings → Domains → Allowed origins → add `workshoppilot.ai`
3. **Enable email verification** — Clerk Dashboard → Configure → Email, phone, username → Email address → Require verification

## Next Phase Readiness

- Auth UI and theming complete — Phase 40 Plan 02 (webhook and session handling) can proceed
- Production Clerk keys still need to be configured in Vercel for live sign-in to function
- All auth components are now unified around the single SignIn modal pattern
