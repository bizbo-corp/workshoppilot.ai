# Requirements: WorkshopPilot.ai

**Defined:** 2026-02-11
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## v1.2 Requirements

Requirements for v1.2 Canvas Whiteboard milestone. Each maps to roadmap phases.

### Grid Canvas

- [ ] **GRID-01**: User sees a swimlane grid on Step 6 canvas with 7 fixed rows (Actions, Goals, Barriers, Touchpoints, Emotions, Moments of Truth, Opportunities) and labeled column headers
- [ ] **GRID-02**: User can drag post-it items and they snap to the nearest cell boundary on drop
- [ ] **GRID-03**: Post-it items store cell assignment metadata (row + column) alongside pixel position
- [ ] **GRID-04**: Grid overlay (lines, labels) stays aligned with canvas during pan and zoom
- [ ] **GRID-05**: Target cell highlights visually (light blue) when user drags an item over it
- [ ] **GRID-06**: Grid canvas state persists to database via existing auto-save infrastructure

### Dynamic Columns

- [ ] **DCOL-01**: User can add stage columns via "+Add Stage" button with a name prompt
- [ ] **DCOL-02**: User can remove stage columns with confirmation, migrating cards to adjacent column
- [ ] **DCOL-03**: User can inline-edit column header labels

### AI Placement

- [ ] **AIPL-01**: AI suggests content with specific cell placement via [GRID_ITEM] markup in chat responses
- [ ] **AIPL-02**: Suggested items appear as preview nodes with "Add to Canvas" / "Skip" buttons
- [ ] **AIPL-03**: Target cell pulses/highlights (yellow border) when AI suggests placement there
- [ ] **AIPL-04**: User can accept (places permanent node) or reject (removes preview) each AI suggestion
- [ ] **AIPL-05**: AI reads current grid canvas state (grouped by cell) as context for subsequent suggestions

### Output-to-Canvas Retrofit

- [ ] **RETRO-01**: Step 2 structured output (stakeholder list with power/interest) renders as organized canvas nodes in correct quadrants
- [ ] **RETRO-02**: Step 4 structured output (themes, pains, gains) renders as organized canvas nodes in empathy map quadrants
- [ ] **RETRO-03**: User can add, remove, and reorder cards within canvas sections after migration
- [ ] **RETRO-04**: Canvas becomes the primary structured record; output panel content mirrors canvas state

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Canvas Expansion

- **CEXP-01**: Canvas for Step 8 Ideation (clustering ideas from 3 sub-steps)
- **CEXP-02**: Canvas for Step 9 Concepts (visual concept cards with SWOT)
- **CEXP-03**: Column resize via drag handles
- **CEXP-04**: AI gap detection (AI notices empty critical cells and prompts)
- **CEXP-05**: Cell conversation threads (click cell for focused chat)
- **CEXP-06**: Swimlane template presets (B2C, B2B, Service Design)

### Build Pack Export

- **BPEX-01**: Export completed workshop as PRDs
- **BPEX-02**: Export user stories for AI coders
- **BPEX-03**: Export tech specs

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-arrange by AI | Removes user agency, unpredictable layouts, users lose spatial memory |
| Real-time collaboration | CRDT conflict resolution, WebSocket complexity — defer to FFP |
| Freeform drawing/sketching | Pen tool, stroke rendering complexity — not needed for structured grid |
| Variable row heights | Adds complexity, uniform heights work for 90% of cases |
| Merge/split grid cells | Violates journey map structure, adds complexity |
| Canvas for non-visual steps (1, 3, 5, 7, 10) | These steps work well as text-only — no canvas benefit |
| Infinite canvas | Performance with >200 nodes, bounded is better for focused work |
| Nested groups within cells | UI complexity, marginal value |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GRID-01 | Phase 21 | Pending |
| GRID-02 | Phase 21 | Pending |
| GRID-03 | Phase 21 | Pending |
| GRID-04 | Phase 21 | Pending |
| GRID-05 | Phase 21 | Pending |
| GRID-06 | Phase 21 | Pending |
| DCOL-01 | Phase 22 | Pending |
| DCOL-02 | Phase 22 | Pending |
| DCOL-03 | Phase 22 | Pending |
| AIPL-01 | Phase 23 | Pending |
| AIPL-02 | Phase 23 | Pending |
| AIPL-03 | Phase 23 | Pending |
| AIPL-04 | Phase 23 | Pending |
| AIPL-05 | Phase 23 | Pending |
| RETRO-01 | Phase 24 | Pending |
| RETRO-02 | Phase 24 | Pending |
| RETRO-03 | Phase 24 | Pending |
| RETRO-04 | Phase 24 | Pending |

**Coverage:**
- v1.2 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0
- Coverage: 100%

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after v1.2 roadmap created*
