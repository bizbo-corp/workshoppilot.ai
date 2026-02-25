# Requirements: WorkshopPilot.ai

**Defined:** 2026-02-25
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## v1 Requirements

Requirements for v1.6 Production Polish. Each maps to roadmap phases.

### Production Auth

- [x] **AUTH-01**: Sign-in button is visible and functional on production site (workshoppilot.ai)
- [x] **AUTH-02**: Clerk is correctly configured for the workshoppilot.ai domain (environment variables, allowed origins)
- [x] **AUTH-03**: User can sign in with Google OAuth (one-click alongside email/password)
- [x] **AUTH-04**: Sign-up and sign-in flows complete successfully on production

### Onboarding

- [ ] **ONBD-01**: First-time user sees a guided welcome tour highlighting key UI elements (chat, canvas, steps, navigation)
- [ ] **ONBD-02**: Tour can be dismissed and does not reappear on subsequent visits
- [ ] **ONBD-03**: Tour adapts to the current step context (doesn't reference elements not yet visible)

### Visual Polish

- [x] **VISL-01**: Fix remaining olive theme gaps — any components not matching the olive token system
- [x] **VISL-02**: Page/route transitions with smooth animation between workshop steps
- [ ] **VISL-03**: Consistent hover/active states on all interactive elements (buttons, cards, links)
- [x] **VISL-04**: Loading skeletons for content areas that flash or pop in
- [ ] **VISL-05**: Toast notifications for user actions (save, delete, error feedback)
- [ ] **VISL-06**: Micro-interactions on key UI elements (button clicks, card hovers, panel toggles, progress updates)

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Auth Extras

- **AUTH-05**: User can sign in with magic link (passwordless email)
- **AUTH-06**: User can manage account settings (profile, name/avatar, deletion)

### Onboarding Extras

- **ONBD-04**: Pre-populated sample workshop for users to explore the flow
- **ONBD-05**: Contextual help tooltips available throughout the app

### Visual Extras

- **VISL-07**: Dark mode refinement pass (ensure all surfaces look polished in dark mode)
- **VISL-08**: Responsive tablet layout optimization

## Out of Scope

| Feature | Reason |
|---------|--------|
| Build Pack export (actual document generation) | Separate milestone — large scope with PDF/PPTX generation |
| Payment/billing integration | Pricing page remains informational only |
| Multi-user collaboration | Deferred to FFP |
| Mobile-first responsive redesign | Desktop-first; tablet deferred to v2 |
| Custom branding/white-label | Premature before product-market fit |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 40 | Complete |
| AUTH-02 | Phase 40 | Complete |
| AUTH-03 | Phase 40 | Complete |
| AUTH-04 | Phase 40 | Complete |
| ONBD-01 | Phase 41 | Pending |
| ONBD-02 | Phase 41 | Pending |
| ONBD-03 | Phase 41 | Pending |
| VISL-01 | Phase 42 | Complete |
| VISL-02 | Phase 42 | Complete |
| VISL-03 | Phase 42 | Pending |
| VISL-04 | Phase 42 | Complete |
| VISL-05 | Phase 42 | Pending |
| VISL-06 | Phase 42 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 — AUTH-03, AUTH-04 marked complete after Phase 40 Plan 02 verification*
