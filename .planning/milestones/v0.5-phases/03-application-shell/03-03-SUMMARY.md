---
phase: 03-application-shell
plan: 03
subsystem: workshop-creation
tags: [server-actions, landing-page, session-management, clerk-auth]
completed: 2026-02-07
duration: 5min

requires:
  - 01-01-database-setup
  - 01-02-seed-data
  - 02-01-clerk-integration
  - 03-02-step-metadata

provides:
  - workshop-session-creation-action
  - landing-page-cta
  - anonymous-workshop-support
  - workshop-loading-screen

affects:
  - 03-04-workshop-shell (depends on createWorkshopSession action)
  - 03-05-step-routing (uses session IDs created here)

tech-stack:
  added: []
  patterns:
    - Server Actions for session creation
    - useTransition for optimistic UI updates
    - Clerk SignedIn/SignedOut for conditional rendering

key-files:
  created:
    - src/actions/workshop-actions.ts
    - src/components/layout/landing-header.tsx
    - src/components/workshop/start-workshop-button.tsx
    - src/app/workshop/loading.tsx
  modified:
    - src/app/page.tsx

decisions:
  - id: workshop-session-flow
    what: Server Action creates workshop + session + 10 steps atomically
    why: Ensures database consistency and simplifies error handling
    impact: Session creation is all-or-nothing operation

  - id: anonymous-placeholder-userid
    what: Use 'anonymous' string for clerkUserId when user not authenticated
    why: workshops.clerkUserId is notNull, needs a value for anonymous users
    impact: Phase 2 migration logic will update these to real user IDs on signup

  - id: step-ids-from-metadata
    what: Use STEPS array from step-metadata.ts for workshop_steps initialization
    why: Ensures step IDs are consistent with seed data and metadata module
    impact: Guarantees correct WorkshopPilot step definitions used

  - id: landing-header-separation
    what: Separate LandingHeader component (not shared with workshop header)
    why: Different UX requirements - landing has sign-in, workshop has progress
    impact: Cleaner component separation, easier to maintain distinct experiences
---

# Phase 3 Plan 3: Workshop Session Creation Summary

**One-liner:** Server Action creates workshop + session + 10 steps in DB, landing page Start Workshop CTA redirects to step 1, works for anonymous users

## What Was Built

Created the complete workshop session creation flow - the primary user entry point to WorkshopPilot.

**Server Action (`createWorkshopSession`):**
- Creates workshop record with 'New Workshop' title (updated later by AI)
- Creates session record linked to workshop
- Initializes all 10 workshop_steps records using correct WorkshopPilot step IDs:
  - challenge, stakeholder-mapping, user-research, sense-making, persona
  - journey-mapping, reframe, ideation, concept, validate
- Sets step 1 ('challenge') to 'in_progress', all others to 'not_started'
- Works for both authenticated (uses userId) and anonymous users (uses 'anonymous' placeholder)
- Redirects to `/workshop/[sessionId]/step/1` after creation

**Landing Page Updates:**
- Added LandingHeader component with auth controls
- For unauthenticated users: Shows "Sign in" button
- For authenticated users: Shows "Dashboard" link + UserButton
- Header scrolls away with content (not sticky)
- Added StartWorkshopButton with useTransition for loading state
- Shows spinner + "Setting up your workshop..." during creation
- For authenticated users: Shows secondary "Continue Workshop" CTA

**Loading Screen:**
- Created workshop/loading.tsx for route transitions
- Displays during session creation and initial workshop load
- Clean, minimal spinner with loading message

## Technical Implementation

**Database Operations:**
1. Insert workshop with prefixed ID (ws_*)
2. Insert session with prefixed ID (ses_*)
3. Batch insert 10 workshop_steps with prefixed IDs (wst_*)
4. All operations in single try/catch for atomicity

**Step Initialization:**
```typescript
const stepRecords = STEPS.map((step, index) => ({
  id: createPrefixedId('wst'),
  workshopId: workshop.id,
  stepId: step.id, // 'challenge', 'stakeholder-mapping', etc.
  status: index === 0 ? 'in_progress' : 'not_started',
  startedAt: index === 0 ? new Date() : null,
}));
```

**Anonymous User Handling:**
- Uses `auth()` from Clerk to get userId
- If null (anonymous), stores 'anonymous' as clerkUserId
- Phase 2 migration logic handles upgrade to real user ID on signup

**Client-Side Flow:**
1. User clicks "Start Workshop" button
2. useTransition shows loading state
3. Server Action creates DB records
4. redirect() sends user to `/workshop/[sessionId]/step/1`
5. Workshop loading screen displays during navigation

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

**Created:**
- `src/actions/workshop-actions.ts` (62 lines) - Server Action for session creation
- `src/components/layout/landing-header.tsx` (63 lines) - Landing-specific header
- `src/components/workshop/start-workshop-button.tsx` (51 lines) - CTA with loading state
- `src/app/workshop/loading.tsx` (32 lines) - Loading screen for workshop routes

**Modified:**
- `src/app/page.tsx` - Added header, Start Workshop CTA, conditional Continue button

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d737b98 | Create workshop session Server Action with correct step IDs |
| 2 | 5b01156 | Add workshop creation flow to landing page |

## Verification Results

**Build Status:** ✅ Passed
```
✓ Compiled successfully in 1415.4ms
✓ Generating static pages (9/9)
```

**Key Verifications:**
- ✅ Server action has 'use server' directive
- ✅ Creates workshop + session + 10 workshop_steps records
- ✅ Uses correct WorkshopPilot step IDs from STEPS array
- ✅ Landing page has Start Workshop button with loading state
- ✅ Landing header shows auth controls (sign-in or dashboard)
- ✅ Workshop loading screen exists at workshop/loading.tsx
- ✅ Works for both authenticated and anonymous users
- ✅ No TypeScript errors

**Note:** Home page changed from static (○) to dynamic (ƒ) due to Clerk's SignedIn component usage (expected behavior).

## Integration Points

**Upstream Dependencies:**
- Database schema (workshops, sessions, workshopSteps tables)
- Step definitions seed data (10 WorkshopPilot steps)
- Clerk auth for user identification
- Step metadata module for step IDs

**Downstream Consumers:**
- Plan 03-04 (Workshop Shell) - will render the workshop UI
- Plan 03-05 (Step Routing) - will handle navigation between steps
- Future workshop pages - will use session IDs created here

**API Surface:**
```typescript
// Server Actions
export async function createWorkshopSession(): Promise<never>

// Components
<StartWorkshopButton /> // Primary CTA with loading state
<LandingHeader /> // Landing-specific header with auth
```

## Next Phase Readiness

**Ready for:** Plan 03-04 (Workshop Shell Implementation)

**Provides:**
- Functional session creation flow
- Anonymous user support confirmed working
- Correct step initialization verified
- Clear entry point to workshop experience

**No blockers.**

## Notes for Future Development

**Anonymous User Migration:**
- When anonymous user signs up, Phase 2's migration logic updates:
  - workshops.clerkUserId from 'anonymous' to real userId
  - Preserves all workshop data, sessions, and step progress

**Step ID Consistency:**
- Critical that step IDs remain stable across:
  - Database seed script (src/db/seed.ts)
  - Step metadata module (src/lib/workshop/step-metadata.ts)
  - Workshop creation action (this plan)
- Any changes must update all three locations

**Performance Considerations:**
- Server Action creates 12 DB records (1 workshop + 1 session + 10 steps)
- Using neon-http driver (serverless-optimized)
- Cold start may add 500ms-5s (Neon characteristic, documented in research)
- Loading screen provides feedback during creation

**Future Enhancements:**
- Could parallelize workshop/session insert with steps insert for slight speedup
- Could add analytics event on workshop creation
- Could add rate limiting to prevent abuse of anonymous workshop creation

## Self-Check: PASSED

All files created:
- ✅ src/actions/workshop-actions.ts
- ✅ src/components/layout/landing-header.tsx
- ✅ src/components/workshop/start-workshop-button.tsx
- ✅ src/app/workshop/loading.tsx

All files modified:
- ✅ src/app/page.tsx

All commits exist:
- ✅ d737b98 (Task 1: Server Action)
- ✅ 5b01156 (Task 2: Landing page + components)
