# Roadmap: WorkshopPilot.ai

## Milestones

- ✅ **v0.5 Application Shell** - Phases 1-6 (shipped 2026-02-08)
- ✅ **v1.0 Working AI Facilitation** - Phases 7-14 (shipped 2026-02-10)
- 🚧 **v1.1 Canvas Foundation** - Phases 15-20 (in progress)
- 📋 **MMP Visual & Collaborative** - Phases 21+ (planned)

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

### v1.1 Canvas Foundation (In Progress)

**Milestone Goal:** Split-screen layout with interactive post-it canvas for Steps 2 (Stakeholder Mapping) and 4 (Research Sense Making), enabling visual clustering alongside AI facilitation.

**Approach:** Infrastructure-first, SSR-safe foundation using ReactFlow (@xyflow/react, MIT, ~200KB) for graph-first canvas with custom post-it nodes. ReactFlow provides built-in pan/zoom, multi-select, drag-and-drop, grouping, and queryable node/edge relationships for AI context. Canvas state lives in Zustand store as single source of truth, persisting to existing stepArtifacts JSONB column. Unidirectional data flow: AI → Zustand → Canvas (for AI suggestions), Canvas → Zustand → AI reads on next request (for canvas awareness).

#### Phase 15: Canvas Infrastructure & SSR Safety
**Goal**: Canvas state foundation with SSR-safe dynamic imports
**Depends on**: Phase 14
**Requirements**: CANV-01, CANV-04, PERS-01, PERS-02, PERS-03
**Success Criteria** (what must be TRUE):
  1. Canvas state stored in Zustand store (single source of truth)
  2. Canvas components load without SSR hydration errors
  3. User can create post-it notes on canvas
  4. User can drag post-its to reposition them
  5. Canvas state auto-saves to database (debounced 2s)
  6. Canvas state loads from database when returning to step
**Plans**: 3 plans

Plans:
- [x] 15-01-PLAN.md — Canvas infrastructure foundation (install @xyflow/react, Zustand store, provider, post-it node, SSR-safe wrapper)
- [x] 15-02-PLAN.md — ReactFlow canvas with all interactions (dot grid, double-click creation, toolbar, drag, snap-to-grid)
- [x] 15-03-PLAN.md — Persistence layer and step integration (server actions, auto-save hook, force-save, step page wiring)

#### Phase 16: Split-Screen Layout & Step Container Integration
**Goal**: Split-screen layout with 320px chat left, canvas+output right, collapsible panels, mobile tabs
**Depends on**: Phase 15
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04
**Success Criteria** (what must be TRUE):
  1. User sees chat panel (320px default) left, canvas+output right panel on all steps
  2. User can resize invisible divider between panels, sizes persist across steps
  3. Canvas renders on ALL steps, output accordion at bottom of right panel
  4. On mobile (<768px), tabs switch between Chat and Canvas (one at a time)
  5. Both panels collapsible to thin icon strips on desktop
**Plans**: 3 plans

Plans:
- [x] 16-01-PLAN.md — Desktop layout: RightPanel (canvas+accordion), 320px chat, invisible divider, autoSaveId
- [x] 16-02-PLAN.md — Mobile tabs + desktop collapse/expand functionality
- [x] 16-03-PLAN.md — Polish, verification, and human sign-off

#### Phase 17: Canvas Core Interactions
**Goal**: Post-it editing, color-coding, multi-select, undo/redo working
**Depends on**: Phase 16
**Requirements**: CANV-02, CANV-03, CANV-05, CANV-06, CANV-07, CANV-08, CANV-09
**Success Criteria** (what must be TRUE):
  1. User can edit post-it text inline (double-click to edit)
  2. User can delete post-its (Backspace or Delete key)
  3. User can color-code post-its from preset color palette
  4. User can select multiple post-its (Shift+click or drag-select box)
  5. User can pan and zoom the canvas
  6. User can undo/redo canvas actions (Ctrl+Z / Ctrl+Shift+Z)
  7. User can group related post-its together (proximity-based clustering)
**Plans**: 3 plans

Plans:
- [x] 17-01-PLAN.md — Store + node foundation (Zundo temporal middleware, PostIt color/grouping fields, PostItNode edit enhancements)
- [x] 17-02-PLAN.md — Canvas interactions (multi-select, delete, pan/zoom, undo/redo, color picker context menu)
- [x] 17-03-PLAN.md — Grouping with sub-flows (GroupNode component, group/ungroup actions, toolbar Group button)

#### Phase 18: Step-Specific Canvases (Steps 2 & 4)
**Goal**: Stakeholder and Research canvases with quadrant layouts
**Depends on**: Phase 17
**Requirements**: STK-01, STK-02, STK-03, RSM-01, RSM-02, RSM-03
**Success Criteria** (what must be TRUE):
  1. Step 2 displays Power x Interest quadrant grid
  2. Post-its snap to quadrant based on drop position in Step 2
  3. Step 4 displays empathy map quadrants (Said/Thought/Felt/Experienced)
  4. Post-its can be positioned within empathy map quadrants in Step 4
**Plans**: 2 plans

Plans:
- [x] 18-01-PLAN.md — Quadrant foundation (step config, detection logic, PostIt model extension, QuadrantOverlay component)
- [x] 18-02-PLAN.md — Canvas integration (wire overlay into ReactFlowCanvas, quadrant detection on drag, AI context assembly)

#### Phase 19: AI-Canvas Integration
**Goal**: Bidirectional sync between AI chat and canvas
**Depends on**: Phase 18
**Requirements**: AICV-01, AICV-02, AICV-03, STK-03, RSM-03
**Success Criteria** (what must be TRUE):
  1. AI suggestions in chat include "Add to canvas" action button
  2. Clicking "Add to canvas" creates post-it from AI suggestion
  3. AI references canvas state in conversation (reads silently)
  4. AI context includes stakeholders grouped by quadrant (Step 2)
  5. AI context includes insights grouped by quadrant (Step 4)
**Plans**: TBD

Plans:
- [ ] 19-01: TBD
- [ ] 19-02: TBD

#### Phase 20: Bundle Optimization & Mobile Refinement
**Goal**: Production performance validated, mobile gestures refined
**Depends on**: Phase 19
**Requirements**: (Performance validation across requirements)
**Success Criteria** (what must be TRUE):
  1. Canvas route bundle size under 300KB
  2. First Contentful Paint under 2s on 3G network
  3. Touch interactions work on iOS Safari and Android Chrome
  4. Canvas coordinates scale correctly on mobile viewports
**Plans**: TBD

Plans:
- [ ] 20-01: TBD

### MMP Visual & Collaborative (Planned)

**Milestone Goal:** Canvas for remaining steps (6 Journey Map, 8 Ideation, 9 Concepts), visual components (radar charts, persona builder), basic multi-user collaboration, responsive tablet support.

(Phases 21+ to be defined)

## Progress

**Execution Order:**
Phases execute in numeric order: 15 → 16 → 17 → 18 → 19 → 20

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v0.5 | 19/19 | Complete | 2026-02-08 |
| 7-14 | v1.0 | 25/25 | Complete | 2026-02-10 |
| 15. Canvas Infrastructure | v1.1 | 3/3 | Complete | 2026-02-10 |
| 16. Split-Screen Layout | v1.1 | 3/3 | Complete | 2026-02-11 |
| 17. Canvas Core Interactions | v1.1 | 3/3 | Complete | 2026-02-10 |
| 18. Step-Specific Canvases | v1.1 | 2/2 | Complete | 2026-02-11 |
| 19. AI-Canvas Integration | v1.1 | 0/TBD | Not started | - |
| 20. Bundle Optimization | v1.1 | 0/TBD | Not started | - |

---
*Last updated: 2026-02-11 after Phase 18 execution complete*
