---
phase: 02-authentication-roles
plan: 01
subsystem: auth
tags: [clerk, authentication, middleware, next.js, drizzle]

# Dependency graph
requires:
  - phase: 01-foundation-database
    provides: Database schema setup with Drizzle ORM and Neon Postgres
provides:
  - Clerk SDK integration for managed authentication
  - Users database table with soft delete and role support
  - Middleware for route protection (public, protected, admin)
  - ClerkProvider wrapping entire application
  - Phase 3 handoff documentation for workshop step routes
affects: [02-02, 02-03, 03-*, workshop-routes, admin-features]

# Tech tracking
tech-stack:
  added: [@clerk/nextjs, @clerk/themes, svix]
  patterns: [Conditional provider wrapping based on env vars, Middleware-first route protection, Soft delete pattern with deletedAt]

key-files:
  created:
    - src/db/schema/users.ts
    - src/middleware.ts
  modified:
    - src/app/layout.tsx
    - src/db/schema/index.ts
    - src/db/schema/relations.ts
    - src/db/types.ts
    - package.json

key-decisions:
  - "Roles stored as JSON text array in database (default: ['facilitator'])"
  - "Conditional ClerkProvider wrapper - only wraps when valid keys present"
  - "Middleware validates admin role from sessionClaims.publicMetadata"
  - "Phase 3 handoff comment in middleware documents workshop step route protection requirements"

patterns-established:
  - "Soft delete: deletedAt nullable timestamp on users table"
  - "Prefixed IDs: usr_ prefix for user records following existing pattern"
  - "Logical relations: users to workshops via clerkUserId text match (not FK)"
  - "Defense in depth: middleware as first layer, components/API must also verify"

# Metrics
duration: 5min
completed: 2026-02-07
---

# Phase 02-01: Clerk Integration & Route Protection Summary

**Clerk authentication SDK integrated with conditional initialization, users table with role-based soft delete, and middleware protecting /dashboard and /admin routes with Phase 3 workshop step handoff documented**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-07T08:04:29Z
- **Completed:** 2026-02-07T08:09:14Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Clerk SDK installed and integrated with Next.js App Router
- Users table created with usr_ prefixed IDs, soft delete, and JSON role storage
- Middleware protects /dashboard, /admin routes with appropriate redirects
- Phase 3 handoff comment block added to middleware for workshop step route protection
- Build passes without valid Clerk keys via conditional ClerkProvider wrapping

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create users database schema** - `fac5293` (feat)
2. **Task 2: Configure ClerkProvider and middleware** - `5ae466d` (feat)
3. **Fix: Improve Clerk key validation check** - `a3b1083` (fix)

## Files Created/Modified
- `src/db/schema/users.ts` - Users table with clerkUserId, email, firstName, lastName, imageUrl, company, roles (JSON), deletedAt, timestamps
- `src/middleware.ts` - Route protection middleware with public, protected, admin matchers; includes Phase 3 workshop step handoff comment
- `src/app/layout.tsx` - ClerkProvider wrapper with conditional initialization and fallback redirects to /dashboard
- `src/db/schema/index.ts` - Export users table
- `src/db/schema/relations.ts` - Users relations with logical link to workshops
- `src/db/types.ts` - User and NewUser types exported
- `package.json` - Added @clerk/nextjs, @clerk/themes, svix

## Decisions Made

**1. Roles as JSON text array**
- Rationale: Simplifies Drizzle handling, future-proofs for multiple roles (facilitator + participant)
- Default: `["facilitator"]`
- Storage: Text column containing JSON array

**2. Conditional ClerkProvider wrapping**
- Rationale: Build must pass without valid Clerk keys (user will add them from dashboard)
- Check: `pk_test_...` placeholder or `placeholder` string triggers skip
- Impact: Application runs without auth until real keys configured

**3. Middleware admin role check via publicMetadata**
- Rationale: Clerk stores custom roles in publicMetadata
- Pattern: `sessionClaims?.publicMetadata?.roles`
- Typing: Cast to `{ roles?: string[] }` for type safety

**4. Phase 3 handoff documentation in middleware**
- Rationale: Steps 1-3 public, steps 4-10 protected (locked user decision)
- Location: Clearly marked comment block in middleware.ts
- Purpose: Guide future phase to update route matchers

**5. Soft delete pattern for users**
- Rationale: Maintain data integrity, enable audit trail
- Field: `deletedAt` nullable timestamp
- Pattern: Filter `WHERE deletedAt IS NULL` in queries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Build failing with placeholder Clerk keys**
- **Found during:** Task 2 verification
- **Issue:** Clerk validates publishable key format even during build, `pk_test_...` placeholder invalid
- **Fix:** Added explicit check for `pk_test_...` placeholder value in addition to `placeholder` string check
- **Files modified:** src/app/layout.tsx
- **Verification:** `npm run build` completes successfully
- **Committed in:** a3b1083 (fix commit)

**2. [Rule 3 - Blocking] Peer dependency conflict with React 19.2.0**
- **Found during:** Task 1 (npm install)
- **Issue:** Clerk peer dependency expects specific React 19 patch versions, conflicts with React 19.2.0
- **Fix:** Used `--legacy-peer-deps` flag to install Clerk packages
- **Files modified:** package.json, package-lock.json
- **Verification:** Packages installed successfully, build passes
- **Committed in:** fac5293 (Task 1 commit)

**3. [Rule 1 - Bug] TypeScript error on sessionClaims.publicMetadata.roles**
- **Found during:** Task 2 build verification
- **Issue:** `sessionClaims.publicMetadata` typed as `{}`, no `roles` property
- **Fix:** Added type assertion `as { roles?: string[] } | undefined` for publicMetadata
- **Files modified:** src/middleware.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 5ae466d (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for build to pass and middleware to function correctly. No scope creep.

## Issues Encountered

**Vercel CLI overwrote .env.local**
- User had configured Vercel which regenerated .env.local with database credentials
- Clerk placeholder keys (pk_test_..., sk_test_...) expected by plan were preserved in regenerated file
- Solution: Conditional ClerkProvider wrapper handles missing/placeholder keys gracefully
- Impact: None - build passes, ready for user to add real Clerk keys

## User Setup Required

**External services require manual configuration.** User must complete these steps before authentication will function:

1. **Create Clerk Application**
   - Go to dashboard.clerk.com
   - Create new application
   - Enable email+password authentication
   - Enable Google OAuth provider
   - Configure first name and last name as required fields

2. **Add Clerk API Keys to .env.local**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... (from Clerk dashboard)
   CLERK_SECRET_KEY=sk_test_... (from Clerk dashboard)
   ```

3. **Verify Setup**
   - Run `npm run dev`
   - Application should start without errors
   - Middleware will protect /dashboard and /admin routes

Note: ADMIN_EMAIL is already configured in .env.local. This will be used in plan 02-03 for webhook-based user sync.

## Next Phase Readiness

**Ready for:**
- Plan 02-02: Sign-up flow with company field and role assignment
- Plan 02-03: Webhook sync from Clerk to users table
- Plan 02-04: Admin middleware and user management
- All downstream authentication-dependent features

**Blockers:**
- None - Clerk SDK integrated, users table exists, middleware configured

**Concerns:**
- User must add real Clerk keys before authentication will work (documented above)
- Next.js 16.1.1 shows "middleware" deprecation warning - suggests "proxy" convention. Not blocking, but may need migration in future Next.js version.

**Phase 3 Handoff Documented:**
- Middleware contains clear comment block marking workshop step route protection requirements
- Steps 1-3: public (add to isPublicRoute matcher)
- Steps 4-10: protected (add to isProtectedRoute matcher)
- Auth wall modal triggers after step 3 completion

---
*Phase: 02-authentication-roles*
*Completed: 2026-02-07*

## Self-Check: PASSED

All created files verified to exist.
All task commits verified in git history.
