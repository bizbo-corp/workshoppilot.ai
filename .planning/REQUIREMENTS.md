# Requirements: WorkshopPilot.ai v1.3

**Defined:** 2026-02-12
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## v1 Requirements

Requirements for v1.3 EzyDraw & Visual Ideation. Each maps to roadmap phases.

### EzyDraw Drawing Tools

- [ ] **DRAW-01**: User can draw freehand with velocity-based stroke width using pencil tool
- [ ] **DRAW-02**: User can place basic shapes (rectangle, circle, arrow, line, diamond) on canvas
- [ ] **DRAW-03**: User can add text labels to drawings
- [ ] **DRAW-04**: User can drag pre-built UI kit components (button, input, card, navbar, modal, dropdown, tab, icon placeholder, image placeholder, list item) onto drawing canvas
- [ ] **DRAW-05**: User can place speech bubbles with adjustable tail on drawing canvas
- [ ] **DRAW-06**: User can stamp icons and emoji onto drawings via picker
- [ ] **DRAW-07**: User can erase individual elements from drawings
- [ ] **DRAW-08**: User can select, move, and resize drawing elements
- [ ] **DRAW-09**: User can undo and redo drawing actions (Cmd+Z / Cmd+Shift+Z)
- [ ] **DRAW-10**: User can export drawing as PNG image on save
- [ ] **DRAW-11**: User can clear entire drawing canvas (with confirmation dialog)
- [ ] **DRAW-12**: EzyDraw opens as fullscreen modal overlay with save/cancel controls

### Drawing-Canvas Integration

- [ ] **INTEG-01**: Saved drawings appear as image nodes on the ReactFlow canvas
- [ ] **INTEG-02**: User can re-edit a saved drawing by double-clicking its canvas node
- [ ] **INTEG-03**: Drawing vector state (Konva JSON) persists alongside PNG for re-editing
- [ ] **INTEG-04**: Drawing PNG images stored in Vercel Blob (not base64 in database)
- [ ] **INTEG-05**: EzyDraw modal lazy-loads to keep initial page bundle under 600KB

### Mind Map Canvas (Step 8a)

- [ ] **MIND-01**: Step 8a displays a visual mind map with HMW statement as central node
- [ ] **MIND-02**: User can add child nodes to build theme branches (max 3 levels deep)
- [ ] **MIND-03**: Nodes auto-layout using dagre tree algorithm
- [ ] **MIND-04**: User can edit node text inline
- [ ] **MIND-05**: User can delete nodes (children cascade with confirmation)
- [ ] **MIND-06**: AI suggests theme branches based on earlier workshop steps
- [ ] **MIND-07**: Nodes are color-coded by theme branch

### Crazy 8s Canvas (Step 8b)

- [ ] **CRAZY-01**: Step 8b displays 8 blank sketch slots in a 2x4 grid layout
- [ ] **CRAZY-02**: Tapping an empty slot opens EzyDraw modal for that slot
- [ ] **CRAZY-03**: Completed sketch saves to slot as image
- [ ] **CRAZY-04**: User can re-edit a slot's sketch by tapping the filled slot
- [ ] **CRAZY-05**: User can add a title to each sketch slot
- [ ] **CRAZY-06**: AI suggests sketch prompts to overcome blank-canvas paralysis

### Step 8 Flow

- [ ] **FLOW-01**: Step 8 sub-step flow is: Mind Mapping → Crazy 8s → Idea Selection
- [ ] **FLOW-02**: Brain Writing sub-step is removed from Step 8 flow
- [ ] **FLOW-03**: User can select top ideas from Crazy 8s to carry forward to Step 9

### Visual Concept Cards (Step 9)

- [ ] **CONCEPT-01**: Step 9 displays visual concept cards on ReactFlow canvas
- [ ] **CONCEPT-02**: Each concept card shows sketch thumbnail from selected Crazy 8s ideas
- [ ] **CONCEPT-03**: Each concept card has editable elevator pitch field
- [ ] **CONCEPT-04**: Each concept card has SWOT analysis grid (Strengths, Weaknesses, Opportunities, Threats)
- [ ] **CONCEPT-05**: Each concept card has feasibility rating (1-5 scale across multiple dimensions)
- [ ] **CONCEPT-06**: User can edit all concept card fields inline
- [ ] **CONCEPT-07**: AI pre-fills concept card fields based on sketch and workshop context

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### EzyDraw Enhancements

- **DRAW-13**: User can use layers panel with bring-to-front/send-to-back actions
- **DRAW-14**: AI Enhance converts rough sketch into clean wireframe
- **DRAW-15**: Drawings have hand-drawn aesthetic with stroke variation and jitter

### Mind Map Enhancements

- **MIND-08**: User can collapse/expand branches to focus on specific themes
- **MIND-09**: Mind map supports more than 3 nesting levels

### Crazy 8s Enhancements

- **CRAZY-07**: 8-minute countdown timer for time-boxed sketching
- **CRAZY-08**: Export all 8 sketches as single PDF grid

### Concept Card Enhancements

- **CONCEPT-08**: Side-by-side compare mode for evaluating multiple concepts
- **CONCEPT-09**: Dot voting for idea selection across concepts

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Brain Writing sub-step | Needs real multi-user collaboration to deliver value; AI simulation insufficient for visual mode |
| Billboard Hero exercise | Deferred to MMP — text-based pitch test + EzyDraw visuals |
| Real-time collaboration on drawings | Belongs at canvas level in FFP, not drawing modal |
| EzyDraw AI Enhance (sketch → wireframe) | Deferred to FFP — validate core drawing workflow first |
| Variable slot count (Crazy 8s) | Breaks methodology — 8 is the standard |
| Template library for EzyDraw | Undermines blank-canvas ideation philosophy |
| Pixel-perfect precision tools | Concept sketches should be rough, not precise |
| Advanced path editing (bezier curves) | Steep learning curve, not needed for concept sketches |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DRAW-01 | Phase 25 | Not started |
| DRAW-02 | Phase 25 | Not started |
| DRAW-03 | Phase 25 | Not started |
| DRAW-07 | Phase 25 | Not started |
| DRAW-08 | Phase 25 | Not started |
| DRAW-09 | Phase 25 | Not started |
| DRAW-10 | Phase 25 | Not started |
| DRAW-11 | Phase 25 | Not started |
| DRAW-12 | Phase 25 | Not started |
| INTEG-01 | Phase 26 | Not started |
| INTEG-02 | Phase 26 | Not started |
| INTEG-03 | Phase 26 | Not started |
| INTEG-04 | Phase 26 | Not started |
| INTEG-05 | Phase 26 | Not started |
| DRAW-04 | Phase 27 | Not started |
| DRAW-05 | Phase 27 | Not started |
| DRAW-06 | Phase 27 | Not started |
| MIND-01 | Phase 28 | Not started |
| MIND-02 | Phase 28 | Not started |
| MIND-03 | Phase 28 | Not started |
| MIND-04 | Phase 28 | Not started |
| MIND-05 | Phase 28 | Not started |
| MIND-06 | Phase 28 | Not started |
| MIND-07 | Phase 28 | Not started |
| CRAZY-01 | Phase 28 | Not started |
| CRAZY-02 | Phase 28 | Not started |
| CRAZY-03 | Phase 28 | Not started |
| CRAZY-04 | Phase 28 | Not started |
| CRAZY-05 | Phase 28 | Not started |
| CRAZY-06 | Phase 28 | Not started |
| FLOW-01 | Phase 28 | Not started |
| FLOW-02 | Phase 28 | Not started |
| FLOW-03 | Phase 28 | Not started |
| CONCEPT-01 | Phase 29 | Not started |
| CONCEPT-02 | Phase 29 | Not started |
| CONCEPT-03 | Phase 29 | Not started |
| CONCEPT-04 | Phase 29 | Not started |
| CONCEPT-05 | Phase 29 | Not started |
| CONCEPT-06 | Phase 29 | Not started |
| CONCEPT-07 | Phase 29 | Not started |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

**Coverage validation:** ✓ All 33 v1 requirements mapped to exactly one phase

**Phase coverage:**
- Phase 25: 9 requirements (DRAW-01, DRAW-02, DRAW-03, DRAW-07, DRAW-08, DRAW-09, DRAW-10, DRAW-11, DRAW-12)
- Phase 26: 5 requirements (INTEG-01, INTEG-02, INTEG-03, INTEG-04, INTEG-05)
- Phase 27: 3 requirements (DRAW-04, DRAW-05, DRAW-06)
- Phase 28: 15 requirements (MIND-01 through MIND-07, CRAZY-01 through CRAZY-06, FLOW-01 through FLOW-03)
- Phase 29: 7 requirements (CONCEPT-01 through CONCEPT-07)

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after roadmap creation*
