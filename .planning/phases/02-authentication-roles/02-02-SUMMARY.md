---
phase: 02-authentication-roles
plan: 02
subsystem: auth
tags: [clerk, webhooks, roles, svix, user-sync]

# Dependency graph
requires:
  - phase: 02-01
    provides: Clerk integration, middleware, user schema with roles column
provides:
  - Clerk webhook endpoint for user lifecycle sync (user.created, user.updated, user.deleted)
  - Role management utilities (getUserRoles, checkRole, isAdmin, initializeUserRoles)
  - Admin role assignment via ADMIN_EMAIL env var
  - Soft delete pattern for users
affects: [02-03-auth-ui, 02-04-route-protection, workshop-creation, admin-features]

# Tech tracking
tech-stack:
  added: [svix]
  patterns: [webhook signature verification, role-based access via publicMetadata, soft delete]

key-files:
  created:
    - src/lib/auth/roles.ts
    - src/app/api/webhooks/clerk/route.ts
  modified: []

key-decisions:
  - "Admin identified by ADMIN_EMAIL env var match on user creation"
  - "Everyone starts as facilitator, admin gets both facilitator + admin roles"
  - "Roles stored in Clerk publicMetadata (source of truth) and mirrored in users.roles JSON column"
  - "Soft delete users on deletion (set deletedAt, preserve record)"
  - "Workshops table lacks deletedAt column - TODO added for future implementation"

patterns-established:
  - "Webhook signature verification using svix library (all Clerk webhooks should follow this pattern)"
  - "Role checking functions read from session claims publicMetadata"
  - "initializeUserRoles called during user.created to assign roles via Clerk API"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 02 Plan 02: Clerk User Sync & Role Management Summary

**Webhook endpoint syncs Clerk user lifecycle to database with automatic role assignment via ADMIN_EMAIL detection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T08:13:38Z
- **Completed:** 2026-02-07T08:15:37Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Role utilities enable type-safe role checking from Clerk session claims
- Webhook endpoint keeps database in sync with Clerk user lifecycle (create, update, delete)
- Admin role automatically assigned when user email matches ADMIN_EMAIL env var
- Soft delete pattern preserves user records and prevents orphaned data

## Task Commits

Each task was committed atomically:

1. **Task 1: Create role management utilities** - `f4bc59c` (feat)
2. **Task 2: Create Clerk webhook endpoint for user sync** - `fba0b31` (feat)

## Files Created/Modified
- `src/lib/auth/roles.ts` - Role utilities for extracting roles from session claims, checking roles, and initializing roles on user creation
- `src/app/api/webhooks/clerk/route.ts` - Webhook handler for Clerk user.created, user.updated, user.deleted events with svix signature verification

## Decisions Made

1. **Admin detection via ADMIN_EMAIL env var**
   - Rationale: Simple admin bootstrap without complex role assignment UI. First user with matching email gets admin + facilitator roles.

2. **Roles in Clerk publicMetadata as source of truth**
   - Rationale: Session claims automatically include publicMetadata, enabling fast synchronous role checks without database query. users.roles column mirrors this for reporting/queries.

3. **Everyone starts as facilitator**
   - Rationale: Per user decision in plan context, all users can create workshops. Admin is additive role for system management.

4. **Soft delete pattern**
   - Rationale: Preserves data integrity, enables audit trail, prevents hard deletes from cascading and losing historical context.

5. **TODO for workshop soft delete**
   - Rationale: workshops table currently lacks deletedAt column. Added TODO comment in webhook handler for future implementation when workshops table is updated.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**External services require manual configuration.** User must configure Clerk webhook:

1. **Add CLERK_WEBHOOK_SECRET to .env.local:**
   - Go to Clerk Dashboard → Configure → Webhooks → Add Endpoint
   - Create endpoint URL: `https://workshoppilot.ai/api/webhooks/clerk` (or localhost for dev: `http://localhost:3000/api/webhooks/clerk`)
   - Subscribe to events: `user.created`, `user.updated`, `user.deleted`
   - Copy the Signing Secret
   - Add to .env.local: `CLERK_WEBHOOK_SECRET="whsec_..."`

2. **Set ADMIN_EMAIL env var (optional):**
   - Add to .env.local: `ADMIN_EMAIL="your-email@example.com"`
   - First user who signs up with this email gets admin + facilitator roles
   - All other users get facilitator role only

3. **Test webhook (after Clerk keys configured from 02-01):**
   - Sign up a new user in your app
   - Check database: `SELECT * FROM users WHERE clerk_user_id = 'user_...';`
   - Verify user record created with correct roles

## Next Phase Readiness

**Ready for:**
- Plan 02-03 (Authentication UI): Role utilities ready for dashboard integration
- Plan 02-04 (Route Protection): getUserRoles can be used in middleware and route handlers
- Workshop creation: User sync ensures authenticated users have database records

**Blockers/Concerns:**
- Clerk webhook requires CLERK_WEBHOOK_SECRET from dashboard (user setup task)
- Webhook won't fire until endpoint is configured in Clerk dashboard
- Local development webhooks require ngrok or similar tunnel unless using Clerk dev mode

---
*Phase: 02-authentication-roles*
*Completed: 2026-02-07*

## Self-Check: PASSED

All created files and commits verified:
- src/lib/auth/roles.ts ✓
- src/app/api/webhooks/clerk/route.ts ✓
- Commit f4bc59c ✓
- Commit fba0b31 ✓
