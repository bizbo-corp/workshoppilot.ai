# Roadmap: WorkshopPilot.ai

## Milestones

- ✅ **v0.5 Application Shell** — Phases 1-6 (shipped 2026-02-08)
- ✅ **v1.0 Working AI Facilitation** — Phases 7-14 (shipped 2026-02-10)
- ✅ **v1.1 Canvas Foundation** — Phases 15-20 (shipped 2026-02-11)
- ✅ **v1.2 Canvas Whiteboard** — Phases 21-24 (shipped 2026-02-12)
- ✅ **v1.3 EzyDraw & Visual Ideation** — Phases 25-29 (shipped 2026-02-12)
- ✅ **v1.4 Personal Workshop Polish** — Phases 30-35 (shipped 2026-02-13)
- ✅ **v1.5 Launch Ready** — Phases 36-39 (shipped 2026-02-19)
- ✅ **v1.6 Production Polish** — Phases 40-42 (shipped 2026-02-25)
- 🚧 **v1.7 Build Pack** — Phases 43-46 (in progress)

## Phases

<details>
<summary>✅ v0.5 Application Shell (Phases 1-6) — SHIPPED 2026-02-08</summary>

- [x] Phase 1: Foundation & Environment (3/3 plans)
- [x] Phase 2: Authentication & Authorization (3/3 plans)
- [x] Phase 3: Application Shell (3/3 plans)
- [x] Phase 4: Workshop Data Layer (3/3 plans)
- [x] Phase 5: Basic AI Integration (4/4 plans)
- [x] Phase 6: Production Deployment (3/3 plans)

See `milestones/v0.5-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.0 Working AI Facilitation (Phases 7-14) — SHIPPED 2026-02-10</summary>

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
<summary>✅ v1.1 Canvas Foundation (Phases 15-20) — SHIPPED 2026-02-11</summary>

- [x] Phase 15: Canvas Infrastructure & SSR Safety (3/3 plans)
- [x] Phase 16: Split-Screen Layout & Step Container Integration (3/3 plans)
- [x] Phase 17: Canvas Core Interactions (3/3 plans)
- [x] Phase 18: Step-Specific Canvases - Steps 2 & 4 (2/2 plans)
- [x] Phase 19: AI-Canvas Integration (2/2 plans)
- [x] Phase 20: Bundle Optimization & Mobile Refinement (2/2 plans)

See `milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.2 Canvas Whiteboard (Phases 21-24) — SHIPPED 2026-02-12</summary>

- [x] Phase 21: Grid Foundation & Coordinate System (2/2 plans)
- [x] Phase 22: Dynamic Grid Structure - Column Management (2/2 plans)
- [x] Phase 23: AI Suggest-Then-Confirm Placement (2/2 plans)
- [x] Phase 24: Output-to-Canvas Retrofit - Steps 2 & 4 (3/3 plans)

See `milestones/v1.2-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.3 EzyDraw & Visual Ideation (Phases 25-29) — SHIPPED 2026-02-12</summary>

- [x] Phase 25: EzyDraw Foundation (6/6 plans)
- [x] Phase 26: Drawing-Canvas Integration (4/4 plans)
- [x] Phase 27: UI Kit & Advanced Tools (3/3 plans)
- [x] Phase 28: Mind Map & Crazy 8s Canvases (6/6 plans)
- [x] Phase 29: Visual Concept Cards (4/4 plans)

See `milestones/v1.3-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.4 Personal Workshop Polish (Phases 30-35) — SHIPPED 2026-02-13</summary>

- [x] Phase 30: UX Polish (3/3 plans)
- [x] Phase 31: Output Panel Retirement (1/1 plan)
- [x] Phase 32: Workshop Management (2/2 plans)
- [x] Phase 33: AI Personality (2/2 plans)
- [x] Phase 34: Seed Data (2/2 plans)
- [x] Phase 35: E2E Testing (3/3 plans)

See `milestones/v1.4-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.5 Launch Ready (Phases 36-39) — SHIPPED 2026-02-19</summary>

- [x] Phase 36: Olive Theme Rollout (4/4 plans)
- [x] Phase 37: Landing Page (2/2 plans)
- [x] Phase 38: Pricing Page (1/1 plan)
- [x] Phase 39: Step 10 Outputs Shell (2/2 plans)

See `milestones/v1.5-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.6 Production Polish (Phases 40-42) — SHIPPED 2026-02-25</summary>

- [x] Phase 40: Production Auth (2/2 plans)
- [ ] Phase 41: User Onboarding (0/1 plans — deferred)
- [x] Phase 42: Visual Polish (3/3 plans)

See `milestones/v1.6-ROADMAP.md` for full details.

</details>

### 🚧 v1.7 Build Pack (In Progress)

**Milestone Goal:** Make the workshop produce tangible, AI-coder-ready output. Users complete Step 10, trigger AI generation of PRD and Tech Specs from their 10 steps of workshop data, and download the deliverables from a dedicated outputs page.

- [ ] **Phase 43: Workshop Completion** - AI-guided final review in Step 10 + workshop marked complete in DB
- [ ] **Phase 44: AI Deliverable Generation** - Gemini generates PRD and Tech Specs (Markdown + JSON) from all 10 step artifacts
- [ ] **Phase 45: Outputs Page** - Dedicated `/workshop/[id]/outputs` page with deliverable cards, detail view, copy, and download
- [ ] **Phase 46: Dashboard Routing** - Completed workshops route to outputs page; in-progress continue to resume position

## Phase Details

### Phase 43: Workshop Completion
**Goal**: Users can complete a workshop in Step 10 with AI-guided review, and that completion status persists in the database as the trigger for deliverable generation.
**Depends on**: Phase 42 (v1.6 — Step 10 shell with disabled deliverable cards already exists)
**Requirements**: COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. User reaches Step 10 and sees an AI-facilitated summary of key decisions from all 10 steps
  2. User can click a "Complete Workshop" action that visibly marks the workshop as done
  3. Completed workshop status persists in the database — page refresh shows the workshop remains complete
  4. The Step 10 UI reflects completed state (deliverable cards become active, no longer "Coming Soon")
**Plans**: 2 plans
Plans:
- [ ] 43-01-PLAN.md — Backend: completeWorkshop server action + API endpoint
- [ ] 43-02-PLAN.md — Frontend: Complete Workshop button + deliverable card activation

### Phase 44: AI Deliverable Generation
**Goal**: On workshop completion, Gemini generates a PRD and Tech Specs document from the full structured workshop data, stored as Markdown and JSON in the database.
**Depends on**: Phase 43 (completion status must exist before generation triggers)
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04
**Success Criteria** (what must be TRUE):
  1. After completing a workshop, a PRD document exists in the database containing sections derived from all 10 steps
  2. After completing a workshop, a Tech Specs document exists containing technical requirements derived from the workshop data
  3. Each deliverable is stored as both Markdown text and structured JSON, retrievable from the outputs page
  4. Generation uses the full context of all 10 step artifacts — outputs reference specific decisions from the workshop, not generic boilerplate
**Plans**: TBD

### Phase 45: Outputs Page
**Goal**: Users can navigate to `/workshop/[id]/outputs` to see their generated deliverables, read them in full, copy the content, and download as `.md` or JSON.
**Depends on**: Phase 44 (generated deliverables must exist to display)
**Requirements**: OUT-01, OUT-02, OUT-03, OUT-04, OUT-05, OUT-06, OUT-07
**Success Criteria** (what must be TRUE):
  1. User can navigate to `/workshop/[id]/outputs` and see cards for each generated deliverable (PRD, Tech Specs)
  2. User can click a deliverable card to open a detail view with the full rendered Markdown content
  3. User can copy the entire deliverable content to clipboard with a single click
  4. User can download the deliverable as a `.md` file and as a `.json` file
  5. User can navigate back to their workshop from the outputs page to review or revise steps
**Plans**: TBD

### Phase 46: Dashboard Routing
**Goal**: The dashboard correctly routes users based on workshop status — completed workshops go to the outputs page, in-progress workshops resume at the last active step.
**Depends on**: Phase 45 (outputs page must exist before routing to it)
**Requirements**: DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. User clicks a completed workshop on the dashboard and lands on `/workshop/[id]/outputs`, not the step view
  2. User clicks an in-progress workshop and resumes at their last active step, unchanged from existing behavior
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v0.5 | 19/19 | Complete | 2026-02-08 |
| 7-14 | v1.0 | 25/25 | Complete | 2026-02-10 |
| 15-20 | v1.1 | 15/15 | Complete | 2026-02-11 |
| 21-24 | v1.2 | 9/9 | Complete | 2026-02-12 |
| 25-29 | v1.3 | 23/23 | Complete | 2026-02-12 |
| 30-35 | v1.4 | 13/13 | Complete | 2026-02-13 |
| 36-39 | v1.5 | 9/9 | Complete | 2026-02-19 |
| 40-42 | v1.6 | 5/5 | Complete | 2026-02-25 |
| 43. Workshop Completion | 1/2 | In Progress|  | - |
| 44. AI Deliverable Generation | v1.7 | 0/? | Not started | - |
| 45. Outputs Page | v1.7 | 0/? | Not started | - |
| 46. Dashboard Routing | v1.7 | 0/? | Not started | - |

**Total project:** 118 plans across 42 phases (8 milestones shipped) + 4 phases planned for v1.7

---
*Last updated: 2026-02-25 — Phase 43 planned (2 plans)*
