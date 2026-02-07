# 001: Authentication Setup

## Overview
**Status**: 📋 Draft
**Priority**: P0
**Target Release**: MVP 0.5
**Owner**: @michael
**Dev Repo**: Issue #[TBD]

---

## Problem Statement

WorkshopPilot needs secure authentication to differentiate between facilitators (admins) and participants (users). We need a simple, reliable auth solution that doesn't require building our own user management.

---

## Goals & Success Metrics

**Goals**:
- Secure sign-in/sign-out for all users
- Role-based access control (facilitator vs participant)
- Session persistence across browser refreshes
- Easy onboarding for test users

**Success Metrics**:
- ✅ Michael can log in as facilitator
- ✅ Christie can log in as participant
- ✅ Facilitator can access admin dashboard
- ✅ Participant cannot access admin routes
- ✅ Sessions persist for 7 days

---

## User Stories

1. **As a facilitator**, I want to sign in with my email so that I can access the admin dashboard
2. **As a participant**, I want to sign in easily so that I can join my workshop
3. **As a facilitator**, I want only authorized admins to access admin features so that workshop data stays secure
4. **As any user**, I want to stay logged in across sessions so that I don't have to re-authenticate constantly

---

## Requirements

### Must Have (MVP 0.5)
- [ ] Clerk integration configured
- [ ] Email/password authentication
- [ ] Two hardcoded user accounts:
  - michael@bizbo.co.nz (facilitator role)
  - christie.michael@gmail.com (participant role)
- [ ] Role-based middleware protecting admin routes
- [ ] Sign-in page
- [ ] Sign-out functionality
- [ ] Session persistence
- [ ] Protected routes for:
  - `/dashboard` (facilitator only)
  - `/workshop/*` (authenticated users only)

### Nice to Have (Future)
- OAuth (Google, Microsoft)
- Self-service signup with email verification
- User profile management
- Password reset flow
- Multi-factor authentication

---

## Technical Considerations

### Clerk Setup
```bash
npm install @clerk/nextjs
```

### Environment Variables
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_***
CLERK_SECRET_KEY=sk_***
```

### Middleware Pattern
```typescript
// middleware.ts
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/"],
  ignoredRoutes: ["/api/webhooks(.*)"],
});
```

### Role Storage
- Store user roles in Clerk metadata
- Or maintain roles in our database with user_id reference

### Protected API Routes
```typescript
// Check role in API routes
import { auth } from "@clerk/nextjs";

export async function GET() {
  const { userId } = auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  
  // Check role from metadata or DB
}
```

---

## Design Notes

### Sign-In Page
- Clean, centered form
- Email + password fields
- "Sign in" button
- No signup link (closed beta)
- Tailwind styling

### Navigation
- Show user avatar/name when logged in
- "Sign out" button in nav
- Show different nav items based on role

---

## Testing Plan

### Manual Testing
1. ✅ Visit app → Redirected to sign-in
2. ✅ Sign in as michael@bizbo.co.nz → See facilitator dashboard
3. ✅ Navigate to /dashboard → Access granted
4. ✅ Sign out → Redirected to home
5. ✅ Sign in as christie.michael@gmail.com → See participant view
6. ✅ Try to access /dashboard as participant → Access denied
7. ✅ Close browser, reopen → Still logged in

### Automated Testing
- E2E test for sign-in flow
- Middleware tests for route protection
- API route auth tests

---

## Implementation Steps

1. **Setup Clerk** (0.5d)
   - Create Clerk account
   - Install package
   - Configure env vars
   - Add middleware

2. **Create User Accounts** (0.5d)
   - Add michael@bizbo.co.nz as facilitator
   - Add christie.michael@gmail.com as participant
   - Set role metadata

3. **Build Auth UI** (1d)
   - Sign-in page component
   - Sign-out button
   - Protected route wrappers
   - User menu

4. **Testing** (0.5d)
   - Manual testing all flows
   - Fix any issues

---

## Dev Repo Reference

**Repository**: [GitHub URL]
**Branch**: `feature/auth-setup`
**Epic/Issue**: #[TBD]

---

## Related Documents

- [[../01_Planning/Decisions/001_Tech_Stack_Choice|ADR-001: Tech Stack Choice]]
- [[../Design Thinking/Steps/0_MVP 0.5|MVP 0.5 Overview]]
- [[005-Admin-Dashboard|Spec 005: Admin Dashboard]] (depends on auth)

---

## Open Questions

- [ ] Should we use Clerk metadata or our own DB for roles?
  - **Decision**: Use Clerk metadata for MVP 0.5 (simpler)
- [ ] Do we need email verification for MVP?
  - **Decision**: No, manually creating accounts
- [ ] Session timeout duration?
  - **Decision**: 7 days (Clerk default)

---

## Updates Log

| Date | Update | By |
|------|--------|-----|
| 2025-02-06 | Initial spec created | Michael |