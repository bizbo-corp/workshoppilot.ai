# Requirements: WorkshopPilot.ai

**Defined:** 2026-02-25
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## v1.7 Requirements

Requirements for Build Pack export. Each maps to roadmap phases.

### Workshop Completion

- [x] **COMP-01**: User sees AI-guided final review of key decisions from all 10 steps in Step 10
- [x] **COMP-02**: User can confirm workshop completion after AI-guided review
- [x] **COMP-03**: Workshop status persists as "complete" in database

### Deliverable Generation

- [x] **GEN-01**: AI generates PRD from all 10 steps of structured workshop data in Markdown format
- [x] **GEN-02**: AI generates Tech Specs from workshop data in Markdown format
- [x] **GEN-03**: Each deliverable includes structured JSON export alongside Markdown
- [x] **GEN-04**: Generation uses Gemini API with full workshop context (all step artifacts)

### Outputs Page

- [ ] **OUT-01**: Dedicated outputs page accessible at `/workshop/[id]/outputs`
- [ ] **OUT-02**: Deliverable cards displayed for each generated document (PRD, Tech Specs)
- [ ] **OUT-03**: User can click card to see detail view with rendered markdown sections
- [ ] **OUT-04**: User can copy deliverable content to clipboard
- [ ] **OUT-05**: User can download deliverable as `.md` file
- [ ] **OUT-06**: User can download deliverable as JSON
- [ ] **OUT-07**: Outputs page includes link back to workshop for review

### Dashboard Routing

- [ ] **DASH-01**: Completed workshops route to outputs page from dashboard
- [ ] **DASH-02**: In-progress workshops continue routing to resume position

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Presentation Export

- **PRES-01**: On-demand server-side PDF generation with summary per step
- **PRES-02**: On-demand PowerPoint generation with summary per step
- **PRES-03**: Stakeholder-focused presentation deck

### Deliverable Management

- **DLVR-01**: User can regenerate deliverables after updating workshop steps
- **DLVR-02**: User stories as separate deliverable document

## Out of Scope

| Feature | Reason |
|---------|--------|
| PDF/PPT generation | Deferred to v1.8 — separate concern from markdown deliverables |
| Stakeholder presentation | Deferred — workshop presentation covers it for now |
| Re-generation after updates | Not in v1.7 — first version generates once on completion |
| User stories as separate doc | PRD + Tech Specs sufficient for AI coders |
| Real-time collaboration on outputs | Solo experience first |
| Deliverable versioning | Premature — no re-generation means no versions |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMP-01 | Phase 43 | Complete |
| COMP-02 | Phase 43 | Complete |
| COMP-03 | Phase 43 | Complete |
| GEN-01 | Phase 44 | Complete |
| GEN-02 | Phase 44 | Complete |
| GEN-03 | Phase 44 | Complete |
| GEN-04 | Phase 44 | Complete |
| OUT-01 | Phase 45 | Pending |
| OUT-02 | Phase 45 | Pending |
| OUT-03 | Phase 45 | Pending |
| OUT-04 | Phase 45 | Pending |
| OUT-05 | Phase 45 | Pending |
| OUT-06 | Phase 45 | Pending |
| OUT-07 | Phase 45 | Pending |
| DASH-01 | Phase 46 | Pending |
| DASH-02 | Phase 46 | Pending |

**Coverage:**
- v1.7 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 — COMP-01, COMP-02, COMP-03 complete (Phase 43 done)*
