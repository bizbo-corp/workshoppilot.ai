# Roadmap: WorkshopPilot.ai

## Milestones

- ✅ **v0.5 Application Shell** - Phases 1-6 (shipped 2026-02-08)
- ✅ **v1.0 Working AI Facilitation** - Phases 7-14 (shipped 2026-02-10)
- ✅ **v1.1 Canvas Foundation** - Phases 15-20 (shipped 2026-02-11)
- ✅ **v1.2 Canvas Whiteboard** - Phases 21-24 (shipped 2026-02-12)
- 📋 **MMP Visual & Collaborative** - Phases 25+ (planned)

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

## ✅ v1.2 Canvas Whiteboard (Complete)

**Milestone Goal:** Evolve canvas from post-it board to structured whiteboard with grid/swimlane layouts, AI-driven placement, and output-to-canvas migration for Steps 2 & 4.

### Phase 21: Grid Foundation & Coordinate System ✓
**Goal**: Establish grid architecture, coordinate translation, and snap-to-cell logic for Step 6 Journey Map
**Depends on**: Phase 20
**Requirements**: GRID-01, GRID-02, GRID-03, GRID-04, GRID-05, GRID-06
**Status**: Complete (2026-02-11) — 11/11 must-haves verified
**Plans**: 2/2 complete

Plans:
- [x] 21-01-PLAN.md -- Grid coordinate system, types, step config, PostIt extension
- [x] 21-02-PLAN.md -- Grid overlay component, canvas integration, snap/highlight, context assembly

### Phase 22: Dynamic Grid Structure (Column Management) ✓
**Goal**: Enable user-controlled journey stage columns with add/remove/edit operations
**Depends on**: Phase 21
**Requirements**: DCOL-01, DCOL-02, DCOL-03
**Status**: Complete (2026-02-11) — 6/6 must-haves verified
**Plans**: 2/2 complete

Plans:
- [x] 22-01-PLAN.md — Enlarge grid cells, extend canvas store with dynamic column state, post-it auto-size and drag feedback
- [x] 22-02-PLAN.md — Column UI: editable headers, +Add Stage button, delete confirmation dialog, grid overlay wiring

### Phase 23: AI Suggest-Then-Confirm Placement ✓
**Goal**: AI proposes content with specific cell placement, user confirms or adjusts
**Depends on**: Phase 22
**Requirements**: AIPL-01, AIPL-02, AIPL-03, AIPL-04, AIPL-05
**Status**: Complete (2026-02-11) — 6/6 must-haves verified
**Plans**: 2/2 complete

Plans:
- [x] 23-01-PLAN.md -- Store extensions (isPreview flag, confirm/reject actions), markup parser ([GRID_ITEM] support), AI prompt update, context filter
- [x] 23-02-PLAN.md -- Preview node UI in PostItNode, ReactFlowCanvas wiring, yellow pulse cell highlight, chat-panel cell highlighting

### Phase 24: Output-to-Canvas Retrofit (Steps 2 & 4) ✓
**Goal**: Migrate Steps 2 & 4 from output panel to canvas-first rendering with unified data model
**Depends on**: Phase 21 (coordinate system), Phase 23 (AI placement patterns)
**Requirements**: RETRO-01, RETRO-02, RETRO-03, RETRO-04
**Status**: Complete (2026-02-12) — 28/28 must-haves verified
**Plans**: 3/3 complete

Plans:
- [x] 24-01-PLAN.md — Ring layout types, empathy zone types, step config updates, canvas position extensions, migration helpers
- [x] 24-02-PLAN.md — ConcentricRingsOverlay, EmpathyMapOverlay components, ReactFlowCanvas integration
- [x] 24-03-PLAN.md — Step container canvas-only retrofit, lazy migration at page level, Add to Whiteboard updates

## Progress

**Execution Order:**
Phases execute in numeric order: 21 → 22 → 23 → 24 → ...

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v0.5 | 19/19 | Complete | 2026-02-08 |
| 7-14 | v1.0 | 25/25 | Complete | 2026-02-10 |
| 15-20 | v1.1 | 15/15 | Complete | 2026-02-11 |
| 21. Grid Foundation | v1.2 | 2/2 | Complete | 2026-02-11 |
| 22. Dynamic Grid Structure | v1.2 | 2/2 | Complete | 2026-02-11 |
| 23. AI Placement | v1.2 | 2/2 | Complete | 2026-02-11 |
| 24. Output-to-Canvas Retrofit | v1.2 | 3/3 | Complete | 2026-02-12 |

---
*Last updated: 2026-02-12 after Phase 24 execution complete — v1.2 milestone shipped*
