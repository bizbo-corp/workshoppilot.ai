# Roadmap: WorkshopPilot.ai

## Milestones

- ✅ **v0.5 Application Shell** - Phases 1-6 (shipped 2026-02-08)
- ✅ **v1.0 Working AI Facilitation** - Phases 7-14 (shipped 2026-02-10)
- ✅ **v1.1 Canvas Foundation** - Phases 15-20 (shipped 2026-02-11)
- ✅ **v1.2 Canvas Whiteboard** - Phases 21-24 (shipped 2026-02-12)
- ✅ **v1.3 EzyDraw & Visual Ideation** - Phases 25-29 (shipped 2026-02-12)
- 🚧 **v1.4 Personal Workshop Polish** - Phases 30-35 (in progress)

## Phases

<details>
<summary>✅ v0.5 Application Shell (Phases 1-6) - SHIPPED 2026-02-08</summary>

- [x] Phase 1: Foundation & Environment (3/3 plans)
- [x] Phase 2: Authentication & Authorization (3/3 plans)
- [x] Phase 3: Application Shell (3/3 plans)
- [x] Phase 4: Workshop Data Layer (3/3 plans)
- [x] Phase 5: Basic AI Integration (4/4 plans)
- [x] Phase 6: Production Deployment (3/3 plans)

See `milestones/v0.5-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.0 Working AI Facilitation (Phases 7-14) - SHIPPED 2026-02-10</summary>

- [x] Phase 7: Context Architecture (3/3 plans)
- [x] Phase 8: AI Facilitation Engine (3/3 plans)
- [x] Phase 9: Structured Outputs (3/3 plans)
- [x] Phase 10: Navigation & Persistence (2/2 plans)
- [x] Phase 11: Discovery Steps 1-4 (3/3 plans)
- [x] Phase 12: Definition Steps 5-7 (3/3 plans)
- [x] Phase 13: Ideation & Validation Steps 8-10 (3/3 plans)
- [x] Phase 13.1: Reset Step & Step 8 Sub-Steps (3/3 plans)
- [x] Phase 14: Production Hardening (2/2 plans)

See `milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.1 Canvas Foundation (Phases 15-20) - SHIPPED 2026-02-11</summary>

- [x] Phase 15: Canvas Infrastructure & SSR Safety (3/3 plans)
- [x] Phase 16: Split-Screen Layout & Step Container Integration (3/3 plans)
- [x] Phase 17: Canvas Core Interactions (3/3 plans)
- [x] Phase 18: Step-Specific Canvases - Steps 2 & 4 (2/2 plans)
- [x] Phase 19: AI-Canvas Integration (2/2 plans)
- [x] Phase 20: Bundle Optimization & Mobile Refinement (2/2 plans)

See `milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.2 Canvas Whiteboard (Phases 21-24) - SHIPPED 2026-02-12</summary>

- [x] Phase 21: Grid Foundation & Coordinate System (2/2 plans)
- [x] Phase 22: Dynamic Grid Structure - Column Management (2/2 plans)
- [x] Phase 23: AI Suggest-Then-Confirm Placement (2/2 plans)
- [x] Phase 24: Output-to-Canvas Retrofit - Steps 2 & 4 (3/3 plans)

See `milestones/v1.2-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.3 EzyDraw & Visual Ideation (Phases 25-29) - SHIPPED 2026-02-12</summary>

- [x] Phase 25: EzyDraw Foundation (6/6 plans)
- [x] Phase 26: Drawing-Canvas Integration (4/4 plans)
- [x] Phase 27: UI Kit & Advanced Tools (3/3 plans)
- [x] Phase 28: Mind Map & Crazy 8s Canvases (6/6 plans)
- [x] Phase 29: Visual Concept Cards (4/4 plans)

See `milestones/v1.3-ROADMAP.md` for full details.

</details>

### 🚧 v1.4 Personal Workshop Polish (In Progress)

**Milestone Goal:** Polish the personal workshop experience with UX refinements, AI personality, comprehensive testing, and seed data for demonstration. Focus on quality and completeness before collaboration features.

#### Phase 30: UX Polish

**Goal**: Fix visual and interaction bugs affecting user experience with post-its, canvas, and chat.

**Depends on**: Phase 29

**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07

**Success Criteria** (what must be TRUE):
1. Post-it nodes show visible drag feedback (ghost trail or faint copy) while dragging
2. Post-it hover state shows pointer cursor, not grab hand
3. Canvas panels have visible borders separating them from surrounding UI
4. Resizable panels show grip handle on hover for discoverability
5. Canvas whiteboard displays faint grey background with dot grid pattern
6. Chat panel auto-scrolls to bottom when new messages arrive and on page load
7. Journey Map page does not create duplicate cards on load

**Plans:** 3 plans

Plans:
- [x] 30-01-PLAN.md -- Canvas visual polish (drag feedback, hover cursor, dot grid background)
- [x] 30-02-PLAN.md -- Panel borders and grip handles
- [x] 30-03-PLAN.md -- Chat auto-scroll fix and Journey Map duplicate card bug

#### Phase 31: Output Panel Retirement

**Goal**: Hide output panel from production users while preserving developer access for debugging.

**Depends on**: Phase 30

**Requirements**: PANEL-01, PANEL-02

**Success Criteria** (what must be TRUE):
1. Output panel is hidden by default for all users in production
2. Localhost developers can toggle output panel visibility via footer button
3. Output panel toggle state persists across page navigation in dev mode

**Plans:** 1 plan

Plans:
- [x] 31-01-PLAN.md -- Dev output hook, gate output panel visibility, add localhost toggle to footer

#### Phase 32: Workshop Management

**Goal**: Users can manage their workshop list by selecting and deleting workshops with soft delete protection.

**Depends on**: Phase 31

**Requirements**: MGMT-01, MGMT-02, MGMT-03

**Success Criteria** (what must be TRUE):
1. User can select one or more workshops on dashboard via checkbox
2. User can delete selected workshops via delete button with confirmation dialog
3. Deleted workshops are soft deleted (hidden from UI but recoverable in database)
4. Dashboard updates immediately after deletion without page refresh

**Plans:** 2 plans

Plans:
- [x] 32-01-PLAN.md -- Soft delete schema (deletedAt column), deleteWorkshops server action, dashboard query filter
- [x] 32-02-PLAN.md -- Dashboard selection UI (checkboxes, select all, delete button, confirmation dialog)

#### Phase 33: AI Personality

**Goal**: AI facilitator exhibits consistent sharp consultant personality with charismatic energy, natural conversational flow, and canvas-aware bridging.

**Depends on**: Phase 32

**Requirements**: AI-01, AI-02, AI-03, AI-04

**Success Criteria** (what must be TRUE):
1. AI facilitator personality is documented in soul.md (sharp consultant with "you got this!" charisma)
2. AI messages are split into shorter natural conversational turns instead of wall-of-text responses
3. AI references canvas items naturally when bridging between chat and whiteboard interactions
4. All 10 steps exhibit consistent personality and tone across Orient → Gather → Synthesize → Refine → Validate → Complete phases

**Plans**: TBD

Plans:
- [ ] 33-01: TBD during planning

#### Phase 34: Seed Data

**Goal**: Developers can seed a complete PawPal workshop demonstrating all 10 steps with realistic canvas state.

**Depends on**: Phase 33

**Requirements**: SEED-01, SEED-02, SEED-03

**Success Criteria** (what must be TRUE):
1. CLI seed command creates full PawPal workshop with structured artifacts across all 10 steps
2. Seeded workshop includes canvas state (post-its in Step 2/4, grid items in Step 6, mind map in Step 8a, Crazy 8s sketches in Step 8b, concept cards in Step 9)
3. Seeded workshop appears on dashboard and is fully navigable through all steps
4. Seeded data demonstrates realistic design thinking workshop progression

**Plans**: TBD

Plans:
- [ ] 34-01: TBD during planning

#### Phase 35: E2E Testing

**Goal**: Complete end-to-end testing pass validates all 10 steps work correctly with proper context flow, state persistence, and AI facilitation.

**Depends on**: Phase 34

**Requirements**: E2E-01, E2E-02, E2E-03

**Success Criteria** (what must be TRUE):
1. All 10 steps are walkable end-to-end with smooth transitions, correct AI prompts, and proper structured output extraction
2. Canvas state persists correctly when navigating backward/forward between steps
3. AI context compression maintains quality through all 10 steps without degradation or missing context
4. Back-revise navigation correctly invalidates downstream steps when upstream data changes

**Plans**: TBD

Plans:
- [ ] 35-01: TBD during planning

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v0.5 | 19/19 | Complete | 2026-02-08 |
| 7-14 | v1.0 | 25/25 | Complete | 2026-02-10 |
| 15-20 | v1.1 | 15/15 | Complete | 2026-02-11 |
| 21-24 | v1.2 | 9/9 | Complete | 2026-02-12 |
| 25. EzyDraw Foundation | v1.3 | 6/6 | Complete | 2026-02-12 |
| 26. Drawing-Canvas Integration | v1.3 | 4/4 | Complete | 2026-02-12 |
| 27. UI Kit & Advanced Tools | v1.3 | 3/3 | Complete | 2026-02-12 |
| 28. Mind Map & Crazy 8s Canvases | v1.3 | 6/6 | Complete | 2026-02-12 |
| 29. Visual Concept Cards | v1.3 | 4/4 | Complete | 2026-02-12 |
| 30. UX Polish | v1.4 | 3/3 | Complete | 2026-02-13 |
| 31. Output Panel Retirement | v1.4 | 1/1 | Complete | 2026-02-13 |
| 32. Workshop Management | v1.4 | 2/2 | Complete | 2026-02-13 |
| 33. AI Personality | v1.4 | 0/TBD | Not started | - |
| 34. Seed Data | v1.4 | 0/TBD | Not started | - |
| 35. E2E Testing | v1.4 | 0/TBD | Not started | - |

**Total v1.3:** 23 plans across 5 phases
**Total project:** 93 plans across 29 phases, 5 milestones

---
*Last updated: 2026-02-13 after Phase 31 planning*
