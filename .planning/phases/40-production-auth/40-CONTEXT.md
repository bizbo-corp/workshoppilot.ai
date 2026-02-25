# Phase 40: Production Auth - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix broken production sign-in on workshoppilot.ai so users can sign up and log in without friction. Includes email/password, Google OAuth, and Apple sign-in. Clerk domain configuration must work correctly for the production domain.

</domain>

<decisions>
## Implementation Decisions

### Sign-in entry points
- Single "Sign in" button in the site header only (no landing page or pricing page CTAs)
- Button styled as a secondary button — not high-contrast, blends with the header
- Single button opens a flow where users can sign in OR create an account (no separate sign-up button)
- When signed in: show user avatar/initials with a button to go to the dashboard (where they see their workshops)

### Auth flow experience
- Use Clerk modal overlay (not a dedicated /sign-in page) — feels lightweight and fast
- After sign-in (both new and returning users): always redirect to the dashboard
- Clerk modal must be styled to match the olive theme — feels native to the app, not a third-party widget
- Email verification required before accessing the dashboard — reduces spam accounts

### Google OAuth & social providers
- Google sign-in button displayed first (top/primary), email/password form below as secondary
- Apple sign-in also available — two social providers at launch (Google + Apple)
- Social buttons use custom olive-styled design with provider icons (not Google/Apple standard branding)
- Auto-link accounts when same email is used across methods — seamless merge, no confirmation prompt

### Error handling & edge cases
- Auth errors (wrong password, network) displayed as toast notifications, not inline in the modal
- Session expiry: attempt silent re-auth first; only show sign-in modal if refresh fails
- Landing page and pricing page are public (no sign-in required)
- Dashboard, workshop, and all app routes are protected
- Protected route access without auth: show sign-in modal on that page (not redirect to landing), so after auth they're already where they wanted to be

### Claude's Discretion
- Exact Clerk theme configuration values (colors, fonts, border-radius) to match olive tokens
- Toast notification implementation details
- Clerk middleware configuration approach
- Session refresh strategy details

</decisions>

<specifics>
## Specific Ideas

- Avatar in header should link to dashboard — the dashboard is the hub where users see their workshops
- Modal approach keeps users in context — they don't lose their place when signing in
- Google and Apple buttons should feel like they belong to the app, not like embedded third-party widgets

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-production-auth*
*Context gathered: 2026-02-25*
