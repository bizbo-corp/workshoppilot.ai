# Requirements: WorkshopPilot.ai

**Defined:** 2026-02-07
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge.

## v1 Requirements

Requirements for MVP 0.5 — Application Shell. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up and sign in via Clerk (email + password)
- [ ] **AUTH-02**: System supports two roles: facilitator and participant
- [ ] **AUTH-03**: Facilitator can access admin/dashboard routes; participant cannot
- [ ] **AUTH-04**: Protected routes redirect unauthenticated users to sign-in
- [ ] **AUTH-05**: User session persists across browser refresh

### Application Scaffolding

- [ ] **SCAF-01**: App shell with header (logo, user menu), sidebar (step list), and main content area
- [ ] **SCAF-02**: Desktop-first layout with consistent navigation across all pages
- [ ] **SCAF-03**: Route structure follows `/workshop/[sessionId]/step/[stepId]` pattern
- [ ] **SCAF-04**: Landing page with clear "Start Workshop" entry point

### Workshop Steps

- [ ] **STEP-01**: All 10 design thinking steps exist as routable pages with titles
- [ ] **STEP-02**: Each step displays its name, number, and placeholder instructions
- [ ] **STEP-03**: Step content area is ready to receive AI chat and form components (hollow container)

### Navigation & Progress

- [ ] **NAV-01**: Linear stepper/progress bar shows all 10 steps with current position
- [ ] **NAV-02**: Steps display states: complete (checkmark), current (highlighted), upcoming (disabled)
- [ ] **NAV-03**: "Next" button advances to the next step
- [ ] **NAV-04**: "Back" button returns to the previous step
- [ ] **NAV-05**: Sequential enforcement — user cannot skip ahead to uncompleted steps

### Database

- [ ] **DATA-01**: Neon Postgres database provisioned and connected
- [ ] **DATA-02**: Drizzle ORM configured with schema definition and migration workflow
- [ ] **DATA-03**: Database connection works in Vercel serverless environment (edge-compatible driver)

### AI Chat Integration

- [ ] **CHAT-01**: Gemini API connected via Vercel AI SDK with streaming responses
- [ ] **CHAT-02**: Basic chat interface component (message input, send button, message history)
- [ ] **CHAT-03**: Chat UI displays at each step (same generic AI, not yet step-specific)
- [ ] **CHAT-04**: AI responses stream in real-time (typing indicator, progressive display)

### Deployment

- [ ] **DEPLOY-01**: Application deploys to Vercel from main branch
- [ ] **DEPLOY-02**: Environment variables configured for Clerk, Neon, and Gemini API keys
- [ ] **DEPLOY-03**: Application accessible via workshoppilot.ai domain

## v2 Requirements

Deferred to MVP 1.0 and beyond. Tracked but not in current roadmap.

### MVP 1.0 — Working AI Facilitation

- **FLOW-01**: AI facilitator guides each step with step-specific prompts and conversational arc
- **FLOW-02**: Context flows forward — each step's outputs inform subsequent steps
- **FLOW-03**: Step context files generated on completion (conversation summary + structured output)
- **FLOW-04**: Workshop/session database schema (workshops, sessions, step_responses, chat_messages)
- **FLOW-05**: Save/resume — user can close browser and return to where they left off
- **FLOW-06**: Auto-save on every significant action
- **FLOW-07**: Basic admin dashboard — facilitator views participant progress (read-only)
- **FLOW-08**: Build Pack export — PRD, user stories, tech specs as markdown
- **FLOW-09**: Dot voting for idea selection
- **FLOW-10**: Billboard Hero exercise (text-based pitch test)

### MMP — Visual & Collaborative

- **VIS-01**: Canvas tool with post-its (Tldraw or ReactFlow)
- **VIS-02**: Split-screen mode (chat + canvas/form side-by-side)
- **VIS-03**: Timer function for time-boxed exercises
- **VIS-04**: Multi-user collaboration (invite participants to workshop)
- **VIS-05**: Responsive tablet support
- **VIS-06**: OAuth (Google) authentication
- **VIS-07**: Video explanations per step

### FFP — Full Platform

- **FFP-01**: Real-time multiplayer (WebSockets)
- **FFP-02**: EzyDraw in-app sketching component
- **FFP-03**: AI + canvas integration (auto-suggest, auto-complete nodes)
- **FFP-04**: Voice input
- **FFP-05**: Mobile participant mode
- **FFP-06**: SSO/2FA authentication
- **FFP-07**: Stakeholder collateral generation (PowerPoint, reports)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile apps | Web-first; assess demand after FFP |
| Offline mode | Requires significant architecture for minimal MVP value |
| White-label solution | Premature before product-market fit |
| Video conferencing | Rely on external tools (Zoom, Teams) |
| Multi-language support | English first; internationalize later |
| Custom branding per org | FFP at earliest |
| Pricing/billing system | Free during validation phase |
| Workshop marketplace | Requires user base to populate |
| Custom methodology support | Design thinking only; Lean Startup, JTBD come later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| SCAF-01 | Phase 3 | Pending |
| SCAF-02 | Phase 3 | Pending |
| SCAF-03 | Phase 3 | Pending |
| SCAF-04 | Phase 3 | Pending |
| STEP-01 | Phase 3 | Pending |
| STEP-02 | Phase 3 | Pending |
| STEP-03 | Phase 3 | Pending |
| NAV-01 | Phase 4 | Pending |
| NAV-02 | Phase 4 | Pending |
| NAV-03 | Phase 4 | Pending |
| NAV-04 | Phase 4 | Pending |
| NAV-05 | Phase 4 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| CHAT-01 | Phase 5 | Pending |
| CHAT-02 | Phase 5 | Pending |
| CHAT-03 | Phase 5 | Pending |
| CHAT-04 | Phase 5 | Pending |
| DEPLOY-01 | Phase 6 | Pending |
| DEPLOY-02 | Phase 6 | Pending |
| DEPLOY-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27 (100% coverage)
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after roadmap creation*
