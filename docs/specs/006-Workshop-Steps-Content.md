# 006: Workshop Steps Content

## Overview
**Status**: 📋 Draft
**Priority**: P0
**Target Release**: MVP 0.5
**Owner**: @michael
**Dev Repo**: Issue #TBD

---

## Problem Statement

Implement the 11 Design Thinking workshop steps with proper content, instructions, and structure.

---

## User Stories

1. **As a participant, I want clear instructions at each step so that I know what to do**
2. **As a participant, I want to input my responses at each step so that I can document my thinking**
3. **As a facilitator, I want a structured workshop flow so that participants follow the design thinking process**

---

## Requirements

### Must Have (MVP 0.5)
- [ ] Challenge - Define the problem
- [ ] Stakeholder Mapping - Identify key stakeholders
- [ ] User Research - Gather user insights
- [ ] Research Sense Making - Analyze findings
- [ ] Persona Development - Create user personas
- [ ] Journey Mapping - Map user experience
- [ ] Reframing Challenge - Redefine problem with insights
- [ ] Ideation - Generate solution ideas
- [ ] Concept Development - Develop selected concepts
- [ ] Validate - Test and validate solutions
- [ ] Each step has title, instructions, text input, and AI chat

### Nice to Have (Future)
- [ ] Step templates/examples
- [ ] Rich text editing
- [ ] Image uploads
- [ ] Collaborative features
- [ ] Step-specific tools (canvas, diagrams)

---

## Technical Considerations

### Step Data Structure
```typescript
interface WorkshopStep {
  id: number;
  title: string;
  description: string;
  instructions: string[];
  prompts: string[];
  aiSystemPrompt: string;
}
```

### Step Configuration
```typescript
// lib/workshop-steps.ts
export const workshopSteps: WorkshopStep[] = [
  {
    id: 1,
    title: "Challenge",
    description: "Define the problem you want to solve",
    instructions: [
      "Describe the challenge or problem you're facing",
      "Be specific about who is affected",
      "Explain why this matters"
    ],
    prompts: [
      "What problem are you trying to solve?",
      "Who experiences this problem?",
      "What are the symptoms of this problem?"
    ],
    aiSystemPrompt: "You are a design thinking facilitator helping a participant define their challenge. Ask clarifying questions to help them articulate the problem clearly."
  },
  // ... other steps
];
```

### Dynamic Routing
```
/app/workshop/[stepId]/page.tsx
- Loads step content based on stepId
- Displays instructions
- Shows text input area
- Includes AI chat interface
```

### Dependencies
- Depends on: [[002-Workshop-Flow-UI|002: Workshop Flow UI]]
- Depends on: [[003-AI-Chat-Integration|003: AI Chat Integration]]

---

## Design Notes

### Step Page Layout
```
┌─────────────────────────────────┐
│  Step 3 of 11: User Research    │
├─────────────────────────────────┤
│  Instructions:                   │
│  • Identify your target users   │
│  • Consider their needs...      │
│                                  │
│  Your Response:                  │
│  ┌───────────────────────────┐  │
│  │ [Text input area]         │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │  AI Chat                  │  │
│  └───────────────────────────┘  │
│                                  │
│  [← Back]  [Save & Next →]      │
└─────────────────────────────────┘
```

---

## Workshop Steps Content

### 1. Challenge
**Goal**: Define the problem
**Key Questions**:
- What problem are you trying to solve?
- Who is affected by this problem?
- Why does this problem matter?

### 2. Stakeholder Mapping
**Goal**: Identify key stakeholders
**Key Questions**:
- Who are the primary users?
- Who are the secondary stakeholders?
- Who has influence over this problem?

### 3. User Research
**Goal**: Gather user insights
**Key Questions**:
- What do your users need?
- What challenges do they face?
- What are their goals?

### 4. Research Sense Making
**Goal**: Analyze findings
**Key Questions**:
- What patterns emerge from the research?
- What are the key insights?
- What surprises did you discover?

### 5. Persona Development
**Goal**: Create user personas
**Key Questions**:
- Who is your primary user?
- What are their characteristics?
- What motivates them?

### 6. Journey Mapping
**Goal**: Map user experience
**Key Questions**:
- What are the key touchpoints?
- Where are the pain points?
- What opportunities exist?

### 7. Reframing Challenge
**Goal**: Redefine problem with insights
**Key Questions**:
- How has your understanding changed?
- What is the real problem?
- How might we address this?

### 8. Ideation
**Goal**: Generate solution ideas
**Key Questions**:
- What are possible solutions?
- What if we tried...?
- How could we improve...?

### 9. Concept Development
**Goal**: Develop selected concepts
**Key Questions**:
- Which ideas are most promising?
- How would this solution work?
- What resources are needed?

### 10. Validate
**Goal**: Test and validate solutions
**Key Questions**:
- How will you test this?
- What would success look like?
- What could go wrong?

---

## Implementation Steps

**Estimated Time**: 2d

1. **Day 1**: Content Creation
   - Write instructions for all 11 steps
   - Create AI system prompts
   - Define step data structure

2. **Day 2**: Integration
   - Implement dynamic step routing
   - Connect to database
   - Test full flow
   - Polish content

---

## Related Documents

- [[../Design Thinking/Steps/00_Index|Design Thinking Steps Index]]
- [[../Design Thinking/Steps/0_MVP 0.5|MVP 0.5 Overview]]
- [[002-Workshop-Flow-UI|Workshop Flow UI]]

---

## Updates Log

| Date | Update | By |
|------|--------|-----|
| 2025-02-06 | Auto-generated | Michael |