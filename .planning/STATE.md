# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

**Current focus:** v1.2 Canvas Whiteboard - Phase 24 Output-to-Canvas Retrofit

## Current Position

Phase: 24 of 24 (Output-to-Canvas Retrofit)
Plan: 2 of 6 complete
Status: In progress
Last activity: 2026-02-11 — Completed 24-02-PLAN.md (ring and empathy zone overlays)

Progress: [████████████████████░░░░] 94% (67/71 plans across all milestones)

## Completed Milestones

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v0.5 Application Shell | 1-6 | 19 | 2026-02-08 |
| v1.0 Working AI Facilitation | 7-14 | 25 | 2026-02-10 |
| v1.1 Canvas Foundation | 15-20 | 15 | 2026-02-11 |

**Cumulative stats:**
- 66 plans completed (23 phases complete, phase 24 in progress)
- ~15,800 lines of TypeScript across ~305 files
- 5 days total (2026-02-07 → 2026-02-11)

**Velocity:**
- v0.5: 2 days, 6 phases, 19 plans (~25 min/plan)
- v1.0: 3 days, 8 phases, 25 plans (~25 min/plan)
- v1.1: 2 days, 6 phases, 15 plans (~25 min/plan)
- v1.2: In progress, 2 plans complete (~3 min/plan average)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting v1.2 work:

- **ReactFlow for canvas** (v1.1) — Graph-first data model with nodes+edges, MIT free, structured relationships queryable for AI context
- **No new packages for v1.2** — All grid/swimlane features build on existing ReactFlow 12.10.0 APIs with custom implementation patterns
- **Semantic IDs for columns/rows** (Phase 21) — Use string IDs not array indices to survive reordering operations. Implemented in grid-layout.ts GridConfig type
- **Custom snap logic required** — ReactFlow built-in snapGrid has multi-select bug (issue #1579), implement custom cell-boundary snap
- **Position as source of truth** (Phase 21) — cellAssignment is derived metadata, position remains authoritative for grid-based layouts
- **Cell padding in GridConfig** (Phase 21) — 10px padding stored in config prevents nodes from touching cell borders, avoids magic numbers
- [Phase 22-01]: Column width default set to 240px for comfortable post-it spacing
- [Phase 22-01]: removeGridColumn prefers left-adjacent column for post-it reassignment (left-to-right reading order)
- [Phase 22-02]: foreignObject pattern for SVG + HTML hybrid interactive overlays (pointer-events-auto on foreignObject elements)
- [Phase 22-02]: Empty columns deleted immediately without confirmation (no data loss risk)
- [Phase 23]: Preview nodes use isPreview boolean flag for suggest-then-confirm flow
- [Phase 23]: GRID_ITEM tags only for journey-mapping, other steps use CANVAS_ITEM auto-add
- [Phase 23]: Preview nodes filtered from AI context at assembly layer
- [Phase 23]: Preview nodes render as early return branch in PostItNode for cleaner conditional logic
- [Phase 23]: highlightedCell moved to canvas store for cross-component communication between chat-panel and ReactFlowCanvas
- [Phase 23]: Yellow pulse animation uses Tailwind animate-pulse for attention-grabbing cell highlights
- [Phase 24-01]: Ring layout uses concentric circles at 320px, 520px, 720px radii for stakeholder importance tiers
- [Phase 24-01]: Empathy zone layout follows classic empathy map (4 quadrants + 2 strips for pains/gains)
- [Phase 24-01]: Stakeholder importance scoring: power + interest (each 1-3), ring assignment >=5 inner, >=3 middle, else outer
- [Phase 24-01]: Migration helpers are pure functions (no side effects) that convert artifact data to positioned post-its
- [Phase 24-02]: Viewport-aware SVG overlays use ReactFlow store subscription for transform reactivity
- [Phase 24-02]: Ring and empathy zone overlays follow same pattern as QuadrantOverlay (foreignObject for labels)
- [Phase 24-02]: Ring detection and zone detection run on drag end, setting cellAssignment.row for AI context

### Known Tech Debt

- Workshops table needs deletedAt column for soft delete
- Next.js middleware → proxy convention migration (non-blocking)
- CRON_SECRET configuration in Vercel dashboard (production requirement)

### Blockers/Concerns

**Phase 24 complexity:** Steps 2 & 4 retrofit requires data migration strategy for existing workshops with output-only data. Migration script and feature flag rollout needed during Phase 24 planning.

**Column width defaults:** RESOLVED in Phase 22-01 — All columns default to 240px for comfortable post-it spacing.

**Mobile grid optimization:** Responsive cell sizing proposed but deferred. May discover mobile grid is problematic and require tablet-first approach instead.

### Key Architecture Notes

- Hierarchical context: short-term (verbatim) + long-term (summaries) + persistent (artifacts)
- 6-phase conversational arc: Orient → Gather → Synthesize → Refine → Validate → Complete
- Zod schemas with retry for structured outputs
- Exponential backoff for Gemini rate limits
- AI SDK 6 manual retry pattern (setMessages + sendMessage)
- Canvas: ReactFlow + Zustand single source of truth, stepArtifacts JSONB persistence
- Canvas context: Tier 4 in AI pipeline (after persistent, before messages)

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 24-02-PLAN.md (ring and empathy zone overlays)
Resume file: .planning/phases/24-output-to-canvas-retrofit/24-03-PLAN.md

**Next steps:**
1. Phase 24-02 complete: Ring and empathy zone overlay components with drag-and-drop behavior
2. Continue Phase 24 Canvas Retrofits (next: AI agent behavior for Steps 2 & 4)
3. 4 plans remaining in v1.2 milestone (Phase 24 has 6 plans total)

---
*Last updated: 2026-02-11 after completing Phase 24-02 (24-02-PLAN.md)*
