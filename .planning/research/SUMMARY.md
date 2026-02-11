# Project Research Summary: v1.2 Grid/Swimlane Canvas Features

**Project:** WorkshopPilot.ai v1.2 Canvas Whiteboard Enhancement
**Domain:** Interactive canvas whiteboard with structured grid/swimlane layouts and AI-driven placement
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

WorkshopPilot.ai v1.2 adds structured grid/swimlane canvas features to the existing ReactFlow-based canvas foundation. This research reveals that **no new libraries are required** — all features can be built using existing ReactFlow 12.10.0 APIs with custom logic. The milestone extends v1.1's canvas capabilities to support Step 6 (Journey Map with fixed swimlane rows and user-addable stage columns) and retrofits Steps 2 & 4 to render structured output data as organized canvas nodes.

The recommended approach centers on three architectural patterns: (1) semantic ID-based grid coordinates that survive column reordering, (2) AI suggest-then-confirm placement with validation against current grid state, and (3) single source of truth with dual UI projections (output panel + canvas) to prevent sync bugs. These patterns directly address the top risks: coordinate system confusion between free-form and cell-based positioning, dynamic column operations breaking state, and output-canvas state divergence.

Key risks are manageable with proper architectural foundation. The primary risk is **coordinate system confusion** between ReactFlow's continuous pixel space and grid's discrete cell space — mitigated with bidirectional coordinate translation layer established in Phase 1. Secondary risk is **dynamic column operations** (add/remove/reorder stages) breaking card positions — solved with semantic column IDs instead of array indices. Third risk is **output panel and canvas showing different data** for Steps 2 & 4 — prevented by unified data model with dual projections. All three risks are architectural decisions that must be made correctly upfront; they cannot be easily retrofitted.

## Key Findings

### Recommended Stack

**NO NEW PACKAGES NEEDED.** All v1.2 features build on existing v1.1 stack with custom implementation patterns. Existing stack (Next.js 16.1.1, React 19, ReactFlow 12.10.0, Zustand, Tailwind 4, shadcn/ui, Gemini API via Vercel AI SDK 6) fully supports grid layouts through native ReactFlow APIs.

**Core technologies (existing, no changes):**
- **ReactFlow 12.10.0**: Grid overlay via custom SVG component (similar to existing QuadrantOverlay), cell-based snap via custom logic overriding built-in snapGrid, programmatic node placement for AI-driven card creation. Native APIs support everything needed.
- **Zustand (existing)**: Extend canvas store with `cellAssignment` field on PostIt type, add grid configuration state for dynamic columns. No new packages.
- **Tailwind CSS 4**: Grid cell styling, swimlane visual treatment. CSS-only implementation.
- **Gemini API (existing)**: AI returns structured cell coordinates `{rowId: string, columnIndex: number}` in JSON response. No new capabilities needed.

**New patterns (not packages):**
1. **Grid coordinate utilities** (`grid-layout.ts`): Math functions for cell-to-position and position-to-cell transforms. Pure TypeScript, ~100 lines.
2. **Custom snap logic** (`grid-snap.ts`): Calculate nearest cell center, override ReactFlow's built-in snap. Solves multi-select drag bug (ReactFlow #1579).
3. **Swimlane overlay** (`grid-overlay.tsx`): SVG component for row labels and column headers. Reuses QuadrantOverlay pattern from v1.1 Steps 2 & 4.
4. **AI placement engine** (`ai-placement-engine.ts`): Parse AI suggestions, validate against current grid, handle stale references. ~150 lines.

**Total bundle impact: 0 KB** (no new npm packages). Gzipped Next.js bundle increase < 2 KB (app code only).

### Expected Features

**Table stakes (must have for v1.2 launch):**
- **Visual grid structure**: Fixed swimlane rows (Actions, Thoughts, Feelings, Pain Points, Opportunities) + dynamic stage columns. ReactFlow Background component + custom SVG overlay.
- **Snap to cell boundaries**: Custom snap logic maps positions to cell boundaries (not cell centers like Miro — user frustration documented). Addresses ReactFlow multi-select bug #1579 with group-aware snap.
- **Cell-aware item placement**: Store `{row, column}` metadata with nodes. Critical for AI reasoning about grid structure.
- **Add/remove columns dynamically**: User adds journey stages (Awareness, Consideration, Purchase). "+Add Stage" button, "×" delete, min 2 / max 10 columns.
- **AI suggest-then-confirm placement**: AI proposes cell + content, highlights target cell (pulsing yellow border), action button "Add to Canvas". Novel interaction pattern not found in Miro/FigJam/Lucidspark.

**Should have (v1.3+ after validation):**
- **Resize columns**: Drag handles on column borders. Trigger: User feedback on width constraints.
- **Structured output → canvas migration** (Steps 2 & 4 retrofit): Output panel fields auto-populate canvas in organized layout. High user value but complex implementation.
- **Cell completion indicators**: Visual cues for coverage (empty vs filled cells). Helps users see progress.
- **AI gap detection**: AI notices empty critical cells and prompts. Proactive facilitation.

**Defer (v2+ until PMF established):**
- **Context-aware grids for other steps**: Expand grid concept to Steps 5, 8. Need to validate Step 6 first.
- **Export grid as structured data**: CSV/JSON export. Useful for reporting but not critical for v1.2 validation.
- **Variable row heights**: Adds complexity. Uniform heights work for 90% of cases.

**Anti-features (commonly requested but problematic):**
- **User-defined custom rows**: Breaks AI placement assumptions, creates analysis paralysis. Journey maps have established patterns (Actions, Thoughts, Feelings per Nielsen Norman Group). Offer 2-3 presets instead.
- **Auto-arrange/auto-layout**: Removes user agency, difficult to undo gracefully. Use AI suggest-then-confirm instead.
- **Merge/split cells like spreadsheets**: Breaks stage × lane structure, adds complexity for minimal value. Use spanning items or connection lines instead.

### Architecture Approach

The architecture extends existing v1.1 canvas foundation (ReactFlow wrapper, Zustand store with temporal undo/redo, auto-save to stepArtifacts JSONB, bidirectional AI-canvas integration) with grid-specific layers. Three core architectural patterns emerge from research:

**Major components:**

1. **Coordinate Translation Layer** (`grid-layout.ts`, `grid-detection.ts`): Bidirectional conversion between ReactFlow's pixel coordinates (x, y) and grid cell coordinates (row, col). Handles zoom-independent calculations. Prevents primary pitfall: coordinate system confusion.

2. **Grid Overlay System** (`grid-overlay.tsx`, `step-canvas-config.ts`): SVG overlay for swimlane labels and cell boundaries, viewport-aware transformation with pan/zoom. Reuses proven QuadrantOverlay pattern. Config-driven per step (quadrant vs grid vs freeform).

3. **AI Placement Engine** (`ai-placement-engine.ts`, AI prompt updates): Parse [GRID_ITEM] markup, validate placements against current grid state (not request-time snapshot), handle semantic column references with fallback. Novel suggest-then-confirm UX.

4. **Unified Data Model** (modified `canvas-store.ts`, database schema): Single source of truth with optional `cellAssignment` field on PostIt type. Both output panel and canvas are projections of same entity. Prevents split-brain state divergence.

5. **Step-Scoped State** (modified store structure): Canvas state isolated per step, lazy load/unload on navigation. Prevents cross-step contamination (Steps 2, 4, 6 have different schemas).

**Data flow patterns:**
- **AI-driven placement**: User chats → AI suggests with cell coordinates → ChatPanel parses [GRID_ITEM] markup → Validates against current grid → User confirms → Canvas store creates node at calculated position → Snaps to cell center → Auto-saves to DB.
- **Output→Canvas migration**: User completes step → Artifact extracted → New transformer maps fields to grid cells/quadrants → Batch creates canvas nodes → Canvas becomes primary view → User edits on canvas → State syncs back to stepArtifacts JSONB.

**Key architectural decisions:**
- Use semantic IDs (UUIDs) for columns/rows, not array indices. Survives reordering.
- Disable ReactFlow's built-in `snapGrid` for grid steps due to multi-select bug. Implement custom snap.
- Store both pixel position (ReactFlow requires) and cell assignment (grid logic requires) on each node.
- Validate AI placements against current grid state, not request-time snapshot (user may have added/removed columns during 2-5s AI response).

### Critical Pitfalls

Research identified 7 critical pitfalls, all with proven prevention strategies:

1. **Grid Coordinate System Confusion (Free-Form vs Cell-Based)** — ReactFlow's continuous pixel space vs grid's discrete cell constraints create coordinate conflicts. Multi-select drag breaks snap-to-grid (ReactFlow #1579), zoom degrades snap precision. **Avoid:** Implement coordinate translation layer (pixelToCell, cellToPixel), custom snap logic for grid steps, zoom-independent calculations, test at 50%/100%/250% zoom.

2. **Dynamic Column Addition Breaking Layout and State** — User adds/removes journey stage columns while cards reference array indices. Column 3 deleted → cards at index 4 become index 3 (wrong stage). AI suggests placement for deleted column. **Avoid:** Use semantic IDs (col-uuid) not indices, validate AI placements against current grid, implement card migration on column delete, undo/redo captures structural changes.

3. **Snap-to-Cell Constraint Conflicts with Free-Form Editing** — Snap-to-cell forces center alignment but users want fine-tuning. Snap calculation on every drag event (60fps) causes lag. **Avoid:** Implement "loose" snap with sub-cell offset positioning, debounce snap calculations (50ms), snap-on-drag-end not during-drag, visual ghost outline of target cell.

4. **Output Panel → Canvas Migration State Inconsistency** — Steps 2 & 4 retrofit creates two representations of same data (output panel form + canvas nodes). Edit in one view doesn't update the other. **Avoid:** Establish single source of truth in Zustand store, both UIs are projections, unified undo/redo, migration script for existing workshops with feature flag rollout.

5. **AI Placement Suggestions Becoming Stale During User Editing** — User modifies grid (add column) during 2-5s AI response window. AI placement references old grid structure, cards appear in wrong columns. **Avoid:** Grid structure versioning with validation, semantic column references (label not index), validate each suggestion as it streams, optional grid locking during AI placement.

6. **Swimlane Row Height Rigidity Breaking Content Adaptability** — Fixed 120px rows cause text overflow, mobile viewport consumed by 5 rows. Multiple cards in same cell overlap. **Avoid:** Flexible row heights with min/max constraints, content-based sizing, cell stacking for multiple cards, responsive row sizing for mobile, manual resize handles.

7. **Cross-Step Canvas State Contamination** — Single Zustand store accumulates canvas state from all steps. Step 2 quadrant canvas bleeds into Step 6 grid canvas. Memory bloats as user visits multiple steps. **Avoid:** Step-scoped state structure, lazy load on mount / persist on unmount, per-step undo/redo stacks, AI context filtered to current step only.

**Prevention priority:** Pitfalls 1, 2, 4, 7 are architectural — must be addressed in Phase 1 (foundational architecture) or require expensive refactoring later. Pitfalls 3, 5, 6 are tuning — can iterate after MVP validation.

## Implications for Roadmap

Based on combined research, recommend **5 phases** structured around architectural dependencies and risk mitigation:

### Phase 1: Grid Foundation & Coordinate System
**Rationale:** Establishes coordinate translation layer, semantic ID architecture, and step-scoped state before any feature implementation. These are architectural decisions that cannot be easily retrofitted. Addresses pitfalls 1, 2, 7 (coordinate confusion, dynamic columns, cross-step contamination).

**Delivers:**
- Coordinate translation utilities (pixelToCell, cellToPixel)
- Grid configuration system with semantic IDs
- Step-scoped canvas state structure
- Custom snap-to-cell logic (fixes ReactFlow multi-select bug)
- Grid overlay component (SVG swimlane labels)

**Addresses features:**
- Visual grid structure (table stakes)
- Snap to cell boundaries (table stakes)
- Cell-aware item placement (table stakes)

**Avoids pitfalls:**
- Grid coordinate system confusion (critical)
- Dynamic column operations breaking state (critical)
- Cross-step canvas state contamination (critical)

**Implementation notes:**
- NO new packages. Pure TypeScript utilities + React components.
- Grid overlay reuses QuadrantOverlay pattern (proven in v1.1).
- Test extensively at multiple zoom levels (50%, 100%, 150%, 250%).

### Phase 2: Dynamic Grid Structure (Column Management)
**Rationale:** Builds on Phase 1's semantic ID foundation to enable user-controlled stage columns. Directly addresses Journey Map Step 6 requirement for user-addable stages. Requires Phase 1's coordinate system to recalculate positions on structural changes.

**Delivers:**
- Add/remove stage columns UI
- Column reordering (drag to reorder)
- Card migration on column delete
- Grid structure persistence to database
- Undo/redo for structural changes

**Addresses features:**
- Add/remove columns dynamically (table stakes)
- Column header labels (table stakes)

**Avoids pitfalls:**
- Dynamic column addition breaking layout (critical)

**Implementation notes:**
- Max 10 columns (prevent horizontal scroll hell)
- Confirmation dialog on column delete ("10 cards will move to adjacent stage")
- Atomic operations: structural change + affected card migration in single transaction

### Phase 3: AI Suggest-Then-Confirm Placement
**Rationale:** Implements AI-driven placement on top of stable grid foundation from Phases 1-2. Validation logic prevents stale placement bugs. This is the key differentiator vs Miro/FigJam (they don't suggest specific cell placement).

**Delivers:**
- AI cell coordinate suggestion (rowId, columnIndex in JSON)
- [GRID_ITEM] markup parser in ChatPanel
- Grid structure validation layer
- Cell highlighting on AI suggestion (pulsing yellow border)
- Action buttons for confirm/reject

**Addresses features:**
- AI suggest-then-confirm placement (table stakes, differentiator)
- Cell highlighting on AI suggestion (table stakes)

**Avoids pitfalls:**
- AI placement suggestions becoming stale (critical)

**Implementation notes:**
- Validate against current grid state, not request-time snapshot
- Semantic column references (label match) with fallback
- Progressive validation during streaming (show warnings in real-time)
- Optional: grid locking during AI placement (UX trade-off)

### Phase 4: Steps 2 & 4 Canvas Retrofit
**Rationale:** Extends grid/structured canvas concept to existing quadrant steps. Highest user value (organized stakeholder/empathy data) but complex due to unified data model requirement. Depends on Phase 1's coordinate system and state architecture.

**Delivers:**
- Unified data model (single source of truth)
- Output panel → canvas node transformer
- AI-driven initial placement in quadrants
- Migration script for existing workshops
- Feature flag rollout

**Addresses features:**
- Structured output → canvas migration (should have, high value)

**Avoids pitfalls:**
- Output panel → canvas migration state inconsistency (critical)

**Implementation notes:**
- Unified schema: entity has both form fields (output) and position (canvas)
- Both UIs are projections of same Zustand store entity
- Migration adds default positions to existing output-only workshops
- Phase carefully: feature flag → internal testing → gradual rollout

### Phase 5: UX Refinement & Validation
**Rationale:** Tunes interaction patterns based on real usage. Addresses subjective pitfalls (snap threshold, row heights) that require user feedback to optimize.

**Delivers:**
- Snap threshold tuning (debouncing, dead zone)
- Flexible row heights with manual resize
- Cell completion indicators
- Mobile grid optimization
- Performance optimization (if needed)

**Addresses features:**
- Cell completion indicators (should have)
- Resize columns (should have)

**Avoids pitfalls:**
- Snap-to-cell constraint conflicts (tuning)
- Swimlane row height rigidity (tuning)

**Implementation notes:**
- Gather user feedback from Phases 1-4 before implementing
- A/B test snap threshold values (10px vs 20px vs 30px)
- Monitor performance metrics (drag fps, snap calculation time)
- Defer if no performance issues emerge

### Phase Ordering Rationale

**Sequential dependencies:**
1. Phase 1 MUST complete before 2-5 (foundational architecture)
2. Phase 2 MUST complete before Phase 3 (AI needs stable grid structure)
3. Phase 4 can run parallel to Phase 3 (different steps, different features)
4. Phase 5 requires feedback from Phases 1-4 (iterative tuning)

**Risk mitigation ordering:**
- Phases 1-2 address architectural pitfalls (expensive to retrofit)
- Phase 3 addresses feature-level pitfalls (validation logic)
- Phase 4 addresses integration pitfalls (unified data model)
- Phase 5 addresses UX pitfalls (subjective tuning)

**Grouping logic:**
- Phase 1: All coordinate system concerns together
- Phase 2: All grid structure mutations together
- Phase 3: All AI placement logic together
- Phase 4: All output-canvas sync concerns together
- Phase 5: All UX polish together

### Research Flags

**Phases likely needing `/gsd:research-phase` during planning:**

- **Phase 4** (Steps 2 & 4 Retrofit): Complex data migration strategy, potential schema conflicts with existing workshops. Research: data migration patterns for canvas retrofitting, conflict resolution strategies.

**Phases with standard patterns (skip research-phase):**

- **Phase 1** (Grid Foundation): Standard ReactFlow coordinate math, well-documented SVG overlay patterns. Reuses v1.1 QuadrantOverlay approach.
- **Phase 2** (Column Management): Standard CRUD operations with semantic IDs. Established Zustand patterns.
- **Phase 3** (AI Placement): Extends existing [CANVAS_ITEM] markup pattern. Validation logic is straightforward conditional checks.
- **Phase 5** (UX Refinement): User feedback-driven iteration, not research-driven.

**Special note:** All phases build on existing v1.1 canvas foundation. No phases require external library research (stack research complete).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | ReactFlow 12.10.0 official docs confirm all required APIs exist. No new packages needed. Bundle impact verified (0 KB). |
| Features | **MEDIUM** | Table stakes features validated against Miro/FigJam/Lucidspark. AI suggest-then-confirm is novel (no direct comparison). Defer list based on NN/G journey mapping best practices. |
| Architecture | **HIGH** | Patterns proven in v1.1 (QuadrantOverlay, Zustand canvas store, bidirectional AI). Grid-specific patterns well-documented in ReactFlow community (swimlane discussions, snap issues). |
| Pitfalls | **MEDIUM-HIGH** | 7 critical pitfalls identified from ReactFlow GitHub issues, community discussions, and v1.1 learnings. Prevention strategies validated against official docs. Multi-select snap bug documented (ReactFlow #1579). Coordinate confusion pattern observed across 3+ sources. |

**Overall confidence: HIGH**

The combination of (1) no new packages required, (2) proven v1.1 foundation to build on, (3) well-documented ReactFlow APIs, and (4) identified pitfalls with prevention strategies gives high confidence in feasibility and approach.

### Gaps to Address

**During Phase 1 implementation:**
- **Snap threshold tuning**: Research recommends 20px threshold but may need adjustment based on actual card sizes and user behavior. Plan to A/B test 10px/20px/30px during Phase 5.
- **Column width defaults**: Research doesn't specify initial column widths. Options: (a) all equal, (b) first column wider (common pattern), (c) auto-calculated from viewport. Decide during Phase 2 based on Step 6 Journey Map mockups.
- **Cell overflow handling**: If card content exceeds cell height, research proposes flexible rows OR scroll within cell. Decision requires UX testing — defer to Phase 5.

**During Phase 4 implementation:**
- **Migration strategy for 500+ existing workshops**: Research covers technical migration (add default positions) but not rollout strategy. Need: feature flag system, gradual rollout plan, rollback procedure if migration issues emerge.
- **Output panel deprecation timeline**: Research establishes unified data model but doesn't specify when/how to phase out output panel form UI for Steps 2 & 4. Decision: keep both views initially (canvas + output tabs), deprecate output form after v1.3 validation if canvas proves superior.

**Throughout v1.2 milestone:**
- **Mobile grid optimization**: Research proposes responsive cell sizing (60px mobile vs 80px desktop row height) but defer to Phase 5. May discover mobile grid is fundamentally problematic and require tablet-first approach instead. Monitor mobile usage analytics post-launch.

## Sources

### Primary (HIGH confidence)

**ReactFlow Official Documentation:**
- [ReactFlow API Reference](https://reactflow.dev/api-reference) — Node positioning, snap behavior, Background component
- [ReactFlow Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes) — Custom node implementation
- [ReactFlow SnapGrid Type](https://reactflow.dev/api-reference/types/snap-grid) — Grid snapping functionality
- [ReactFlow Background Component](https://reactflow.dev/api-reference/components/background) — Grid line rendering
- [ReactFlow Dynamic Layouting](https://reactflow.dev/examples/layout/dynamic-layouting) — Programmatic node positioning

**ReactFlow GitHub Issues (verified bugs):**
- [Issue #1579: MultiSelection-Drag breaks Snap-To-Grid](https://github.com/wbkd/react-flow/issues/1579) — Documents multi-select snap bug, informs custom snap requirement
- [Issue #2440: Toggle between old snapGrid and new one](https://github.com/wbkd/react-flow/issues/2440) — Snap behavior changes across versions

**Journey Mapping Best Practices:**
- [Nielsen Norman Group: Journey Mapping 101](https://www.nngroup.com/articles/journey-mapping-101/) — **AUTHORITATIVE SOURCE** for journey map structure (5 components: Actor, Scenario, Phases, Actions/Mindsets/Emotions, Opportunities). Informs fixed row structure (Actions, Thoughts, Feelings, Pain Points, Opportunities).
- [NN/G: UX Mapping Methods Compared](https://www.nngroup.com/articles/ux-mapping-cheat-sheet/) — Empathy map vs journey map distinctions

### Secondary (MEDIUM confidence)

**Whiteboard Tool Competitor Research:**
- [Miro Community: Snap to Grid Frustration](https://community.miro.com/ideas/snap-to-grid-205) — Documents user frustration with cell center snapping (not edges). Informs cell-boundary snap decision.
- [Miro Tables Documentation](https://help.miro.com/hc/en-us/articles/22760922335506-Tables) — Row/column management patterns
- [FigJam Tables](https://help.figma.com/hc/en-us/articles/12583849250199-Tables-in-FigJam) — Add/remove columns, table structure
- [Microsoft Copilot in Whiteboard](https://support.microsoft.com/en-us/office/welcome-to-copilot-in-whiteboard-17e8cddb-9bae-4813-bd2b-a9f108b0b43e) — AI suggests sticky notes but no specific cell placement (validates WorkshopPilot's differentiation)

**ReactFlow Community:**
- [GitHub Discussion #2359: Swimlane Implementation](https://github.com/xyflow/xyflow/discussions/2359) — Community approaches to swimlanes
- [reactflow-swimlane Package](https://github.com/liang-faan/reactflow-swimlane) — Reference implementation (unmaintained, for patterns only)
- [ReactFlow Performance Guide](https://reactflow.dev/learn/advanced-use/performance) — Optimization strategies

**AI Workflow Patterns:**
- [Storyteq: AI Content Approval Workflows](https://storyteq.com/blog/how-do-ai-content-generation-tools-handle-content-approval-workflows/) — Suggest-confirm patterns in AI tools
- [Canvas3D: AI Spatial Placement](https://arxiv.org/html/2508.07135v1) — LLM agent placement algorithms

### Tertiary (LOW confidence, needs validation)

- [Swimlane Diagrams for UX (Medium)](https://sepantapouya.medium.com/swimlane-diagram-a-ux-designers-secret-weapon-for-order-in-chaos-fb9aa00927d5) — Swimlane UX applications (opinion piece, validates patterns)
- [Jeda.ai AI Whiteboard](https://www.jeda.ai/ai-whiteboard) — In-place discussions per object (competitor feature reference)

### Internal (WorkshopPilot codebase)

- `.planning/research/STACK.md` — v1.2 stack research (no new packages)
- `.planning/research/FEATURES_V1.2_GRID_SWIMLANE.md` — Feature prioritization and anti-features
- `.planning/research/ARCHITECTURE_V1.2_GRID_SWIMLANE.md` — Component responsibilities and data flow
- `.planning/research/PITFALLS.md` — 7 critical pitfalls with prevention strategies
- `.planning/codebase/ARCHITECTURE.md` — v1.1 canvas foundation (QuadrantOverlay pattern, Zustand store structure)

---

**Research synthesis completed: 2026-02-11**

**Key takeaways for roadmap:**
1. Zero new dependencies (0 KB bundle impact)
2. Five-phase structure addresses risks sequentially
3. Phase 1-2 are architectural (cannot defer), Phase 3-5 are feature/tuning (can adjust scope)
4. Novel AI suggest-then-confirm placement is primary differentiator vs competitors
5. Steps 2 & 4 retrofit (Phase 4) is highest complexity, needs careful data migration

**Ready for roadmap creation: YES**
