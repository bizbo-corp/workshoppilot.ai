# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

**Current focus:** v1.3 EzyDraw & Visual Ideation — Phase 28 complete, ready for Phase 29

## Current Position

Phase: 29 of 29 (Visual Concept Cards) — IN PROGRESS
Plan: 1 of 4 in current phase
Status: Active (29-01 complete: ConceptCardNode foundation)
Last activity: 2026-02-12 — Completed 29-01-PLAN.md: ConceptCardNode component, types, and canvas store CRUD

Progress: [█████████████████████████████████████████░] 96% (88/91 plans complete across project)

## Completed Milestones

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v0.5 Application Shell | 1-6 | 19 | 2026-02-08 |
| v1.0 Working AI Facilitation | 7-14 | 25 | 2026-02-10 |
| v1.1 Canvas Foundation | 15-20 | 15 | 2026-02-11 |
| v1.2 Canvas Whiteboard | 21-24 | 9 | 2026-02-12 |

**Cumulative stats:**
- 88 plans completed (28 phases across 4 milestones + v1.3 Phase 29 in progress)
- ~22,700+ lines of TypeScript across ~347 files
- 6 days total (2026-02-07 → 2026-02-12)

**Velocity:**
- v0.5: 2 days, 6 phases, 19 plans (~25 min/plan)
- v1.0: 3 days, 8 phases, 25 plans (~25 min/plan)
- v1.1: 2 days, 6 phases, 15 plans (~25 min/plan)
- v1.2: 2 days, 4 phases, 9 plans (~3 min/plan average)
- v1.3: Phases 25-28 complete (19/23 plans), Phase 29 1/4 plans (~5 min/plan average)

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

- **Type alias for ConceptCardData** (Phase 29-01): Used type (not interface) to satisfy ReactFlow's Record<string, unknown> constraint on node data
- **Grouped feasibility structure** (Phase 29-01): ConceptCardData groups score+rationale per dimension for cleaner component API (vs flat schema fields)
- **canvasSize prop for constrained contexts** (Phase 28-05): EzyDrawModal accepts optional canvasSize (defaults to fullscreen), DroppableCanvas conditionally applies fixed dimensions or flex-1
- **AI prompt context loading** (Phase 28-05): Endpoint queries stepArtifacts for HMW statement, persona, mind map themes for contextual sketch suggestions
- **Autosave expansion for Phase 28** (Phase 28-05): Extended to persist mindMapNodes, mindMapEdges, crazy8sSlots alongside existing postIts/gridColumns/drawingNodes
- **Dagre layout configuration** (Phase 28-02): 120px ranksep, 100px nodesep prevents overlap at depth 3+ nesting
- **Layout recalculation strategy** (Phase 28-02): Only on structural changes (add/delete) not label edits to prevent thrashing
- **BFS cascading delete** (Phase 28-02): deleteMindMapNode uses breadth-first search to collect descendants atomically
- **6-color theme palette for mind map branches** (Phase 28-01): Auto-assigns to level-1 nodes by sibling index, children inherit parent color for clear branch visualization
- **Max 3 levels for mind map depth** (Phase 28-01): Prevents visual clutter and maintains usability per research findings
- **SVG path with bezier curves for speech bubble tail** (Phase 27-03): Smooth, scalable rendering integrates cleanly with Konva Path element
- **Lazy-loaded emoji-mart** (Phase 27-03): Dynamic imports prevent 200KB emoji data from bloating main bundle
- **Group representative drag pattern** (Phase 27-02): Only first element in group is Konva-draggable, moves entire group via store delta operation for atomic behavior
- **Drop position calculation** (Phase 27-02): Use active.rect.current.translated minus containerRect for accurate canvas-relative coordinates
- **DroppableCanvas wrapper pattern** (Phase 27-02): Konva Stage cannot be droppable directly, wrapper div bridges DOM events to canvas
- **UI kit groupId pattern** (Phase 27-01): Optional groupId on BaseElement for compound components, simpler than nested hierarchies for selection/move/delete
- **Wireframe color palette** (Phase 27-01): Grays/whites/blues for UI kit to visually distinguish from user designs
- **Cross-category search** (Phase 27-01): Palette search filters across all categories for better UX
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
- **Drawing persistence (Phase 26)**: Use simplify-js for Douglas-Peucker algorithm instead of custom implementation
- **Drawing storage (Phase 26)**: Store drawings as JSONB array in stepArtifacts (not separate table) for atomic workshop data
- **DrawingImageNode display (Phase 26)**: CSS background-image for PNG display (no Konva imports) preserves 600KB bundle budget
- **Drawing integration (Phase 26)**: Inner component pattern for store access, dual storage (content in drawings[], positions in _canvas.drawingNodes[]), async double-click handler for type-based edit routing

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
Stopped at: Completed 29-01-PLAN.md
Resume file: None

**Next action:** `/gsd:execute-phase 29` to continue with 29-02-PLAN.md (Canvas Integration)

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files | Completed |
|-------|------|----------|-------|-------|-----------|
| 25 | 01 | 214s | 2 | 4 created, 1 modified | 2026-02-12 |
| 25 | 02 | 112s | 2 | 4 created | 2026-02-12 |
| 25 | 03 | 157s | 2 | 1 created, 1 modified | 2026-02-12 |
| 25 | 04 | 297s | 2 | 1 created, 1 modified | 2026-02-12 |
| 25 | 05 | 258s | 2 | 3 created, 1 modified | 2026-02-12 |
| 25 | 06 | ~1800s | 2 | 1 created, 6 modified | 2026-02-12 |
| 26 | 01 | 321s | 2 | 2 created | 2026-02-12 |
| 26 | 02 | 312s | 2 | 1 created, 2 modified | 2026-02-12 |
| 26 | 03 | 360s | 2 | 5 modified | 2026-02-12 |
| 26 | 04 | ~2700s | 2 | 6 modified (incl. bug fixes) | 2026-02-12 |
| 26 | 01 | 143s | 2 | 3 created | 2026-02-12 |
| 26 | 02 | 180s | 2 | 1 created, 2 modified | 2026-02-12 |
| 26 | 03 | 205s | 2 | 1 created, 5 modified | 2026-02-12 |
| 27 | 01 | 210s | 2 | 3 created, 3 modified | 2026-02-12 |
| 27 | 02 | 150s | 2 | 1 created, 3 modified | 2026-02-12 |
| 27 | 03 | 319s | 2 | 3 created, 3 modified | 2026-02-12 |
| 28 | 01 | 188s | 2 | 3 created, 1 modified | 2026-02-12 |
| 28 | 02 | 216s | 2 | 2 created, 1 modified | 2026-02-12 |
| 28 | 04 | 203s | 2 | 2 created, 1 modified | 2026-02-12 |
| 28 | 05 | 369s | 2 | 2 created, 4 modified | 2026-02-12 |
| 28 | 03 | 270s | 2 | 1 created, 1 modified | 2026-02-12 |
| 28 | 06 | 558s | 2 | 9 modified | 2026-02-12 |
| 29 | 01 | 329s | 2 | 2 created, 1 modified | 2026-02-12 |

---

*Last updated: 2026-02-12 after completing 29-01 (ConceptCardNode foundation)*
| Phase 29 P01 | 329 | 2 tasks | 3 files |

