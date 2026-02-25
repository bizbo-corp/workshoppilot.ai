# Roadmap: WorkshopPilot.ai

## Milestones

- ✅ **v0.5 Application Shell** — Phases 1-6 (shipped 2026-02-08)
- ✅ **v1.0 Working AI Facilitation** — Phases 7-14 (shipped 2026-02-10)
- ✅ **v1.1 Canvas Foundation** — Phases 15-20 (shipped 2026-02-11)
- ✅ **v1.2 Canvas Whiteboard** — Phases 21-24 (shipped 2026-02-12)
- ✅ **v1.3 EzyDraw & Visual Ideation** — Phases 25-29 (shipped 2026-02-12)
- ✅ **v1.4 Personal Workshop Polish** — Phases 30-35 (shipped 2026-02-13)
- ✅ **v1.5 Launch Ready** — Phases 36-39 (shipped 2026-02-19)
- 🚧 **v1.6 Production Polish** — Phases 40-42 (in progress)

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

### 🚧 v1.6 Production Polish (In Progress)

**Milestone Goal:** Make WorkshopPilot.ai production-ready with working auth, Google OAuth, first-run onboarding, and visual polish across all surfaces.

## Phase Details

### Phase 40: Production Auth
**Goal**: Users can sign in and sign up on workshoppilot.ai without friction
**Depends on**: Phase 39 (prior milestone complete)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Sign-in button is visible on the production site homepage and landing page
  2. User can create an account with email/password on workshoppilot.ai
  3. User can sign in with Google OAuth (one-click) on the production site
  4. Clerk environment variables and allowed origins are correctly configured for the workshoppilot.ai domain
**Plans**: 2 plans

Plans:
- [ ] 40-01-PLAN.md — Fix sign-in button visibility, restyle as secondary, configure Clerk olive appearance, update auth modals
- [ ] 40-02-PLAN.md — Add Google OAuth + Apple sign-in social providers, style social buttons, verify end-to-end on production

### Phase 41: User Onboarding
**Goal**: New users understand the app immediately without needing external documentation
**Depends on**: Phase 40
**Requirements**: ONBD-01, ONBD-02, ONBD-03
**Success Criteria** (what must be TRUE):
  1. First-time user sees a guided welcome tour highlighting chat, canvas, steps, and navigation
  2. Tour can be dismissed mid-flow and does not reappear on subsequent visits or sessions
  3. Tour only references UI elements present in the current step context (no phantom references)
**Plans**: TBD

Plans:
- [ ] 41-01: Build welcome tour component with step-aware highlights and persistent dismissal state

### Phase 42: Visual Polish
**Goal**: Every surface of the app looks intentional, consistent, and responsive to user interaction
**Depends on**: Phase 40
**Requirements**: VISL-01, VISL-02, VISL-03, VISL-04, VISL-05, VISL-06
**Success Criteria** (what must be TRUE):
  1. No component deviates from the olive token system — zero hardcoded gray/blue/white classes visible
  2. Navigating between workshop steps transitions smoothly without jarring page snaps
  3. Every button, card, and link shows a consistent hover/active state matching the olive design language
  4. Content areas that previously flashed or popped in now display loading skeletons during data fetch
  5. User actions (save, delete, errors) produce visible toast notifications with appropriate messaging
**Plans**: TBD

Plans:
- [ ] 42-01: Audit and fix remaining olive theme gaps across all components
- [ ] 42-02: Add page/route transitions and loading skeletons for content areas
- [ ] 42-03: Implement consistent hover/active states, toast notifications, and micro-interactions

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
| 40. Production Auth | v1.6 | 0/2 | Not started | - |
| 41. User Onboarding | v1.6 | 0/1 | Not started | - |
| 42. Visual Polish | v1.6 | 0/3 | Not started | - |

**Total project:** 113 plans across 39 phases (7 milestones shipped) + v1.6 in progress

---
*Last updated: 2026-02-25 — v1.6 Production Polish roadmap created*
