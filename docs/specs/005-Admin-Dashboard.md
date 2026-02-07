# 005: Admin Dashboard

## Overview
**Status**: 📋 Draft
**Priority**: P0
**Target Release**: MVP 0.5
**Owner**: @michael
**Dev Repo**: Issue #TBD

---

## Problem Statement

Create a facilitator dashboard to monitor participant progress and view their responses in real-time.

---

## User Stories

1. **As a facilitator, I want to see which step my participants are on so that I can monitor their progress**
2. **As a facilitator, I want to view participant responses so that I can understand their thinking**
3. **As a facilitator, I want a simple dashboard so that I can quickly check on my workshop**

---

## Requirements

### Must Have (MVP 0.5)
- [ ] Dashboard showing active participant(s)
- [ ] Display current step each participant is on
- [ ] Ability to view participant responses (read-only)
- [ ] Simple dashboard layout
- [ ] Protected route (facilitator only)

### Nice to Have (Future)
- [ ] Real-time updates
- [ ] Export participant data
- [ ] Add notes/comments
- [ ] Send messages to participants
- [ ] Workshop analytics

---

## Technical Considerations

### Route Protection
```typescript
// middleware.ts or page-level check
import { auth } from '@clerk/nextjs';

export default async function DashboardPage() {
  const { userId } = auth();
  const user = await currentUser();
  
  if (user?.publicMetadata?.role !== 'facilitator') {
    redirect('/workshop');
  }
  
  // Dashboard content
}
```

### Data Fetching
```typescript
// Fetch all active sessions for facilitator's workshop
const sessions = await prisma.workshopSession.findMany({
  where: {
    workshop: {
      facilitatorId: userId
    }
  },
  include: {
    responses: true,
    messages: {
      take: 5,
      orderBy: { timestamp: 'desc' }
    }
  }
});
```

### Dependencies
- Depends on: [[001-Auth-Setup|001: Auth Setup]] (role checking)
- Depends on: [[004-State-Management|004: State Management]] (data access)

---

## Design Notes

### Dashboard Layout
```
┌─────────────────────────────────┐
│  Workshop Dashboard             │
├─────────────────────────────────┤
│  Active Participants: 1         │
│                                  │
│  Christie (christie.michael...) │
│  │ Step: 3/11 - User Research   │
│  │ Started: 2 hours ago         │
│  │ [View Responses]             │
│                                  │
└─────────────────────────────────┘
```

### Participant Detail View
```
┌─────────────────────────────────┐
│  Christie's Workshop Progress   │
├─────────────────────────────────┤
│  Step 1: Challenge              │
│  Response: "Our users struggle  │
│            with..."             │
│                                  │
│  Step 2: Stakeholder Mapping    │
│  Response: "Key stakeholders    │
│            include..."          │
│                                  │
│  [← Back to Dashboard]          │
└─────────────────────────────────┘
```

---

## Implementation Steps

**Estimated Time**: 2d

1. **Day 1**: Core Dashboard
   - Create protected route
   - Build dashboard layout
   - List active participants
   - Show current step

2. **Day 2**: Detail View
   - Participant detail page
   - Display all responses
   - Polish UI
   - Test access control

---

## Testing Plan

### Access Control Tests
1. ✅ Facilitator can access dashboard
2. ✅ Participant redirected away
3. ✅ Unauthenticated user redirected to sign-in

### Functionality Tests
1. ✅ Shows correct participant list
2. ✅ Displays accurate current step
3. ✅ Responses load correctly
4. ✅ Read-only (no editing)

---

## Related Documents

- [[../Design Thinking/Steps/0_MVP 0.5|MVP 0.5 Overview]]
- [[TECH_STACK|Tech Stack Reference]]
- [[001-Auth-Setup|Auth Setup]]
- [[004-State-Management|State Management]]

---

## Updates Log

| Date | Update | By |
|------|--------|-----|
| 2025-02-06 | Auto-generated | Michael |