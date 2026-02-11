# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

**Current focus:** v1.2 Canvas Whiteboard - Phase 23 AI Suggest-Then-Confirm Placement

## Current Position

Phase: 23 of 24 (AI Suggest-Then-Confirm Placement)
Plan: 1 of 2 complete
Status: In progress
Last activity: 2026-02-11 — Completed 23-01-PLAN.md (AI suggest-then-confirm data layer)

Progress: [████████████████████░░░░] 90% (64/71 plans across all milestones)

## Completed Milestones

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v0.5 Application Shell | 1-6 | 19 | 2026-02-08 |
| v1.0 Working AI Facilitation | 7-14 | 25 | 2026-02-10 |
| v1.1 Canvas Foundation | 15-20 | 15 | 2026-02-11 |

**Cumulative stats:**
- 64 plans completed (22 phases complete)
- ~15,309 lines of TypeScript across ~299 files
- 5 days total (2026-02-07 → 2026-02-11)

**Velocity:**
- v0.5: 2 days, 6 phases, 19 plans (~25 min/plan)
- v1.0: 3 days, 8 phases, 25 plans (~25 min/plan)
- v1.1: 2 days, 6 phases, 15 plans (~25 min/plan)
- v1.2: In progress, 4 plans complete (~3 min/plan average)

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
Stopped at: Completed 23-01-PLAN.md (AI suggest-then-confirm data layer)
Resume file: .planning/phases/23-ai-suggest-then-confirm-placement/23-02-PLAN.md

**Next steps:**
1. Continue with Phase 23 Plan 02 (preview node UI components)
2. Phase 23-01 complete: Preview node data model, dual-tag parser, AI context filtering
3. All 17 v1.2 requirements mapped to phases

---
*Last updated: 2026-02-11 after completing Phase 23 (23-01-PLAN.md)*
