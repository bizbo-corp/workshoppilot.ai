# Phase 63: Journey Flow Editor Core - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning
**Source:** PRD Express Path (`.planning/milestones/v2.1-BRIEF.md`)

<domain>
## Phase Boundary

Build the Journey Flow editor shell: a new route at `/workshop/[sessionId]/outputs/journey-flow/` hosting a React Flow canvas with a single data-only screen-card node type, drag-to-connect edges, (+) adjacent-screen add, inline node editing, a simple Zustand store with debounced autosave to `build_packs.content`, and a mark-complete/approved state that downstream actions gate on.

In scope: FLOW-01 through FLOW-07. Out of scope for this phase: AI baseline generation and test-scope choice UI (Phase 64), validation guidance wiring (Phase 65), prototype prompt (Phase 66), old-mapper banner/de-linking (Phase 67).

</domain>

<decisions>
## Implementation Decisions

### Editor model (locked by brief)
- Journey Flow REPLACES the UX Journey Mapper but lives at a NEW route alongside it — the old mapper at `/workshop/[sessionId]/outputs/journey-map/` is untouched this phase.
- Nodes are **data-only cards** — structured metadata about a screen/section, never a drawing. Card shows name + UI type + short description.
- Node data model (suggested baseline, refine as needed): `{ id, name, uiType, purpose, keyElements: string[], addressesPain?, priority }`.
- Single node type only. No swimlanes, no sitemap view, no nav groups, no emotion curve, no pinned views — all cut.
- What survives from the old mapper: drag-to-connect edges, the (+) icon to add an adjacent screen (reuse/port existing toolbar + adjacency-placement logic). Free-form edges must support forks (one source, multiple targets).

### Persistence (locked by brief)
- Simple Zustand store + debounced autosave to `build_packs.content` — same pattern as the old journey mapper, leaner state shape.
- Mark approved/complete state stored with the flow — downstream actions (prototype builder link) depend on it.
- No data migration from old mapper state.

### Claude's Discretion
- Exact component file layout under `src/components/` (suggest a new `journey-flow/` directory, not nested inside `journey-mapper/`)
- Store key/shape inside `build_packs.content` (must not clobber old mapper's saved state)
- Node editing UX (inline editing vs side panel) — keep it simple
- Empty state for the canvas before Phase 64's AI generation exists (a placeholder/manual-add experience is fine; the entry-experience scope chooser is Phase 64)
- Olive design-token styling details, dark/light parity

</decisions>

<specifics>
## Specific Ideas

- Reference implementations to port from: `src/components/journey-mapper/` (drag-to-connect, (+) adjacency placement), the old mapper's Zustand store + debounced autosave wiring to `build_packs.content`.
- Follow the canvas conventions in CLAUDE.md ("Canvas gotchas") and `.planning/codebase/CONVENTIONS.md`.
- Server actions return `{ success, data?, error? }`; use `with-retry.ts` for DB access.

</specifics>

<deferred>
## Deferred Ideas

- AI baseline generation, scope chooser (journey vs single feature), archetypes, regenerate — Phase 64
- Validation guidance card links/gating — Phase 65
- Prototype prompt builder + fidelity switch — Phase 66
- Old-mapper banner + de-linking — Phase 67
- Dual-journey support, hi-fi pathway, old-mapper deletion — future milestones

</deferred>

---

*Phase: 63-journey-flow-editor-core*
*Context gathered: 2026-06-11 via PRD Express Path*
