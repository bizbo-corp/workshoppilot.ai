# 002: Workshop Flow UI

## Overview
**Status**: 📋 Draft
**Priority**: P0
**Target Release**: MVP 0.5
**Owner**: @michael
**Dev Repo**: Issue #TBD

---

## Problem Statement

Implement linear step progression with navigation controls and progress tracking for the workshop flow.

---

## User Stories

1. **As a participant, I want to progress through workshop steps linearly so that I complete the workshop in the correct order**
2. **As a participant, I want to see my progress so that I know how much of the workshop remains**
3. **As a participant, I want to go back to previous steps so that I can review or edit my responses**

---

## Requirements

### Must Have (MVP 0.5)
- [ ] Single "Next" button to move forward through steps
- [ ] "Back" button to return to previous step
- [ ] Cannot skip steps - must complete sequentially
- [ ] Visual progress bar showing current position
- [ ] Step numbers/titles visible in navigation
- [ ] Current step highlighted
- [ ] Completed steps marked (checkmark or color change)
- [ ] Upcoming steps visible but disabled

### Nice to Have (Future)
- [ ] Step preview/summary
- [ ] Keyboard shortcuts for navigation
- [ ] Transition animations

---

## Technical Considerations

### Component Structure
```
/components/workshop/
  StepContainer.tsx      # Main container
  ProgressBar.tsx        # Progress indicator
  Navigation.tsx         # Next/Back buttons
  StepIndicator.tsx      # Step markers
```

### State Management
- Use URL params for current step: `/workshop/[stepId]`
- Client-side state for navigation
- Persist current step to database

### Dependencies
- Depends on: [[001-Auth-Setup|001: Auth Setup]]

---

## Design Notes

### Navigation Layout
```
[<- Back]  [Step 2 of 11]  [Next ->]
```

### Progress Bar
- Full width at top of page
- Fill color shows completion percentage
- Step markers at intervals

---

## Implementation Steps

**Estimated Time**: 3d

1. **Day 1**: Build core components
   - StepContainer layout
   - Navigation buttons
   - Route structure

2. **Day 2**: Add progress tracking
   - Progress bar component
   - Step indicators
   - State management

3. **Day 3**: Polish & testing
   - Styling with Tailwind
   - Test navigation flow
   - Edge case handling

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