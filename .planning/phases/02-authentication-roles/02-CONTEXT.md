# Phase 2: Authentication & Roles - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can sign up, sign in, and access role-appropriate routes with session persistence. Includes a deferred auth wall (anonymous users complete steps 1-3 before sign-up is required), Clerk integration with embedded components, role assignment, and route protection. Multiplayer/participant features are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Sign-up & Sign-in Flow
- Auth methods: Email + password and Google OAuth
- Clerk embedded components (`<SignIn/>`, `<SignUp/>`) styled within the app, not hosted pages
- Auth pages appear as modal overlay on the landing page (not dedicated routes)
- Email verification required before accessing protected routes
- Auth wall triggers after step 3 (Empathize + Define + Ideate completed)
- Wall modal shows sign-up form + preview of what's next ("Step 4: Prototype your idea")
- Primary CTA is sign-up, with "Already have an account? Sign in" link
- If user dismisses the wall modal: stay on step 3, can review steps 1-3, modal reappears on next advance attempt
- Anonymous users get one active workshop at a time
- Anonymous session data saved in localStorage for browser persistence
- After sign-up, anonymous session data migrates to the new user account seamlessly
- After sign-up (at auth wall), user continues directly to step 4 — no intermediate dashboard
- Sign-in link visible in landing page header/nav for returning users

### Role Assignment
- Everyone starts as facilitator (participant role deferred to multiplayer milestone)
- Admin role for app owner, identified by environment variable (ADMIN_EMAIL)
- Admin = facilitator + admin access (can run own workshops AND access admin pages)
- Admin has full CRUD on all workshops and users in MVP 0.5
- Roles stored as array in database now (future-proofed for participant role later)

### Protected Routes & Redirects
- Public routes: landing page, workshop steps 1-3
- Protected routes: workshop steps 4-10, dashboard, /admin
- Unauthenticated user hitting protected route → sign-in modal with redirect back to original page
- Non-admin hitting /admin → silently redirect to dashboard
- Signed-in users visiting landing page → auto-redirect to dashboard

### User Profile & Identity
- Collect during sign-up: name (first + last) + optional company/org field
- Avatars: use Clerk-provided (Google profile pic or generated initials)
- Profile page: Clerk's built-in `<UserProfile/>` component (no custom profile page)
- User sync: Clerk webhooks create DB record on user creation
- Account deletion: soft delete (user + workshops marked deleted, kept in DB)
- Display name shown in header/nav only (AI chat does not use user's name in MVP 0.5)

### Claude's Discretion
- Exact modal styling and animation
- Clerk theme customization details
- Middleware implementation pattern
- localStorage schema for anonymous sessions
- Webhook endpoint structure and error handling

</decisions>

<specifics>
## Specific Ideas

- Auth wall should feel like a natural pause point, not a blocker — user just finished ideating, show them a teaser of what prototyping looks like to motivate sign-up
- The dashboard should show a list of all workshops (anticipating users will run multiple workshops over time)
- Anonymous → authenticated migration must be seamless — no lost work from steps 1-3

</specifics>

<deferred>
## Deferred Ideas

- Participant role and invite system — multiplayer milestone (MMP)
- Custom profile page — revisit if Clerk's built-in component isn't sufficient
- AI using user's name in conversation — potential MVP 1.0 personalization feature
- Admin dashboard UI — admin routes need to exist and be protected, but admin UI is a separate concern

</deferred>

---

*Phase: 02-authentication-roles*
*Context gathered: 2026-02-07*
