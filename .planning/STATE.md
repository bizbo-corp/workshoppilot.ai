# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

**Current focus:** v1.3 EzyDraw & Visual Ideation — Phase 25: EzyDraw Foundation

## Current Position

Phase: 25 of 29 (EzyDraw Foundation)
Plan: 5 of 6 in current phase
Status: In progress
Last activity: 2026-02-12 — Completed plan 25-05: Interactive Tools (Select, Text, Eraser)

Progress: [████████████████████████████████████░░░░] 80% (73/91 plans complete across project)

## Completed Milestones

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v0.5 Application Shell | 1-6 | 19 | 2026-02-08 |
| v1.0 Working AI Facilitation | 7-14 | 25 | 2026-02-10 |
| v1.1 Canvas Foundation | 15-20 | 15 | 2026-02-11 |
| v1.2 Canvas Whiteboard | 21-24 | 9 | 2026-02-12 |

**Cumulative stats:**
- 72 plans completed (24 phases + 3 partial across 4 milestones)
- ~19,200+ lines of TypeScript across ~320 files
- 6 days total (2026-02-07 → 2026-02-12)

**Velocity:**
- v0.5: 2 days, 6 phases, 19 plans (~25 min/plan)
- v1.0: 3 days, 8 phases, 25 plans (~25 min/plan)
- v1.1: 2 days, 6 phases, 15 plans (~25 min/plan)
- v1.2: 2 days, 4 phases, 9 plans (~3 min/plan average)

## Accumulated Context

### Key Architecture Notes

- Hierarchical context: short-term (verbatim) + long-term (summaries) + persistent (artifacts)
- 6-phase conversational arc: Orient → Gather → Synthesize → Refine → Validate → Complete
- Canvas: ReactFlow + Zustand single source of truth, stepArtifacts JSONB persistence
- Canvas context: Tier 4 in AI pipeline (after persistent, before messages)
- Steps 2 & 4: Canvas-only layout (no output panel), ring/zone overlays, lazy artifact migration
- Steps 5, 6: Canvas + output panel (existing behavior)
- Grid/swimlane: semantic IDs, custom snap logic, foreignObject SVG overlays
- AI placement: GRID_ITEM tags for journey-mapping, CANVAS_ITEM for other steps

### Recent Decisions (v1.3)

- **EzyDraw stack**: Konva.js + react-konva + perfect-freehand (~98KB) instead of tldraw SDK (~500KB) to avoid bundle bloat
- **Drawing architecture**: Standalone modal (not ReactFlow extension), dual-state storage (vector JSON + PNG), Vercel Blob for images
- **Step 8 flow**: Skip Brain Writing (needs real multi-user), new flow: Mind Mapping → Crazy 8s → Idea Selection
- **Reuse patterns**: Canvas-only layout with lazy migration (v1.2), semantic IDs and custom snap logic for grids
- **Drawing history**: Custom DrawingHistory class with structuredClone (50-step limit) instead of zundo for tighter control
- **Store pattern**: Factory-based createDrawingStore() matching canvas-store.ts for consistency
- **Fullscreen modal**: EzyDraw uses max-w-[100vw] h-screen override on shadcn Dialog for truly fullscreen canvas
- **Stage ref pattern**: forwardRef + useImperativeHandle exposes getStage() and toDataURL() for PNG export
- **Ref-based drawing state**: Use refs (not useState) for 60fps drawing to avoid re-render lag
- **perfect-freehand strokes**: Filled closed Lines with velocity-based outlines (size=strokeWidth*4, thinning/smoothing/streamline=0.5)
- **SelectTool approach**: Read element from store (not node attrs) for type-aware transform logic; shapes normalize scale to 1, strokes keep scale
- **Text editing pattern**: HTML textarea overlay (Konva standard) instead of Konva.TextPath for native editing UX
- **Element interactivity**: commonProps pattern spreads id, listening, draggable, onClick, onDragEnd to all elements for consistent behavior

### Known Tech Debt

- Workshops table needs deletedAt column for soft delete
- Next.js middleware → proxy convention migration (non-blocking)
- CRON_SECRET configuration in Vercel dashboard (production requirement)
- Mobile grid optimization deferred (may need tablet-first approach)

### Blockers/Concerns

**Phase 25 (EzyDraw Foundation):**
- Event isolation architecture must be correct from start (can't retrofit later)
- Touch/stylus Pointer Events API must work on real iPads/Surface devices (test early)
- Canvas memory cleanup critical (HTML5 canvas contexts don't auto-release)

**Phase 28 (Mind Map & Crazy 8s):**
- Mind map performance with dagre auto-layout unknown at scale (may need animation budget)
- Crazy 8s grid reuses Journey Map pattern (proven), but integration with EzyDraw modal is new

**Phase 29 (Visual Concept Cards):**
- AI Vision API for sketch analysis may need deeper research (Gemini vision capabilities unclear)
- Defer research decision until Phase 28 complete

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed plan 25-05 (Interactive Tools: Select, Text, Eraser)
Resume file: None

**Next action:** Continue with plan 25-06

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files | Completed |
|-------|------|----------|-------|-------|-----------|
| 25 | 01 | 214s | 2 | 4 created, 1 modified | 2026-02-12 |
| 25 | 02 | 112s | 2 | 4 created | 2026-02-12 |
| 25 | 03 | 157s | 2 | 1 created, 1 modified | 2026-02-12 |
| 25 | 04 | 297s | 2 | 1 created, 1 modified | 2026-02-12 |
| 25 | 05 | 258s | 2 | 3 created, 1 modified | 2026-02-12 |

---

*Last updated: 2026-02-12 after completing plan 25-05*

