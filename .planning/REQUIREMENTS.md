# Requirements: WorkshopPilot.ai

**Defined:** 2026-02-10
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## v1.1 Requirements

Requirements for v1.1 Canvas Foundation. Each maps to roadmap phases.

### Layout

- [ ] **LAYOUT-01**: User sees split-screen layout on all steps — chat panel left, right panel right
- [ ] **LAYOUT-02**: User can resize the divider between chat and right panel
- [ ] **LAYOUT-03**: Steps without canvas show placeholder right panel (ready for future tools)
- [ ] **LAYOUT-04**: On mobile (<768px), chat stacks above right panel vertically

### Canvas Core

- [ ] **CANV-01**: User can create post-it notes on the ReactFlow canvas
- [ ] **CANV-02**: User can edit post-it text inline (double-click)
- [ ] **CANV-03**: User can delete post-its (Backspace/Delete key)
- [ ] **CANV-04**: User can drag post-its to reposition them on the canvas
- [ ] **CANV-05**: User can color-code post-its from a preset color palette
- [ ] **CANV-06**: User can select multiple post-its (Shift+click or drag-select)
- [ ] **CANV-07**: User can pan and zoom the canvas
- [ ] **CANV-08**: User can undo/redo canvas actions (Ctrl+Z / Ctrl+Shift+Z)
- [ ] **CANV-09**: User can group related post-its together (ReactFlow sub-flows)

### Step 2 — Stakeholder Mapping

- [ ] **STK-01**: Step 2 canvas displays Power x Interest quadrant grid
- [ ] **STK-02**: Post-its snap to quadrant based on drop position
- [ ] **STK-03**: AI context includes stakeholders grouped by quadrant

### Step 4 — Research Sense Making

- [ ] **RSM-01**: Step 4 canvas displays empathy map quadrants (Said/Thought/Felt/Experienced)
- [ ] **RSM-02**: Post-its can be positioned within empathy map quadrants
- [ ] **RSM-03**: AI context includes insights grouped by quadrant

### AI-Canvas Integration

- [ ] **AICV-01**: AI suggestions in chat include "Add to canvas" action button
- [ ] **AICV-02**: Clicking "Add to canvas" creates a post-it node from the AI suggestion
- [ ] **AICV-03**: AI system prompt includes current canvas state as structured context (reads silently)

### Persistence

- [ ] **PERS-01**: Canvas state auto-saves to database (debounced)
- [ ] **PERS-02**: Canvas state loads from database when user returns to a step
- [ ] **PERS-03**: Canvas data stored in existing stepArtifacts JSONB column (no migration)

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### MMP — Visual & Collaborative

- **VIS-01**: Canvas for remaining steps (6 Journey Map, 8 Ideation, 9 Concepts)
- **VIS-02**: Visual stakeholder radar chart
- **VIS-03**: Empathy map canvas (full)
- **VIS-04**: Journey map grid UI with cell/row/column suggestions
- **VIS-05**: Guided persona builder with per-field regeneration
- **VIS-06**: Visual concept cards with SWOT
- **VIS-07**: Dot voting for idea selection
- **VIS-08**: Timer function for time-boxed exercises
- **VIS-09**: Build Pack export (PRDs, user stories, tech specs)
- **COLLAB-01**: Basic multi-user collaboration
- **UX-01**: Responsive tablet support
- **AUTH-01**: OAuth (Google)
- **MEDIA-01**: Video explanations per step

### FFP — Full Platform

- **ADV-01**: AI + canvas auto-suggest and auto-complete nodes
- **ADV-02**: Real-time multiplayer (WebSockets)
- **ADV-03**: EzyDraw component (in-app sketching, sketch enhancement)
- **ADV-04**: Voice input
- **ADV-05**: Canvas-first mode for visual steps
- **ADV-06**: AI pattern analysis and gap detection

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time collaboration | CRDT/WebSocket complexity, defer to MMP |
| Freeform drawing/sketching | Not needed for post-it canvas, defer to FFP (EzyDraw) |
| Infinite canvas | Bounded canvas sufficient for <50 post-its per step |
| Rich text in post-its | Plain text only — complexity without value |
| Custom post-it shapes/sizes | Fixed rectangles — cognitive overhead, spatial challenges |
| Nested groups | Flat clustering only — UI complexity without value |
| AI auto-arrange | Removes user agency, unpredictable results |
| Canvas export (PNG/PDF) | Nice-to-have, defer to v1.2 |
| Build Pack export | Separate milestone feature, not canvas-dependent |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | TBD | Pending |
| LAYOUT-02 | TBD | Pending |
| LAYOUT-03 | TBD | Pending |
| LAYOUT-04 | TBD | Pending |
| CANV-01 | TBD | Pending |
| CANV-02 | TBD | Pending |
| CANV-03 | TBD | Pending |
| CANV-04 | TBD | Pending |
| CANV-05 | TBD | Pending |
| CANV-06 | TBD | Pending |
| CANV-07 | TBD | Pending |
| CANV-08 | TBD | Pending |
| CANV-09 | TBD | Pending |
| STK-01 | TBD | Pending |
| STK-02 | TBD | Pending |
| STK-03 | TBD | Pending |
| RSM-01 | TBD | Pending |
| RSM-02 | TBD | Pending |
| RSM-03 | TBD | Pending |
| AICV-01 | TBD | Pending |
| AICV-02 | TBD | Pending |
| AICV-03 | TBD | Pending |
| PERS-01 | TBD | Pending |
| PERS-02 | TBD | Pending |
| PERS-03 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 25 total
- Mapped to phases: 0
- Unmapped: 25

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after initial definition*
