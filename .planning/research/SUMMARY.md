# Project Research Summary

**Project:** WorkshopPilot.ai v1.1 — Canvas & Post-It Features
**Domain:** Interactive canvas integration for design thinking facilitation (Steps 2 & 4)
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

WorkshopPilot v1.1 adds split-screen canvas functionality to Steps 2 (Stakeholder Mapping) and 4 (Research Sense Making), enabling users to interact with both AI chat and visual post-it canvas simultaneously. Research confirms this is achievable WITHOUT heavy canvas libraries — the recommended approach uses div-based post-its with @dnd-kit for drag-and-drop (10KB total), avoiding Tldraw (600KB) or ReactFlow (200KB) bloat. The canvas is NOT a separate feature but a **projection of AI-controlled structured outputs**: AI suggests → user confirms → canvas updates; canvas changes → AI reads silently via context.

The key architectural insight: maintain unidirectional data flow through Zustand as single source of truth, avoiding bidirectional state sync race conditions. Canvas state persists in existing stepArtifacts JSONB column (no schema migration needed), loaded with dynamic imports to prevent SSR hydration errors. Mobile responsiveness must be built-in from day one — touch events, coordinate scaling, and viewport adaptation cannot be retrofitted after desktop-only implementation.

Critical risks center on SSR compatibility (canvas libraries crash Next.js server rendering), state synchronization complexity (AI and canvas competing for updates), and bundle size explosion (Tldraw adds 600KB). These are preventable with proper architecture: dynamic imports with `ssr: false`, unidirectional Zustand flow, and lightweight custom canvas components instead of feature-rich libraries.

## Key Findings

### Recommended Stack

Research confirms **NO major canvas library needed** for WorkshopPilot's use case. Post-its are simple colored rectangles (div + CSS), not complex graphics requiring Canvas 2D API or infinite whiteboards. The only NEW dependency is @dnd-kit (10KB) for drag-and-drop interactions.

**Core technologies (UNCHANGED from v1.0):**
- Next.js 16.1.1 — Server Actions for post-it CRUD, React 19 support
- React 19.2 — Components for post-its, canvas container
- Tailwind CSS 4 — Post-it colors via Tailwind classes (bg-yellow-200, etc.)
- Zustand 5.0.3 — Canvas state management (extends existing pattern from v1.0)
- react-resizable-panels 4.6.2 — Split-screen layout (ALREADY INSTALLED)
- Drizzle ORM + Neon Postgres — Persist canvas items in stepArtifacts JSONB column

**NEW for v1.1:**
- **@dnd-kit/core + @dnd-kit/sortable** (10KB minified) — Drag-and-drop, grouping/clustering, collision detection, auto-scroll. Modern Pointer Events API (works on touch + mouse). Lightweight alternative to react-dnd (20KB), react-beautiful-dnd (deprecated), or custom implementation (200+ lines).

**What NOT to install:**
- Tldraw 4.3.1 — 600KB with deps, infinite canvas + drawing tools we don't need
- ReactFlow 11.11.4 — 200KB, designed for workflow diagrams with connections (we cluster, not connect)
- Konva/react-konva 19.2.0 — 335KB, Canvas 2D API for complex graphics (post-its are divs)
- react-colorful — 2.8KB, color picker UI (6 preset colors are sufficient, no picker needed)

**Rationale for div-based approach:** Post-its are UI elements (text + color), not graphics. Divs provide native accessibility (focus, screen readers), text editing (contenteditable), and styling (Tailwind). Canvas 2D API is overkill for <50 post-its — better for 1000+ animated elements. Bundle impact: 10KB vs 600KB for Tldraw.

### Expected Features

Research identifies clear feature categories from Miro, FigJam, and MURAL patterns:

**Must have (table stakes) — launch blockers:**
- **Post-it CRUD** — Create (click or "s" key), edit text (double-click inline), delete (Backspace), color-code (5 colors)
- **Drag-and-drop positioning** — Click-drag to move, visual feedback during drag
- **Multi-select** — Shift+click or drag-select box for bulk operations (move, color, delete)
- **Group/cluster post-its** — Proximity-based visual grouping for affinity mapping (Step 4)
- **Pan & zoom** — Space+drag or two-finger trackpad for navigation
- **Auto-save canvas state** — Debounced 2s saves, persist positions/text/colors to database
- **AI → Canvas sync** — "Add to canvas" button in chat triggers post-it creation
- **Canvas → AI sync** — AI reads canvas state silently (post-it positions, groups) and references in conversation
- **Step-specific templates** — Step 2: 2×2 quadrant grid (Power × Interest), Step 4: freeform canvas
- **Undo/redo (basic)** — Ctrl+Z/Ctrl+Shift+Z for create/delete/move/color

**Should have (competitive advantage) — defer to v1.2:**
- **AI-named clusters** — After user groups 3+ post-its, AI suggests cluster theme name
- **Bulk mode creation** — Paste stakeholder list → each line becomes post-it
- **Alignment guides** — Smart guides show vertical/horizontal alignment during drag
- **Snap-to-grid toggle** — Optional magnetic snap (Step 2 quadrants)
- **Minimap** — Viewport overview when zoomed in (>50 post-its)
- **Export canvas as PNG** — Share snapshot externally

**Anti-features (defer indefinitely) — scope creep risks:**
- Real-time collaboration — CRDT conflict resolution, cursor presence, websocket complexity (defer to MMP v2.0)
- Freeform drawing/sketching — Pen tool, stroke rendering, eraser (no design thinking value)
- Infinite canvas — Performance degradation >200 post-its (bounded 4000×3000px is sufficient)
- Post-it rich text formatting — Bold/bullets/links add UI complexity without value (plain text only)
- Custom shapes/sizes — Cognitive overhead, spatial layout challenges (fixed-size rectangles only)
- Nested groups — UI complexity, depth management issues (flat clustering only)

### Architecture Approach

Canvas integrates into existing Next.js App Router architecture via **conditional rendering in StepContainer**. The right panel switches between OutputPanel (Steps 1,3,5-10) and CanvasPanel (Steps 2,4) based on step metadata. Canvas state lives in dedicated Zustand store (canvasStore), parallel to existing workshopStore/chatStore pattern.

**Major components:**
1. **canvasStore (Zustand)** — Single source of truth for post-it items, positions, groups. Actions: addItem, updateItem, removeItem, syncToServer.
2. **BaseCanvas** — Shared infrastructure for drag-and-drop, item rendering, state sync. Wraps step-specific canvases.
3. **StakeholderCanvas (Step 2)** — Bullseye ring layout (SVG circles), ring detection on drop, metadata: { ring: 'inner' | 'middle' | 'outer' }.
4. **ResearchThemeCanvas (Step 4)** — Empathy map quadrants (CSS Grid), quadrant detection on drop, metadata: { quadrant: 'said' | 'thought' | 'felt' | 'experienced' }.
5. **CanvasPanel** — Wrapper component that conditionally renders step-specific canvas, connects to canvasStore, handles auto-save.
6. **API route: /api/canvas/sync** — Persists canvas items to stepArtifacts.artifact.canvasItems JSONB column, authentication + ownership verification.

**Key patterns:**
- **Unidirectional data flow:** AI updates → Zustand → Canvas reads. Canvas updates → Zustand → AI reads on next request (NOT reactively).
- **Canvas as projection:** Canvas state stored IN stepArtifacts.artifact.canvasItems as part of structured output, not separate table. Canvas is visualization of artifacts, not independent state.
- **Debounced auto-save:** 2s debounce, 10s maxWait using existing use-debounce pattern from v1.0 chat auto-save.
- **Dynamic imports with ssr: false:** All canvas components use Next.js dynamic imports to prevent SSR hydration errors (canvas libraries require browser APIs).
- **Responsive coordinate translation:** Canvas coordinates scale based on viewport width (baseWidth: 1200px → currentWidth). Mobile stacks chat above canvas.

**Database integration:**
- **No schema migration needed** — Canvas items stored in existing stepArtifacts.artifact.canvasItems array (JSONB column).
- **AI context injection** — assembleStepContext() function includes formatted canvas state (grouped by ring/quadrant) in system prompt for Steps 2 and 4.

### Critical Pitfalls

Research identified 7 critical pitfalls from Next.js App Router + React 19 + canvas library integration:

1. **SSR/Hydration Mismatch** — Canvas libraries (Tldraw, Konva) assume browser-only environment. Importing in Server Component causes "window is not defined" errors. Even in Client Components, hydration mismatches occur if server HTML differs from client render. **Prevention:** Dynamic imports with `ssr: false` for ALL canvas components, test in Vercel production (stricter than local dev).

2. **Bidirectional State Sync Race Conditions** — Multiple sources of truth (AI and canvas both initiating updates) create race conditions. Canvas update writes to Zustand at same moment AI response writes, one clobbers the other. React 19 concurrent rendering batches updates unpredictably. **Prevention:** Establish Zustand as single source of truth, unidirectional flow (AI → Zustand → Canvas, Canvas → Zustand → AI reads on next request), use optimistic updates with rollback, NO prop-syncing (derive from store).

3. **Bundle Size Explosion** — Tldraw adds 600KB (FCP increases 3.8s, Lighthouse score 95→68). Fabric.js 500KB, Konva 300KB. Canvas libraries bundle transitive dependencies (lodash, vector math) duplicating existing utilities. **Prevention:** Aggressive code splitting (dynamic imports per route), choose lightweight @dnd-kit (10KB) over heavy libraries, monitor bundle size in CI (fail if canvas route >300KB).

4. **Mobile/Responsive Canvas Collapse** — Canvas coordinates use absolute pixels that don't translate to mobile. Post-its render at 2px on mobile, touch events don't work (onMouseMove fails on mobile). Traditional CSS breakpoints don't solve coordinate translation. **Prevention:** Responsive canvas scaling (viewport coordinates → canvas coordinates), mobile-first layout (stack chat/canvas), touch-action CSS to prevent browser gestures, test at REAL breakpoints (375px, 768px, 820px, 912px).

5. **Canvas State Serialization Failures** — JSON.stringify loses Date objects (become strings), class instances (lose prototypes), functions (disappear). Snapshot-based undo/redo stores 300 copies of full state (2.4MB). Postgres TOAST compression adds 200ms latency for large JSONB. **Prevention:** Store minimal serializable state (IDs, positions, text), use JSON Patch for undo deltas (100x smaller), avoid deeply nested JSONB, GIN indexes for queries, test round-trip: load(save(state)) === state.

6. **AI-Canvas Coordination Race Conditions** — Optimistic updates (show change before DB confirms) create consistency risks. AI streams response (2-5s), user drags post-it during stream, AI completes and overwrites user's drag. Network failures leave partial state. **Prevention:** Optimistic update lifecycle with rollback, use React 19 useOptimistic hook, lock canvas during AI streaming, version-based conflict detection, idempotency keys for AI requests.

7. **Touch Event and Gesture Conflicts** — Browser gestures conflict with canvas: double-tap = zoom, pinch = zoom, swipe = navigate, long-press = context menu. CSS touch-action Safari mobile only supports 'auto' and 'manipulation', ignores 'none'. Passive event listeners can't preventDefault(). **Prevention:** Pointer Events API (unified mouse/touch/pen), touch-action: manipulation CSS, viewport meta with user-scalable=no, custom gesture detection, test on REAL devices (iOS Safari, Android Chrome).

## Implications for Roadmap

Based on research findings, suggested phase structure for v1.1 Canvas Foundation:

### Phase 1: Canvas Infrastructure & SSR Safety
**Rationale:** Foundation must handle SSR compatibility and basic canvas state BEFORE step-specific implementations. SSR issues break deployment (Pitfall #1), state architecture locks in patterns for all future features (Pitfall #2).

**Delivers:**
- canvasStore (Zustand) with items, selectedIds, viewport state
- BaseCanvas component with dynamic import (ssr: false) and drag-drop infrastructure
- CanvasItemPostIt shared component (div-based, Tailwind styled)
- API route /api/canvas/sync for persistence to stepArtifacts
- useCanvasAutosave hook (2s debounce, 10s maxWait)

**Addresses:**
- SSR/hydration mismatch (Pitfall #1) — dynamic imports established
- Bidirectional state races (Pitfall #2) — unidirectional Zustand flow defined
- Bundle size explosion (Pitfall #3) — lightweight div-based approach, no heavy libraries

**Avoids:**
- "window is not defined" Vercel deployment errors
- Prop-syncing anti-pattern (single source of truth)
- Canvas library lock-in before validating needs

**Research flag:** Standard patterns (Zustand stores, Next.js dynamic imports) — skip research-phase.

---

### Phase 2: Step Container Integration & Split-Screen Layout
**Rationale:** Modify existing StepContainer to conditionally render canvas, establishing responsive layout BEFORE implementing step-specific canvases. Layout architecture (Pitfall #4) must be mobile-first from start.

**Delivers:**
- StepContainer modification: renderRightPanel() conditional logic
- CanvasPanel wrapper component (connects to canvasStore)
- Split-screen layout with react-resizable-panels (chat left, canvas right)
- Mobile responsive stacking (chat above canvas on <768px)
- Canvas coordinate translation for viewport scaling

**Uses:**
- react-resizable-panels 4.6.2 (already installed)
- Tailwind responsive breakpoints
- useResponsiveCanvas hook for scaling

**Implements:**
- Conditional rendering pattern (Architecture component: StepContainer)
- Responsive canvas scaling (Prevention for Pitfall #4)

**Avoids:**
- Desktop-only implementation requiring mobile rewrite
- Fixed-pixel canvas sizing breaking on tablet/mobile

**Research flag:** Standard Next.js layout patterns — skip research-phase.

---

### Phase 3: Stakeholder Canvas (Step 2)
**Rationale:** Implement first step-specific canvas with simpler layout (static bullseye rings) before tackling freeform clustering in Step 4. Validates canvas infrastructure with constrained use case.

**Delivers:**
- StakeholderCanvas component with bullseye ring layout (SVG circles)
- Ring detection logic (distance from center: <150px = inner, <250px = middle, <350px = outer)
- Post-it metadata: { ring: 'inner' | 'middle' | 'outer' }
- AI context injection: formatCanvasForAI() groups stakeholders by ring
- 2×2 quadrant grid template (Power × Interest) with snap-to-quadrant

**Addresses:**
- Step 2 table stakes features (stakeholder mapping canvas)
- AI-canvas bidirectional sync (Canvas → AI silent read)

**Implements:**
- BaseCanvas extension for step-specific layout
- Canvas state serialization (minimal: id, x, y, text, color, ring)

**Avoids:**
- Over-engineering with infinite canvas (bounded layout sufficient)
- Custom shape complexity (fixed rectangles only)

**Research flag:** Skip research-phase — stakeholder mapping patterns well-documented (Power/Interest grid is standard).

---

### Phase 4: Research Theme Canvas (Step 4)
**Rationale:** Second canvas implementation introduces clustering/grouping complexity. Validates @dnd-kit sortable features and proximity-based grouping.

**Delivers:**
- ResearchThemeCanvas component with empathy map quadrants (CSS Grid)
- Quadrant detection logic (x/y coordinate thresholds)
- Post-it metadata: { quadrant: 'said' | 'thought' | 'felt' | 'experienced', type: 'pain' | 'gain' }
- Proximity-based clustering detection (3+ post-its within 50px)
- AI context injection: formatCanvasForAI() groups insights by quadrant

**Addresses:**
- Step 4 table stakes features (research sense making canvas)
- Grouping/clustering interactions (@dnd-kit sortable)

**Uses:**
- @dnd-kit/sortable for cluster stacking
- SortableContext with verticalListSortingStrategy

**Avoids:**
- AI auto-arrange (removes user agency, unpredictable)
- Nested groups (UI complexity without value)

**Research flag:** Skip research-phase — empathy mapping and affinity diagramming are established UX patterns.

---

### Phase 5: AI Integration & Optimistic Updates
**Rationale:** Connect AI suggestions to canvas creation, implementing proper optimistic update lifecycle with rollback. Must address Pitfall #6 (AI-canvas race conditions) before users interact with feature.

**Delivers:**
- "Add to canvas" button in chat for AI suggestions
- Optimistic post-it creation with temporary IDs
- ID reconciliation after database save (temp → real ID)
- Rollback on save failure with user notification
- Version-based conflict detection (lastModifiedBy: 'user' | 'ai')

**Addresses:**
- AI → Canvas sync (Feature: AI suggests → canvas updates)
- AI-canvas race conditions (Pitfall #6)

**Implements:**
- React 19 useOptimistic hook for automatic rollback
- Canvas locking during AI streaming (disable drag while isAIResponding)
- Idempotency keys for AI requests

**Avoids:**
- Optimistic updates without rollback (lost work on failure)
- Simultaneous AI + user edits clobbering each other

**Research flag:** NEEDS research-phase — AI streaming coordination patterns less documented, may need experimentation with Vercel AI SDK + Zustand interaction.

---

### Phase 6: Mobile Touch Optimization
**Rationale:** Validate touch interactions on real devices, refine gesture handling. Pitfall #7 (touch conflicts) requires device testing, cannot be fully validated in desktop emulation.

**Delivers:**
- Pointer Events API handlers (onPointerDown/Move/Up)
- touch-action: manipulation CSS (Safari mobile compatible)
- Custom gesture detection (1 finger = drag, 2 fingers = zoom)
- Long-press detection with timeout (500ms)
- Mobile breakpoint refinement (375px, 414px, 768px, 820px, 912px)

**Addresses:**
- Touch event conflicts (Pitfall #7)
- Mobile layout collapse (Pitfall #4 completion)

**Uses:**
- Pointer Events API (unified mouse/touch/pen)
- CSS touch-action property
- Viewport meta: user-scalable=no

**Avoids:**
- Separate mouse/touch handlers (use unified PointerEvent)
- Browser gesture conflicts (pinch-zoom, swipe-back)

**Research flag:** NEEDS research-phase — Touch gesture best practices on iOS Safari vs Android Chrome differ, may need device-specific handling.

---

### Phase 7: Bundle Optimization & Performance Validation
**Rationale:** Verify bundle size, FCP, and production performance before launch. Pitfall #3 (bundle explosion) must be caught in CI before affecting users.

**Delivers:**
- Next.js Bundle Analyzer integration
- Route-based code splitting verification (canvas only loads on Steps 2,4)
- Bundle size budget CI check (fail if canvas route >300KB)
- Lighthouse FCP target: <2s on 3G
- JSONB query performance validation (<200ms canvas load)

**Addresses:**
- Bundle size explosion (Pitfall #3)
- Canvas state serialization performance (Pitfall #5)

**Uses:**
- @next/bundle-analyzer
- Vercel Speed Insights
- Postgres GIN indexes for JSONB queries

**Avoids:**
- Production bundle surprises (catch regressions in CI)
- JSONB TOAST overhead (keep canvas state <100KB)

**Research flag:** Standard Next.js optimization patterns — skip research-phase.

---

### Phase Ordering Rationale

**Why this sequence:**
1. **Infrastructure first** (Phase 1) — SSR safety and state architecture are foundational, cannot retrofit
2. **Layout second** (Phase 2) — Responsive architecture must exist before step-specific implementations
3. **Simple canvas before complex** (Phase 3 → 4) — Stakeholder mapping (constrained layout) validates infrastructure before freeform clustering
4. **AI integration after canvas basics** (Phase 5) — Need working canvas to test AI suggestions and optimistic updates
5. **Mobile optimization late** (Phase 6) — Requires working desktop implementation to refine for touch
6. **Performance last** (Phase 7) — Bundle optimization measurable only when all features integrated

**Why NOT parallel:**
- Phase 1-2 must be sequential (layout depends on infrastructure)
- Phase 3-4 COULD be parallel but share learnings (do 3 first, apply to 4)
- Phase 5 depends on Phase 3-4 (need canvas to add AI suggestions to)
- Phase 6-7 can be parallel (touch optimization + bundle analysis independent)

**Critical dependencies:**
- All phases depend on Phase 1 (canvasStore is single source of truth)
- Phase 3-7 depend on Phase 2 (StepContainer conditional rendering)
- Phase 5 depends on Phase 3-4 (AI adds to existing canvas implementations)

### Research Flags

**Phases likely needing `/gsd:research-phase` during planning:**
- **Phase 5 (AI Integration)** — Streaming coordination with Vercel AI SDK + Zustand requires experimentation. Optimistic updates with React 19 useOptimistic + Next.js Server Actions pattern less documented.
- **Phase 6 (Mobile Touch)** — iOS Safari vs Android Chrome gesture handling differences. Touch-action CSS cross-browser compatibility. May need device-specific polyfills.

**Phases with well-documented patterns (skip research):**
- **Phase 1 (Canvas Infrastructure)** — Zustand stores, Next.js dynamic imports, debounced auto-save are established patterns
- **Phase 2 (Layout)** — react-resizable-panels, responsive breakpoints, StepContainer modification are standard Next.js patterns
- **Phase 3 (Stakeholder Canvas)** — Power/Interest quadrant grid is well-documented stakeholder mapping UX pattern
- **Phase 4 (Research Canvas)** — Empathy mapping and affinity diagramming are standard design thinking patterns
- **Phase 7 (Performance)** — Next.js Bundle Analyzer, Lighthouse metrics, JSONB optimization are documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | @dnd-kit recommended in 2026 drag-and-drop library rankings, react-resizable-panels already installed and working in v1.0, Zustand + Next.js 16.1.1 proven stack |
| Features | **MEDIUM-HIGH** | Feature categories validated across Miro, FigJam, MURAL (leading tools). Table stakes clear, but AI-specific patterns (suggestions → canvas) less documented. |
| Architecture | **HIGH** | Unidirectional Zustand flow is established React pattern, stepArtifacts JSONB persistence already working in v1.0, dynamic imports solve SSR issues (documented Next.js pattern) |
| Pitfalls | **HIGH** | All 7 pitfalls sourced from official docs (Next.js, React, MDN) + real production issues (Tldraw GitHub issues, Kent C. Dodds articles, NN/g research) |

**Overall confidence:** **HIGH**

Research synthesized from official documentation (Next.js 16.1.1, React 19, Vercel AI SDK), established UX patterns (stakeholder mapping, empathy maps, affinity diagramming), and 2026 community consensus (dnd-kit recommendations, bundle size best practices). Lower confidence areas (AI streaming coordination, mobile touch edge cases) flagged for research-phase during planning.

### Gaps to Address

**Areas needing validation during implementation:**

1. **Gemini API context size limits with canvas state** — How to handle: Test with 50-post-it canvas state (estimated 10KB JSON). If context exceeds limits, implement canvas state compression (send summary, not full details).

2. **React 19 useOptimistic hook + Zustand interaction** — How to handle: Phase 5 research-phase to experiment with optimistic updates pattern. May need custom implementation if useOptimistic doesn't play well with Zustand stores.

3. **touch-action CSS Safari mobile compatibility** — How to handle: Phase 6 research-phase to test on real iOS Safari 17+. Fallback: JavaScript event.preventDefault() if CSS approach fails.

4. **JSONB performance at >100 post-its** — How to handle: Load test with large canvas states (100-200 post-its). If TOAST overhead >200ms, migrate to separate canvas_items table with foreign key to stepArtifacts.

5. **AI streaming + optimistic canvas updates race conditions** — How to handle: Phase 5 research-phase to test edge cases. Implement version tracking and Last Write Wins strategy if conflicts detected.

**Deferred to post-v1.1 (validation needed before implementation):**
- Real-time collaboration (CRDT vs Operational Transform choice)
- AI auto-clustering algorithm (proximity threshold, minimum cluster size)
- Undo/redo beyond basic (canvas-specific vs app-wide history)

## Sources

### Primary (HIGH confidence)

**Stack & Architecture:**
- [Top 5 Drag-and-Drop Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — dnd-kit recommended, bundle size comparisons
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) — Official docs, 6.3.1, 10KB bundle verified
- [dnd-kit Documentation](https://docs.dndkit.com) — API reference, sortable preset
- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) — 4.6.2, React 19 compatible
- [Shadcn Resizable Component](https://ui.shadcn.com/docs/components/radix/resizable) — Built on react-resizable-panels
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — SSR patterns

**Features & UX:**
- [Miro Online Sticky Notes with AI](https://miro.com/online-sticky-notes/) — Feature comparison
- [FigJam AI Sort and Summarize](https://help.figma.com/hc/en-us/articles/18711926790423-Sort-and-summarize-stickies-with-FigJam-AI) — AI-canvas patterns
- [Affinity Diagrams: How to Cluster Ideas](https://www.interaction-design.org/literature/article/affinity-diagrams-learn-how-to-cluster-and-bundle-ideas-and-facts) — IxDF clustering patterns
- [Stakeholder Mapping: The Complete Guide](https://www.interaction-design.org/literature/article/map-the-stakeholders) — Power/Interest grid
- [Power Interest Grid for Stakeholder Analysis](https://creately.com/diagram/example/jripkdb22/power-interest-grid-for-stakeholder-analysis) — Quadrant templates

**Pitfalls:**
- [Tldraw Next.js SSR Issues - GitHub #6567](https://github.com/tldraw/tldraw/issues/6567) — Real SSR hydration errors
- [Don't Sync State. Derive It! - Kent C. Dodds](https://kentcdodds.com/blog/dont-sync-state-derive-it) — Bidirectional sync anti-pattern
- [Next.js Hydration Errors in 2026](https://medium.com/@blogs-world/next-js-hydration-errors-in-2026-the-real-causes-fixes-and-prevention-checklist-4a8304d53702) — SSR debugging
- [React useOptimistic Hook](https://blog.logrocket.com/understanding-optimistic-ui-react-useoptimistic-hook/) — Optimistic updates pattern
- [Touch Events - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events) — Touch vs mouse differences
- [touch-action CSS - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) — Browser gesture control

### Secondary (MEDIUM confidence)

**Architecture Patterns:**
- [Using State Management with React Flow](https://reactflow.dev/learn/advanced-use/state-management) — Zustand integration
- [Building Kanban Board with dnd-kit](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html) — Grouping example
- [Infinite Canvas Tutorial - Lesson 8 Performance](https://antv.vision/infinite-canvas-tutorial/guide/lesson-008) — Optimization patterns

**Performance & Serialization:**
- [PostgreSQL JSONB Performance](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage) — JSONB best practices
- [Postgres JSONB TOAST - pganalyze](https://pganalyze.com/blog/5mins-postgres-jsonb-toast) — Large JSONB overhead
- [Konva Save and Load Best Practices](https://konvajs.org/docs/data_and_serialization/Best_Practices.html) — Canvas serialization
- [Travels: JSON Patch Undo/Redo](https://github.com/mutativejs/travels) — Delta-based history

### Tertiary (LOW confidence, needs validation)

**Mobile Gestures:**
- [Konva Multi-touch Scale](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html) — Pinch zoom example (Konva-specific, may not apply to div-based approach)
- [Responsive Design Breakpoints 2025](https://www.browserstack.com/guide/responsive-design-breakpoints) — Standard breakpoints (may miss awkward device widths)

**Bundle Optimization:**
- [Next.js Package Bundling Guide](https://nextjs.org/docs/app/guides/package-bundling) — General guidance (canvas-specific tuning needed)

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
