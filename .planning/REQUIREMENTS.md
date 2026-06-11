# Requirements: WorkshopPilot.ai — Milestone v2.1

**Defined:** 2026-06-11
**Milestone:** v2.1 Journey Flow + Low-Fidelity Prototype Pipeline
**Source:** `.planning/milestones/v2.1-BRIEF.md` (locked decisions — do not relitigate)

## v2.1 Requirements

### Journey Flow Editor (FLOW)

- [x] **FLOW-01**: User can open Journey Flow at `/workshop/[sessionId]/outputs/journey-flow/`, alongside the parked old mapper route
- [x] **FLOW-02**: User sees screen/section nodes as data-only cards (name, UI type, short description) on a React Flow canvas, backed by node data `{ id, name, uiType, purpose, keyElements: string[], addressesPain?, priority }`
- [x] **FLOW-03**: User can connect nodes with drag-to-connect edges (free-form, forks allowed)
- [x] **FLOW-04**: User can add an adjacent screen/section via a (+) icon on a node (port existing toolbar + adjacency-placement logic)
- [x] **FLOW-05**: User can edit node card fields (name, UI type, purpose, key elements) and delete nodes/edges
- [x] **FLOW-06**: Journey Flow state persists via a simple Zustand store with debounced autosave to `build_packs.content` (same pattern as old mapper, leaner shape)
- [x] **FLOW-07**: User can mark the Journey Flow approved/complete; downstream actions (prototype prompt) gate on this state

### AI Baseline Generation (GEN)

- [x] **GEN-01**: On entry, user explicitly chooses test scope: "Test the whole journey" vs "Test a single feature" (with concept picker for feature mode) — no AI inference of scope
- [x] **GEN-02**: AI generates a baseline flow from workshop outputs for the chosen scope — full journey in journey mode, mini-flow (entry → action → result) in single-feature mode
- [x] **GEN-03**: AI determines the flow archetype (linear sequence, hub-and-spoke, single-page sections, funnel/landing-page test, branching flow, single-screen tool, loop/engagement cycle) to shape the generated baseline, reconciling the archetype set with the existing `strategicIntent` enum into a single concept
- [x] **GEN-04**: User can regenerate the baseline flow
- [x] **GEN-05**: When the AI detects a two-sided idea, it maps only the riskier side's journey and says so in the generated baseline (no dual-journey generation)

### Validation Guidance Wiring (VAL)

- [ ] **VAL-01**: Digital output types (`app_digital`, `experience_design`, other digital-leaning) see a "Recommended validation approach" card linking to Journey Flow, with the low-fi prototype builder link disabled until Journey Flow is marked complete, plus after-workshop guidance (Figma-fidelity prototype, usability tests)
- [ ] **VAL-02**: Non-digital output types (campaign, offering, process change, brand & comms, service, physical product) see type-appropriate alternatives with a short "how to do this outside WorkshopPilot" explanation, and are NOT offered Journey Flow / prototype actions
- [ ] **VAL-03**: Classification edge cases are handled: low confidence, combined types (`outputTypes` array), and user reclassification when they disagree with the detected type
- [ ] **VAL-04**: `classifyOutputType()` robustness is audited (confidence handling, combined types) — wired in as the single classifier, no parallel classification

### Prototype Prompt Builder (PROMPT)

- [ ] **PROMPT-01**: User sees a fidelity switch: low fidelity (functional) / high fidelity (visible but clearly stubbed "coming later")
- [ ] **PROMPT-02**: Low-fi prompt is generated from Journey Flow node data (not old mapper state) and includes a mandatory low-fi preamble enforcing wireframe style — grayscale, boxy, unbranded, sketch-like, only elements needed to test the idea
- [ ] **PROMPT-03**: The generated prompt is agent-agnostic self-contained plain text with a prominent copy button and next-step instructions ("Paste into your preferred AI coding agent — v0, Claude, Codex, Replit") plus a help link to a short how-to guide; no v0-specific "Create on v0" action or `create-v0-chat` dependency in the new flow
- [ ] **PROMPT-04**: Journey-understanding logic (flow parsing, screen descriptions, navigation derivation) is refactored into shared functions usable by both fidelity levels
- [ ] **PROMPT-05**: Single-feature mode produces a prototype prompt scoped to the mini-flow only

### Park Old Mapper (PARK)

- [ ] **PARK-01**: Old UX Journey Mapper remains functional at `/workshop/[sessionId]/outputs/journey-map/` but is de-linked from primary navigation/guidance (guidance points to Journey Flow)
- [ ] **PARK-02**: Old mapper displays a notice/banner that it is being replaced by Journey Flow

## Future Requirements

Deferred to later milestones:

- High-fidelity prototype pathway (richer prompt, AI coding agent hand-off) — this milestone ships only the switch + shared-function scaffold
- Two-sided / dual-journey archetype (marketplaces, provider + consumer platforms)
- Deletion of the old UX Journey Mapper code (cleanup after Journey Flow is proven)
- Data migration from old journey map state to Journey Flow

## Out of Scope

| Item | Reason |
|------|--------|
| Visual wireframe drawing/sketching | Nodes are data-only cards; the prototype prompt does the rendering via external coding agents |
| Tool-specific prototype API integrations (v0 API, etc.) | Handoff is agent-agnostic copy/paste by design |
| Changes to Steps 0–9 | Milestone touches only the Validate step and outputs surfaces |
| Dual-journey generation | Fall back to riskier side only; full support is a future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLOW-01 | Phase 63 | Complete |
| FLOW-02 | Phase 63 | Complete |
| FLOW-03 | Phase 63 | Complete |
| FLOW-04 | Phase 63 | Complete |
| FLOW-05 | Phase 63 | Complete |
| FLOW-06 | Phase 63 | Complete |
| FLOW-07 | Phase 63 | Complete |
| GEN-01 | Phase 64 | Complete |
| GEN-02 | Phase 64 | Complete |
| GEN-03 | Phase 64 | Complete |
| GEN-04 | Phase 64 | Complete |
| GEN-05 | Phase 64 | Complete |
| VAL-01 | Phase 65 | Pending |
| VAL-02 | Phase 65 | Pending |
| VAL-03 | Phase 65 | Pending |
| VAL-04 | Phase 65 | Pending |
| PROMPT-01 | Phase 66 | Pending |
| PROMPT-02 | Phase 66 | Pending |
| PROMPT-03 | Phase 66 | Pending |
| PROMPT-04 | Phase 66 | Pending |
| PROMPT-05 | Phase 66 | Pending |
| PARK-01 | Phase 67 | Pending |
| PARK-02 | Phase 67 | Pending |

---
*Requirements defined: 2026-06-11 from v2.1 milestone brief*
