# Requirements: WorkshopPilot.ai

**Defined:** 2026-02-08
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## v1.0 Requirements

Requirements for MVP 1.0 — Working AI Facilitation. Each maps to roadmap phases.

### Context Architecture

- [ ] **CTX-01**: System stores structured JSON artifacts per step (HMW statement, stakeholder map, persona, etc.)
- [ ] **CTX-02**: System generates conversation summaries when steps are completed
- [ ] **CTX-03**: AI receives prior step artifacts + summaries as context when starting each step
- [ ] **CTX-04**: System uses hierarchical context compression (short-term, long-term, persistent tiers)

### AI Facilitation Engine

- [ ] **AIE-01**: Each step has a step-specific system prompt with context injection from prior steps
- [ ] **AIE-02**: AI follows 6-phase conversational arc per step (Orient → Gather → Synthesize → Refine → Validate → Complete)
- [ ] **AIE-03**: AI explains step purpose and references prior outputs when orienting user
- [ ] **AIE-04**: AI validates step output against quality criteria before allowing progression
- [ ] **AIE-05**: AI references prior step outputs by name in conversation ("Based on your persona Sarah...")

### Structured Outputs

- [ ] **OUT-01**: Each step produces a typed JSON artifact matching a Zod schema
- [ ] **OUT-02**: System extracts structured outputs from conversation using AI with retry logic
- [ ] **OUT-03**: User sees extracted output and confirms before step is marked complete
- [ ] **OUT-04**: Structured outputs render as formatted Markdown in the UI

### Navigation & Persistence

- [ ] **NAV-01**: User can navigate back to any completed step and view its output
- [ ] **NAV-02**: User can revise earlier steps; downstream steps marked as needing regeneration
- [ ] **NAV-03**: System auto-saves conversation periodically and on step completion
- [ ] **NAV-04**: User can resume a workshop from where they left off

### Step 1: Challenge

- [ ] **S01-01**: AI guides user from vague idea to structured Challenge Statement
- [ ] **S01-02**: System produces HMW statement with problem core, target user, and altitude check

### Step 2: Stakeholder Mapping

- [ ] **S02-01**: AI helps user brainstorm and categorize stakeholders
- [ ] **S02-02**: System produces hierarchical stakeholder list with priorities (Core/Direct/Indirect)

### Step 3: User Research

- [ ] **S03-01**: AI generates interview questions based on stakeholder map
- [ ] **S03-02**: AI simulates stakeholder responses as synthetic interviews
- [ ] **S03-03**: System produces research quotes and key insights

### Step 4: Research Sense Making

- [ ] **S04-01**: AI clusters research quotes into themes
- [ ] **S04-02**: System produces 5 top pains and 5 top gains with evidence

### Step 5: Persona Development

- [ ] **S05-01**: AI synthesizes research into persona with name, role, bio, quote, pains, gains
- [ ] **S05-02**: Persona pains/gains trace back to Step 4 research themes

### Step 6: Journey Mapping

- [ ] **S06-01**: AI auto-generates journey map (4-8 stages × 5 layers) based on persona
- [ ] **S06-02**: System identifies "the dip" (biggest pain point / opportunity area)

### Step 7: Reframing Challenge

- [ ] **S07-01**: AI suggests HMW statement components with options for each field
- [ ] **S07-02**: System validates HMW alignment with challenge, persona, and journey dip

### Step 8: Ideation

- [ ] **S08-01**: AI facilitates text-based mind mapping with themes and ideas
- [ ] **S08-02**: User can add their own ideas alongside AI suggestions
- [ ] **S08-03**: AI facilitates brain writing (building on existing ideas)

### Step 9: Concept Development

- [ ] **S09-01**: AI generates concept sheet with name, elevator pitch, and USP
- [ ] **S09-02**: AI produces SWOT analysis and feasibility scores with rationale

### Step 10: Validate

- [ ] **S10-01**: AI generates synthesis summary recapping the full 10-step journey
- [ ] **S10-02**: Summary includes key outputs from each step (challenge, persona, HMW, concept)

### Production Hardening

- [ ] **PROD-01**: System implements rate limit handling with exponential backoff and user feedback
- [ ] **PROD-02**: System implements database connection warming to prevent cold start delays
- [ ] **PROD-03**: System handles streaming interruptions gracefully with reconnection

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Build Pack Export

- **BPAK-01**: System generates PRD document from workshop outputs
- **BPAK-02**: System generates user stories formatted for AI coders
- **BPAK-03**: Build Pack downloadable as Markdown/PDF

### Enhanced Ideation

- **IDEAT-01**: Dot voting for idea selection across multiple concepts
- **IDEAT-02**: Billboard Hero exercise (text-based pitch test)
- **IDEAT-03**: Mind map "I'm stuck" wildcard prompts for creative blocks

### Enhanced Evaluation

- **EVAL-01**: Concept comparison side-by-side
- **EVAL-02**: AI gap analysis for incomplete concept sheets
- **EVAL-03**: Elevator pitch improvement suggestions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Visual canvas tools (Tldraw/ReactFlow) | High UI complexity; text-based validates the flow first. Defer to MMP. |
| Split-screen mode (chat + canvas) | Layout complexity; chat-only is sufficient for v1.0. |
| Real-time collaboration | WebSocket complexity, state sync, conflict resolution — scope explosion. Defer to MMP. |
| Voice input | Transcription overhead; text validates flow first. Defer to FFP. |
| Multi-language support | Translation, cultural adaptation, testing overhead. English first. |
| Visual persona cards / journey map canvas | Image generation and drag-and-drop; text/table format validates first. |
| Stakeholder collateral export (PowerPoint, reports) | Build Pack is priority output; collateral deferred to MMP+. |
| OAuth (Google) login | Clerk email/password sufficient for v1.0. |
| Mobile/tablet support | Desktop-first; responsive design deferred to MMP. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CTX-01 | — | Pending |
| CTX-02 | — | Pending |
| CTX-03 | — | Pending |
| CTX-04 | — | Pending |
| AIE-01 | — | Pending |
| AIE-02 | — | Pending |
| AIE-03 | — | Pending |
| AIE-04 | — | Pending |
| AIE-05 | — | Pending |
| OUT-01 | — | Pending |
| OUT-02 | — | Pending |
| OUT-03 | — | Pending |
| OUT-04 | — | Pending |
| NAV-01 | — | Pending |
| NAV-02 | — | Pending |
| NAV-03 | — | Pending |
| NAV-04 | — | Pending |
| S01-01 | — | Pending |
| S01-02 | — | Pending |
| S02-01 | — | Pending |
| S02-02 | — | Pending |
| S03-01 | — | Pending |
| S03-02 | — | Pending |
| S03-03 | — | Pending |
| S04-01 | — | Pending |
| S04-02 | — | Pending |
| S05-01 | — | Pending |
| S05-02 | — | Pending |
| S06-01 | — | Pending |
| S06-02 | — | Pending |
| S07-01 | — | Pending |
| S07-02 | — | Pending |
| S08-01 | — | Pending |
| S08-02 | — | Pending |
| S08-03 | — | Pending |
| S09-01 | — | Pending |
| S09-02 | — | Pending |
| S10-01 | — | Pending |
| S10-02 | — | Pending |
| PROD-01 | — | Pending |
| PROD-02 | — | Pending |
| PROD-03 | — | Pending |

**Coverage:**
- v1.0 requirements: 35 total
- Mapped to phases: 0
- Unmapped: 35 ⚠️

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after initial definition*
