# 004: State Management & Persistence

## Overview
**Status**: 📋 Draft
**Priority**: P0
**Target Release**: MVP 0.5
**Owner**: @michael
**Dev Repo**: Issue #TBD

---

## Problem Statement

Implement database persistence so participants can save their progress between steps and resume workshops after closing the browser.

---

## User Stories

1. **As a participant, I want my responses saved automatically so that I don't lose my work**
2. **As a participant, I want to resume my workshop after closing the browser so that I can complete it at my own pace**
3. **As a facilitator, I want participant data persisted so that I can review their progress**

---

## Requirements

### Must Have (MVP 0.5)
- [ ] Save responses when clicking "Next"
- [ ] Store in Vercel Postgres database
- [ ] Load responses when returning to previous steps
- [ ] User can close browser and resume later
- [ ] State tied to user ID + workshop session ID
- [ ] Auto-save on every significant action
- [ ] Database schema implementation

### Nice to Have (Future)
- [ ] Optimistic updates
- [ ] Conflict resolution
- [ ] Version history
- [ ] Undo/redo functionality

---

## Technical Considerations

### Database Schema
```sql
-- workshops table
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active'
);

-- workshop_sessions table
CREATE TABLE workshop_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID REFERENCES workshops(id),
  participant_id VARCHAR(255) NOT NULL,
  current_step INTEGER DEFAULT 1,
  started_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- step_responses table
CREATE TABLE step_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workshop_sessions(id),
  step_number INTEGER NOT NULL,
  response_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, step_number)
);

-- chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workshop_sessions(id),
  step_number INTEGER NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### ORM Setup (Prisma)
```prisma
model Workshop {
  id            String   @id @default(uuid())
  facilitatorId String
  createdAt     DateTime @default(now())
  status        String   @default("active")
  sessions      WorkshopSession[]
}

model WorkshopSession {
  id            String   @id @default(uuid())
  workshopId    String
  participantId String
  currentStep   Int      @default(1)
  startedAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  workshop      Workshop @relation(fields: [workshopId], references: [id])
  responses     StepResponse[]
  messages      ChatMessage[]
}

model StepResponse {
  id           String   @id @default(uuid())
  sessionId    String
  stepNumber   Int
  responseText String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  session      WorkshopSession @relation(fields: [sessionId], references: [id])
  
  @@unique([sessionId, stepNumber])
}

model ChatMessage {
  id         String   @id @default(uuid())
  sessionId  String
  stepNumber Int
  role       String
  content    String
  timestamp  DateTime @default(now())
  session    WorkshopSession @relation(fields: [sessionId], references: [id])
}
```

### API Routes
```
POST /api/workshop/save
GET  /api/workshop/[sessionId]
POST /api/workshop/session/create
```

### Dependencies
- Depends on: [[001-Auth-Setup|001: Auth Setup]] (for user ID)
- Depends on: [[002-Workshop-Flow-UI|002: Workshop Flow UI]]

---

## Implementation Steps

**Estimated Time**: 2d

1. **Day 1**: Database Setup
   - Create Vercel Postgres instance
   - Set up Prisma
   - Create migrations
   - Test queries

2. **Day 2**: Integration
   - Build API routes
   - Integrate with UI
   - Test save/load flow
   - Add auto-save

---

## Testing Plan

### Key Test Cases
1. Save response → Navigate away → Return → Response persists
2. Close browser → Reopen → Session resumes at correct step
3. Multiple users → Each has isolated session
4. Concurrent saves → No data loss

---

## Related Documents

- [[../Design Thinking/Steps/0_MVP 0.5|MVP 0.5 Overview]]
- [[TECH_STACK|Tech Stack Reference]]
- [[001-Auth-Setup|Auth Setup]]

---

## Updates Log

| Date | Update | By |
|------|--------|-----|
| 2025-02-06 | Auto-generated | Michael |