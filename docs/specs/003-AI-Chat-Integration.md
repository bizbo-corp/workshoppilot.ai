# 003: AI Chat Integration

## Overview
**Status**: 📋 Draft
**Priority**: P0
**Target Release**: MVP 0.5
**Owner**: @michael
**Dev Repo**: Issue #TBD

---

## Problem Statement

Integrate Gemini API to provide context-aware AI assistance at each workshop step.

---

## User Stories

1. **As a participant, I want to chat with AI at each step so that I can get guidance and feedback**
2. **As a participant, I want the AI to understand my previous responses so that I get contextual help**
3. **As a facilitator, I want AI prompts tailored to each workshop phase so that participants get relevant guidance**

---

## Requirements

### Must Have (MVP 0.5)
- [ ] Gemini API integration per step
- [ ] AI knows which step the user is on
- [ ] AI has access to previous step responses
- [ ] Prompts tailored to current workshop phase
- [ ] Message input field
- [ ] Send button
- [ ] Message history display
- [ ] Simple styling (user messages right, AI messages left)

### Nice to Have (Future)
- [ ] Streaming responses
- [ ] Typing indicators
- [ ] Message timestamps
- [ ] Copy message button
- [ ] Export chat history

---

## Technical Considerations

### API Setup
```bash
# Environment variable
GEMINI_API_KEY=your_api_key_here
```

### API Route Structure
```
/app/api/chat/route.ts
- Accepts: { stepId, message, sessionId }
- Returns: { response, timestamp }
```

### Context Building
```typescript
const context = {
  currentStep: stepId,
  previousResponses: await getPreviousResponses(sessionId),
  workshopGoal: "Design thinking workshop",
  stepInstructions: getStepInstructions(stepId)
};
```

### Dependencies
- Depends on: [[002-Workshop-Flow-UI|002: Workshop Flow UI]]
- Depends on: [[004-State-Management|004: State Management]] (for previous responses)

---

## Design Notes

### Chat Interface Layout
```
┌─────────────────────────┐
│  Chat with AI Assistant │
├─────────────────────────┤
│                         │
│  [AI] How can I help?   │
│                         │
│     [You] I need help   │
│                         │
├─────────────────────────┤
│ [Type message...] [Send]│
└─────────────────────────┘
```

### System Prompts by Step
Each workshop step gets a tailored system prompt:
- **Challenge**: Focus on problem definition
- **Research**: Guide data gathering
- **Ideation**: Encourage creative thinking
- **Validation**: Help with testing approaches

---

## Implementation Steps

**Estimated Time**: 3d

1. **Day 1**: API Integration
   - Set up Gemini API client
   - Create API route
   - Test basic chat functionality

2. **Day 2**: Context & UI
   - Build context management
   - Create chat interface component
   - Integrate with workshop steps

3. **Day 3**: Polish & Testing
   - Add step-specific prompts
   - Test context passing
   - Handle errors gracefully

---

## Related Documents

- [[../Design Thinking/Steps/0_MVP 0.5|MVP 0.5 Overview]]
- [[TECH_STACK|Tech Stack Reference]]
- [[002-Workshop-Flow-UI|Workshop Flow UI]]

---

## Updates Log

| Date | Update | By |
|------|--------|-----|
| 2025-02-06 | Auto-generated | Michael |