# Requirements: WorkshopPilot.ai

**Defined:** 2026-02-13
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## v1.4 Requirements

Requirements for v1.4 Personal Workshop Polish. Each maps to roadmap phases.

### UX Polish

- [ ] **UX-01**: Post-it nodes show visual drag feedback (ghost trail or faint copy) while dragging
- [ ] **UX-02**: Post-it hover cursor is pointer (not grab hand)
- [ ] **UX-03**: Canvas panels have visible borders
- [ ] **UX-04**: Draggable panels show grip handle on hover
- [ ] **UX-05**: Canvas whiteboard has faint grey background with dot grid pattern
- [ ] **UX-06**: Chat panel auto-scrolls to bottom on new messages and page load
- [ ] **UX-07**: Journey Map page does not create duplicate cards on load

### Output Panel

- [ ] **PANEL-01**: Output panel is hidden by default for all users
- [ ] **PANEL-02**: Localhost-only toggle button in footer bar reveals output panel for dev inspection

### AI Personality

- [ ] **AI-01**: AI facilitator personality defined in soul.md (sharp consultant + charismatic, direct, "you got this!" energy)
- [ ] **AI-02**: AI messages split into shorter, natural conversational turns (not wall-of-text)
- [ ] **AI-03**: AI references canvas items naturally when bridging between chat and whiteboard
- [ ] **AI-04**: AI prompts across all 10 steps updated for consistent personality and tone

### Seed Data

- [ ] **SEED-01**: CLI seed command populates full PawPal workshop across all 10 steps with realistic structured artifacts
- [ ] **SEED-02**: Seed data includes canvas state (post-its, grid items, ring positions, mind map, Crazy 8s, concept cards)
- [ ] **SEED-03**: Seeded workshop visible on dashboard and navigable through all steps

### Workshop Management

- [ ] **MGMT-01**: User can select workshops on dashboard for bulk actions
- [ ] **MGMT-02**: User can delete selected workshops with confirmation dialog
- [ ] **MGMT-03**: Deletion is soft delete (deletedAt column, workshops hidden but recoverable)

### E2E Testing

- [ ] **E2E-01**: All 10 steps are walkable end-to-end with smooth transitions and correct context flow
- [ ] **E2E-02**: Canvas state persists correctly across step navigation (back/forward)
- [ ] **E2E-03**: AI context compression works correctly through all 10 steps without degradation

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### MMP (Visual & Solo Polish)

- **VIS-01**: Visual stakeholder radar chart
- **VIS-02**: Guided persona builder with per-field regeneration
- **VIS-03**: Billboard Hero exercise (text-based pitch test + EzyDraw visuals)
- **VIS-04**: Billboard template layouts
- **TIMER-01**: Timer function for time-boxed exercises
- **MOBILE-01**: Responsive tablet support
- **AUTH-01**: OAuth (Google)
- **CONTENT-01**: Video explanations per step
- **EXPORT-01**: Build Pack export (PRDs, user stories, tech specs for AI coders)

### FFP (Full Platform)

- **COLLAB-01**: Dot voting for idea selection
- **COLLAB-02**: Basic multi-user collaboration
- **COLLAB-03**: Brain Writing with real collaboration (multi-user)
- **COLLAB-04**: Real-time multiplayer (WebSockets)
- **DRAW-01**: EzyDraw AI Enhance (rough sketch → clean wireframe)
- **AI-EXT-01**: AI + canvas working side-by-side (auto-suggest, auto-complete nodes)
- **INPUT-01**: Voice input
- **AI-EXT-02**: AI pattern analysis and gap detection
- **EVAL-01**: Concept comparison (side-by-side evaluation)
- **EVAL-02**: A/B billboard variant generation
- **EXPORT-02**: Advanced stakeholder management collateral (PowerPoint, reports)
- **MOBILE-02**: Mobile participant mode
- **AUTH-02**: SSO/2FA authentication
- **PLATFORM-01**: Workshop marketplace / multiple templates

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile apps | Web-first, assess demand later |
| Offline mode | Requires significant architecture changes for minimal value |
| White-label solution | Premature before product-market fit |
| Video conferencing integration | Rely on external tools (Zoom, etc.) |
| Multi-language support | English first, internationalize later |
| Custom branding per organization | FFP at earliest |
| Pricing/billing system | Free during validation phase |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | Phase 30 | Pending |
| UX-02 | Phase 30 | Pending |
| UX-03 | Phase 30 | Pending |
| UX-04 | Phase 30 | Pending |
| UX-05 | Phase 30 | Pending |
| UX-06 | Phase 30 | Pending |
| UX-07 | Phase 30 | Pending |
| PANEL-01 | Phase 31 | Pending |
| PANEL-02 | Phase 31 | Pending |
| MGMT-01 | Phase 32 | Pending |
| MGMT-02 | Phase 32 | Pending |
| MGMT-03 | Phase 32 | Pending |
| AI-01 | Phase 33 | Pending |
| AI-02 | Phase 33 | Pending |
| AI-03 | Phase 33 | Pending |
| AI-04 | Phase 33 | Pending |
| SEED-01 | Phase 34 | Pending |
| SEED-02 | Phase 34 | Pending |
| SEED-03 | Phase 34 | Pending |
| E2E-01 | Phase 35 | Pending |
| E2E-02 | Phase 35 | Pending |
| E2E-03 | Phase 35 | Pending |

**Coverage:**
- v1.4 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

**100% coverage achieved.**

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after v1.4 roadmap creation*
