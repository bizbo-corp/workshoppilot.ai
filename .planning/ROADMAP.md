# Roadmap: WorkshopPilot.ai

## Milestones

- ✅ **v0.5 Application Shell** - Phases 1-6 (shipped 2026-02-08)
- ✅ **v1.0 Working AI Facilitation** - Phases 7-14 (shipped 2026-02-10)
- ✅ **v1.1 Canvas Foundation** - Phases 15-20 (shipped 2026-02-11)
- ✅ **v1.2 Canvas Whiteboard** - Phases 21-24 (shipped 2026-02-12)
- 🚧 **v1.3 EzyDraw & Visual Ideation** - Phases 25-29 (in progress)

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

### 🚧 v1.3 EzyDraw & Visual Ideation (In Progress)

**Milestone Goal:** Transform Steps 8 and 9 from text-only to visual-first with a reusable in-app drawing tool.

#### Phase 25: EzyDraw Foundation

**Goal**: Users can draw freehand sketches in a modal canvas

**Depends on**: Phase 24 (v1.2 complete)

**Requirements**: DRAW-01, DRAW-02, DRAW-03, DRAW-07, DRAW-08, DRAW-09, DRAW-10, DRAW-11, DRAW-12

**Success Criteria** (what must be TRUE):
1. User can open EzyDraw modal from any visual ideation context
2. User can draw freehand strokes with velocity-based width using pencil tool
3. User can place basic shapes (rectangle, circle, arrow, line, diamond) on drawing canvas
4. User can add text labels to drawings
5. User can erase individual elements from drawings
6. User can select, move, and resize drawing elements
7. User can undo and redo drawing actions (Cmd+Z / Cmd+Shift+Z)
8. User can export drawing as PNG image on save
9. User can clear entire drawing canvas with confirmation dialog
10. EzyDraw modal lazy-loads to keep initial page bundle under 600KB
11. Drawing works correctly on touch devices (iPad, Android tablets)

**Plans**: 6 plans

Plans:
- [ ] 25-01: Install Konva.js + react-konva + perfect-freehand and configure lazy-loading
- [ ] 25-02: Build EzyDrawModal component with fullscreen overlay and basic controls
- [ ] 25-03: Implement freehand pencil tool with perfect-freehand velocity strokes
- [ ] 25-04: Add basic shapes tool (rectangle, circle, arrow, line, diamond)
- [ ] 25-05: Implement select/move/resize, text labels, eraser, and clear canvas
- [ ] 25-06: Build undo/redo stack and PNG export functionality

#### Phase 26: Drawing-Canvas Integration

**Goal**: Saved drawings appear as image nodes on ReactFlow canvas and can be re-edited

**Depends on**: Phase 25

**Requirements**: INTEG-01, INTEG-02, INTEG-03, INTEG-04, INTEG-05

**Success Criteria** (what must be TRUE):
1. User can save a drawing from EzyDraw modal and see it appear as image node on canvas
2. User can double-click a saved drawing node to re-edit it in EzyDraw modal
3. Drawing vector state (Konva JSON) persists in database alongside PNG for re-editing
4. Drawing PNG images are stored in Vercel Blob (not base64 in database)
5. Drawings are stored in separate stepArtifacts.drawings array (not mixed with canvas nodes)
6. Drawing storage does not cause database performance degradation

**Plans**: 4 plans

Plans:
- [ ] 26-01: Create drawingStore (Zustand) for managing drawing lifecycle
- [ ] 26-02: Build DrawingImageNode custom ReactFlow node with re-edit capability
- [ ] 26-03: Implement dual-state storage (Konva JSON + PNG URL in Vercel Blob)
- [ ] 26-04: Build API routes for saving/loading drawings with Douglas-Peucker simplification

#### Phase 27: UI Kit & Advanced Tools

**Goal**: Users can build product UI sketches with pre-built components and visual annotations

**Depends on**: Phase 26

**Requirements**: DRAW-04, DRAW-05, DRAW-06

**Success Criteria** (what must be TRUE):
1. User can drag-and-drop UI kit components (button, input, card, navbar, modal, dropdown, tab, icon placeholder, image placeholder, list item) onto drawing canvas
2. User can place speech bubbles with adjustable tail on drawing canvas
3. User can stamp icons and emoji onto drawings via picker
4. UI kit palette is visually organized and easy to browse
5. Bundle size increase from UI kit features stays under 100KB gzipped

**Plans**: 3 plans

Plans:
- [ ] 27-01: Build UI kit component palette with 10 pre-built shapes
- [ ] 27-02: Implement drag-and-drop using dnd-kit for UI kit placement
- [ ] 27-03: Add speech bubbles tool and emoji picker (@emoji-mart/react)

#### Phase 28: Mind Map & Crazy 8s Canvases

**Goal**: Step 8 Ideation uses visual mind maps and sketch grids instead of text lists

**Depends on**: Phase 27

**Requirements**: MIND-01, MIND-02, MIND-03, MIND-04, MIND-05, MIND-06, MIND-07, CRAZY-01, CRAZY-02, CRAZY-03, CRAZY-04, CRAZY-05, CRAZY-06, FLOW-01, FLOW-02, FLOW-03

**Success Criteria** (what must be TRUE):
1. Step 8a displays a visual mind map with HMW statement as central node
2. User can add child nodes to build theme branches (max 3 levels deep)
3. Mind map nodes auto-layout using dagre tree algorithm
4. User can edit node text inline and delete nodes (with cascade confirmation)
5. AI suggests theme branches based on earlier workshop steps
6. Mind map nodes are color-coded by theme branch
7. Step 8b displays 8 blank sketch slots in a 2x4 grid layout
8. User can tap an empty slot to open EzyDraw modal for that slot
9. Completed sketch saves to slot as image and user can re-edit by tapping filled slot
10. User can add a title to each sketch slot
11. AI suggests sketch prompts to overcome blank-canvas paralysis
12. Step 8 sub-step flow is: Mind Mapping → Crazy 8s → Idea Selection (Brain Writing removed)
13. User can select top ideas from Crazy 8s to carry forward to Step 9

**Plans**: 6 plans

Plans:
- [ ] 28-01: Build MindMapCanvas using ReactFlow with custom mind-node type
- [ ] 28-02: Implement dagre auto-layout algorithm for mind map tree structure
- [ ] 28-03: Add AI theme suggestion integration using workshop context
- [ ] 28-04: Build Crazy8sCanvas with 8-slot grid overlay (similar to Journey Map pattern)
- [ ] 28-05: Integrate EzyDraw modal with Crazy 8s slots (tap → draw → save to slot)
- [ ] 28-06: Update Step 8 flow (remove Brain Writing, add Idea Selection from Crazy 8s)

#### Phase 29: Visual Concept Cards

**Goal**: Step 9 displays rich concept cards with sketches, pitch, SWOT, and feasibility ratings

**Depends on**: Phase 28

**Requirements**: CONCEPT-01, CONCEPT-02, CONCEPT-03, CONCEPT-04, CONCEPT-05, CONCEPT-06, CONCEPT-07

**Success Criteria** (what must be TRUE):
1. Step 9 displays visual concept cards on ReactFlow canvas
2. Each concept card shows sketch thumbnail from selected Crazy 8s ideas
3. Each concept card has editable elevator pitch field
4. Each concept card has SWOT analysis grid (Strengths, Weaknesses, Opportunities, Threats)
5. Each concept card has feasibility rating (1-5 scale across multiple dimensions)
6. User can edit all concept card fields inline
7. AI pre-fills concept card fields based on sketch and workshop context
8. Concept cards use dealing-cards layout pattern for visual organization

**Plans**: 4 plans

Plans:
- [ ] 29-01: Build ConceptCardNode custom ReactFlow node with multi-section layout
- [ ] 29-02: Implement sketch thumbnail display from Crazy 8s selected ideas
- [ ] 29-03: Add SWOT analysis grid and feasibility rating UI components
- [ ] 29-04: Integrate AI-assisted concept card generation using sketch + workshop context

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v0.5 | 19/19 | Complete | 2026-02-08 |
| 7-14 | v1.0 | 25/25 | Complete | 2026-02-10 |
| 15-20 | v1.1 | 15/15 | Complete | 2026-02-11 |
| 21-24 | v1.2 | 9/9 | Complete | 2026-02-12 |
| 25. EzyDraw Foundation | v1.3 | 0/6 | Not started | - |
| 26. Drawing-Canvas Integration | v1.3 | 0/4 | Not started | - |
| 27. UI Kit & Advanced Tools | v1.3 | 0/3 | Not started | - |
| 28. Mind Map & Crazy 8s Canvases | v1.3 | 0/6 | Not started | - |
| 29. Visual Concept Cards | v1.3 | 0/4 | Not started | - |

**Total v1.3:** 23 plans across 5 phases
**Total project:** 91 plans across 29 phases, 5 milestones

---
*Last updated: 2026-02-12 after v1.3 milestone roadmap creation*
