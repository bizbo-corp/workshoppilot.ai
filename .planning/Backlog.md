# Product Backlog

> Prioritized list of features and improvements

---

## How to Use This Backlog

1. **Capture** - Add new ideas as they come
2. **Prioritize** - Use P0 (critical), P1 (high), P2 (medium), P3 (low)
3. **Refine** - Break down into smaller stories before sprint planning
4. **Link** - Create specs in `02_Specs/` for anything that needs detail

---

## Up Next (Refined & Ready)

### P0 - Critical for MVP 0.5
- [ ] **Auth Setup** - P0 - [[../../02_Specs/001-Auth-Setup|Spec]] - 2d
  - Clerk integration
  - Two user roles (facilitator/participant)
  
- [ ] **Workshop Flow UI** - P0 - [[../../02_Specs/002-Workshop-Flow|Spec]] - 3d
  - Step container component
  - Progress bar
  - Navigation controls
  
- [ ] **AI Chat Integration** - P0 - [[../../02_Specs/003-AI-Chat|Spec]] - 3d
  - Gemini API setup
  - Chat interface
  - Context management
  
- [ ] **State Persistence** - P0 - [[../../02_Specs/004-State-Management|Spec]] - 2d
  - Database schema
  - Save/load functionality
  
- [ ] **Admin Dashboard** - P0 - [[../../02_Specs/005-Admin-Dashboard|Spec]] - 2d
  - View participant progress
  - Read responses

---

## Future Sprints (Needs Refinement)

### P1 - High Priority (MVP 1.0)
- [ ] Multiple workshop templates
- [ ] Workshop builder interface
- [ ] Enhanced AI prompts per step
- [ ] Export to PDF
- [ ] Email notifications
- [ ] Mobile responsive design

### P2 - Medium Priority
- [ ] Real-time updates
- [ ] Collaborative features
- [ ] Rich text editor
- [ ] File uploads
- [ ] Analytics dashboard
- [ ] Participant feedback system

### P3 - Low Priority / Nice to Have
- [ ] Video integration
- [ ] Custom branding
- [ ] API access
- [ ] Integrations (Slack, Teams)
- [ ] Multi-language support
- [ ] Dark mode

---

## Icebox (Captured, Not Prioritized)

- Calendar integration for scheduling workshops
- Pre-workshop questionnaires
- Post-workshop follow-ups
- AI-suggested workshop paths based on goals
- Template marketplace
- Facilitator community features
- Workshop recording/playback
- Gamification elements

---

## Technical Debt

- [ ] Add error boundaries
- [ ] Implement proper logging
- [ ] Add E2E tests
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Security review

---

## Completed ✅

(Move items here as they're completed)

---

## Notes

- Estimate format: `Xd` = X days, `Xh` = X hours
- Link to specs for anything complex
- Review backlog weekly to reprioritize