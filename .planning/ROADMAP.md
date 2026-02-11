# Roadmap: WorkshopPilot.ai

## Milestones

- ✅ **v0.5 Application Shell** - Phases 1-6 (shipped 2026-02-08)
- ✅ **v1.0 Working AI Facilitation** - Phases 7-14 (shipped 2026-02-10)
- ✅ **v1.1 Canvas Foundation** - Phases 15-20 (shipped 2026-02-11)
- 🚧 **v1.2 Canvas Whiteboard** - Phases 21-24 (in progress)
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

## 🚧 v1.2 Canvas Whiteboard (In Progress)

**Milestone Goal:** Evolve canvas from post-it board to structured whiteboard with grid/swimlane layouts, AI-driven placement, and output-to-canvas migration for Steps 2 & 4.

### Phase 21: Grid Foundation & Coordinate System
**Goal**: Establish grid architecture, coordinate translation, and snap-to-cell logic for Step 6 Journey Map
**Depends on**: Phase 20
**Requirements**: GRID-01, GRID-02, GRID-03, GRID-04, GRID-05, GRID-06
**Success Criteria** (what must be TRUE):
  1. User sees 7 fixed swimlane rows (Actions, Goals, Barriers, Touchpoints, Emotions, Moments of Truth, Opportunities) with labeled headers on Step 6 canvas
  2. Post-it items snap to cell boundaries when dragged and dropped, storing cell assignment alongside pixel position
  3. Grid overlay (lines, row labels, column headers) stays aligned with canvas during pan and zoom at all zoom levels (50%-250%)
  4. Target cell highlights with light blue background when user drags an item over it
  5. Grid canvas state persists to database via existing auto-save infrastructure without data loss
**Plans**: TBD

Plans:
- [ ] 21-01: TBD

### Phase 22: Dynamic Grid Structure (Column Management)
**Goal**: Enable user-controlled journey stage columns with add/remove/edit operations
**Depends on**: Phase 21
**Requirements**: DCOL-01, DCOL-02, DCOL-03
**Success Criteria** (what must be TRUE):
  1. User can add stage columns via "+Add Stage" button, provide a name, and see new column appear in grid
  2. User can inline-edit column header labels and changes persist immediately
  3. User can remove stage columns with confirmation dialog showing card migration, and cards move to adjacent column automatically
  4. Column operations (add/remove/edit) complete in under 500ms with smooth UI feedback
**Plans**: TBD

Plans:
- [ ] 22-01: TBD

### Phase 23: AI Suggest-Then-Confirm Placement
**Goal**: AI proposes content with specific cell placement, user confirms or adjusts
**Depends on**: Phase 22
**Requirements**: AIPL-01, AIPL-02, AIPL-03, AIPL-04, AIPL-05
**Success Criteria** (what must be TRUE):
  1. AI suggests content via [GRID_ITEM] markup in chat responses with specific row and column coordinates
  2. Suggested items appear as semi-transparent preview nodes with "Add to Canvas" and "Skip" action buttons
  3. Target cell pulses with yellow border when AI suggests placement there, making destination obvious to user
  4. User can click "Add to Canvas" to create permanent node or "Skip" to remove preview, with instant visual feedback
  5. AI reads current grid canvas state (grouped by cell) as context and subsequent suggestions reference existing content accurately
**Plans**: TBD

Plans:
- [ ] 23-01: TBD

### Phase 24: Output-to-Canvas Retrofit (Steps 2 & 4)
**Goal**: Migrate Steps 2 & 4 from output panel to canvas-first rendering with unified data model
**Depends on**: Phase 21 (coordinate system), Phase 23 (AI placement patterns)
**Requirements**: RETRO-01, RETRO-02, RETRO-03, RETRO-04
**Success Criteria** (what must be TRUE):
  1. Step 2 structured output (stakeholder list with power/interest scores) automatically renders as organized canvas nodes in correct quadrants without manual placement
  2. Step 4 structured output (themes, pains, gains) automatically renders as organized canvas nodes in empathy map quadrants (Said/Thought/Felt/Experienced)
  3. User can add, remove, and reorder cards within canvas sections after initial migration, and changes sync to underlying data model
  4. Canvas becomes the primary structured record displayed by default, with output panel mirroring canvas state (single source of truth)
  5. Existing workshops with output-only data migrate seamlessly with default canvas positions, no data loss
**Plans**: TBD

Plans:
- [ ] 24-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 21 → 22 → 23 → 24 → ...

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v0.5 | 19/19 | Complete | 2026-02-08 |
| 7-14 | v1.0 | 25/25 | Complete | 2026-02-10 |
| 15-20 | v1.1 | 15/15 | Complete | 2026-02-11 |
| 21. Grid Foundation | v1.2 | 0/? | Not started | - |
| 22. Dynamic Grid Structure | v1.2 | 0/? | Not started | - |
| 23. AI Placement | v1.2 | 0/? | Not started | - |
| 24. Output-to-Canvas Retrofit | v1.2 | 0/? | Not started | - |

---
*Last updated: 2026-02-11 after v1.2 Canvas Whiteboard roadmap created*
