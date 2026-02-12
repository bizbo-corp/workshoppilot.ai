# Project Research Summary: v1.3 EzyDraw & Visual Ideation Canvases

**Project:** WorkshopPilot.ai v1.3 - EzyDraw Drawing Modal & Visual Ideation Extensions
**Domain:** In-app drawing tool modal and visual canvas layouts for design thinking Steps 8 (Ideation) and 9 (Concept Development)
**Researched:** 2026-02-12
**Confidence:** HIGH

## Executive Summary

Adding drawing capabilities and visual ideation canvases to WorkshopPilot's existing ReactFlow-based design thinking platform requires a lightweight, custom-built approach rather than off-the-shelf whiteboard SDKs. Research shows that while solutions like tldraw (~500KB) and Excalidraw (~2.3MB) offer feature completeness, they create bundle size explosions that degrade performance on mobile 3G networks (1.2s → 3.5s load time). The recommended approach builds a custom drawing canvas using Konva.js (55KB) + perfect-freehand (1.2KB) for EzyDraw, extending the existing ReactFlow infrastructure for Mind Maps and Crazy 8s grids, resulting in ~175KB bundle addition vs. 500KB+ for SDKs.

The architecture leverages dual-state storage (vector strokes as JSON for re-editing + PNG exports for display) to enable iterative design while avoiding database bloat. Mind maps reuse ReactFlow with dagre auto-layout (0KB, already integrated), Crazy 8s uses a CSS Grid overlay pattern (similar to existing Journey Map), and Concept Cards are rich custom ReactFlow nodes. Critical risks include event handling conflicts between drawing modal and ReactFlow canvas, canvas context memory leaks on modal unmount, touch/stylus input divergence from mouse, and JSONB storage bloat from base64 images. All are preventable with proper architecture from Phase 1.

**Key recommendation:** Build custom lightweight drawing tools, store vector data in JSONB and raster images in object storage, implement context-aware undo/redo from start, and use Pointer Events API for cross-device compatibility. This approach saves 300KB+ bundle size while delivering the exact feature set needed for Steps 8 and 9 ideation workflows.

## Key Findings

### Recommended Stack

**CRITICAL RESOLUTION (STACK vs ARCHITECTURE conflict):** Use **Konva.js + perfect-freehand** for EzyDraw, NOT tldraw SDK. While Architecture research initially suggested tldraw for feature completeness, Stack and Pitfalls research demonstrate this creates unacceptable bundle bloat (500KB vs 98KB) and performance degradation. Building a custom canvas with Konva provides precise control, smaller bundle, and avoids the "full SDK for modal feature" anti-pattern.

**Core technologies:**
- **Konva.js (55KB) + react-konva (43KB):** HTML5 Canvas drawing engine with layer system, dirty region rendering, TypeScript-native. 41% smaller than Fabric.js, proven React integration.
- **perfect-freehand (1.2KB):** Pressure-sensitive freehand strokes. Same library used by tldraw internally. 98% smaller than bundling full tldraw SDK.
- **dnd-kit (20KB):** Drag-and-drop for UI kit palette. Modern, accessible, touch-friendly. Already planned for canvas R2.
- **@emoji-mart/react (45KB):** Emoji picker for visual annotations. Industry standard (Discord/Slack).
- **lucide-react (0KB added, existing):** Icon library, 1400+ tree-shakeable icons.
- **ReactFlow 12.10.0 (0KB added, existing):** Mind maps and Concept Cards reuse existing canvas infrastructure.
- **dagre (~25KB):** Mind map auto-layout algorithm. Integrates with existing ReactFlow.

**Total NEW bundle size: ~175KB gzipped** (Konva 55KB + react-konva 43KB + perfect-freehand 1.2KB + dnd-kit 20KB + emoji-mart 45KB + dagre 25KB). Lazy-load EzyDrawModal to keep initial bundle at current 500KB.

**Rejected alternatives:**
- **tldraw SDK (~500KB):** REJECTED — Full whiteboard SDK is overkill for modal drawing feature. 2.8x larger than custom Konva approach.
- **Excalidraw (~2.3MB):** REJECTED — Massive bundle, hand-drawn style doesn't match design system.
- **Fabric.js (96KB):** REJECTED — 75% heavier than Konva, less performant for large object counts.

### Expected Features

**Must have (table stakes for v1.3 launch):**
- **EzyDraw Modal:** Freehand pencil, basic shapes (rect/circle/arrow/line), text labels, eraser, select/move/resize, undo/redo, PNG export, clear canvas
- **UI Kit Shapes:** 10 common components (button, input, card, navbar, modal) for product ideation sketching
- **Mind Map Canvas:** Central HMW node, branch nodes, drag-to-position, visual connections, AI-suggested themes
- **Crazy 8s Grid:** 8 slots (2x4 or 4x2 responsive), tap-to-sketch workflow, save PNG to slot
- **Visual Concept Cards:** Sketch thumbnail, elevator pitch, SWOT grid, feasibility rating (1-5 scale)

**Should have (competitive differentiators):**
- **Speech bubbles:** Visual storytelling for concept sketches (not in Miro/FigJam by default)
- **AI-assisted SWOT:** Vision API analyzes sketch + context, pre-fills SWOT sections
- **Re-edit Crazy 8s sketches:** Double-click saved sketch to reopen EzyDraw (most digital Crazy 8s tools don't support this)
- **Hand-drawn aesthetic:** Stroke variation, slight jitter (removes "it needs to look perfect" anxiety)

**Defer (v2+ after validation):**
- **Icon/emoji library:** Reduces "I can't draw" friction, but not critical path
- **Mind Map auto-layout:** Dagre algorithm adds complexity, manual positioning acceptable for MVP
- **Layers panel:** Adds cognitive load for non-technical users, simple z-index actions sufficient
- **8-minute timer (Crazy 8s):** Methodology fidelity, but not blocking core workflow
- **Real-time collaboration:** Belongs at canvas level (future FFP milestone), not drawing modal

### Architecture Approach

**Dual-state storage pattern:** Store both editable vector data (Konva JSON) for re-editing AND rendered PNG for fast display. Drawings stored in `stepArtifacts.drawings[]` array, ReactFlow nodes store only `drawingId` reference + cached `imageUrl`. This prevents JSONB bloat (drawings array separate from canvas postIts array) while enabling re-edit capability.

**Major components:**
1. **EzyDrawModal (NEW):** Fullscreen drawing interface using Konva Stage + Layers + react-konva declarative API. Isolated undo/redo stack, Pointer Events API for touch/stylus, exports JSON + PNG on save.
2. **drawingStore (NEW):** Zustand store managing drawing lifecycle (create, save, load, update, delete). Persists to `stepArtifacts.drawings[]` via API route.
3. **DrawingImageNode (NEW):** Custom ReactFlow node displaying PNG with re-edit button. Double-click or button → reopens EzyDrawModal with vector state loaded.
4. **MindMapCanvas (EXTEND EXISTING):** ReactFlow with custom `mind-node` type + dagre auto-layout hook. Reuses existing ReactFlow 12.10.0 infrastructure (0KB added).
5. **Crazy8sCanvas (NEW):** ReactFlow + 8-slot CSS Grid overlay (similar to existing Journey Map grid pattern). Each slot renders DrawingImageNode.
6. **ConceptCardNode (NEW):** Rich custom ReactFlow node with sections for image, text fields, SWOT 2x2 mini-grid, feasibility score bars.

**Integration patterns:**
- **Event isolation:** Disable ReactFlow interactions (`panOnDrag={false}`, `zoomOnScroll={false}`) while EzyDrawModal open. Use event capture + stopPropagation in modal.
- **Context-aware undo/redo:** Separate undo stacks per context (drawing modal vs canvas). Keyboard shortcuts check `isDrawingModalOpen` flag to route to correct stack.
- **Progressive enhancement:** Pre-calculate mind map layout server-side for static maps. Client-side dagre with animation budget (max 100 ticks) for dynamic maps.

### Critical Pitfalls

1. **Two-Canvas Event Handling Conflicts** — Drawing modal and ReactFlow both listen to global events (pan, zoom, keyboard). **Solution:** Disable ReactFlow interactions when modal open, use Pointer Events API with capture phase, implement context-aware keyboard shortcuts.

2. **Canvas Context Memory Leaks** — HTML5 Canvas 2D context holds significant memory, React unmount doesn't auto-release. requestAnimationFrame loops and blob URLs leak if not cleaned up. **Solution:** Cleanup contexts in useEffect return, revoke blob URLs with `URL.revokeObjectURL()`, use AbortController for event listeners, set canvas size to 0 on unmount.

3. **JSONB Storage Bloat** — Base64 encoding adds 33% overhead. 800x600 simple sketch produces 200KB+ PNG. Postgres TOAST compression degrades parallel query performance. **Solution:** Store vector stroke data (5-20KB JSON) instead of base64 images, apply Douglas-Peucker simplification to reduce points, upload PNGs to Vercel Blob (store URLs only in JSONB), compress vector data with pako before storage.

4. **Touch/Stylus Input Divergence** — Mouse events don't provide pressure, touch events fire differently than pointer events, iOS Safari has complex preventDefault rules. Apple Pencil tilt/pressure only available via Pointer Events API. **Solution:** Use Pointer Events API exclusively with `pointerType` branching, implement palm rejection (check contact area `e.width > 30`), use `touch-action: none` CSS to prevent scroll, accurate coordinate calculation with getBoundingClientRect + scroll offsets.

5. **Bundle Size Explosion** — Fabric.js (96KB), tldraw (~500KB), Excalidraw (~2.3MB) add massive bundle overhead. Dependencies cascade (jsdom-global, color libs, font engines). **Solution:** Build custom canvas with Konva (55KB) + perfect-freehand (1.2KB), lazy-load EzyDrawModal, use native SVG for mind maps instead of react-konva, import only needed D3 modules (`d3-force` 25KB, not full `d3` 280KB).

6. **Mind Map Layout Performance Degradation** — Force-directed layout is O(n²) complexity. D3 forceManyBody calculates n×n forces every tick. 50-node graph = 90,000 calculations/sec at 60fps. **Solution:** Pre-calculate layout server-side for static maps, progressive enhancement with animation budget (max 100 ticks), memoize React node components, pause simulation during user interaction.

7. **Undo/Redo State Conflicts** — Single global undo stack shared between ReactFlow and drawing modal. Keyboard shortcuts trigger both systems. **Solution:** Separate undo stacks per context (canvas vs modal), disable canvas undo when modal open, batch modal actions into single canvas undo entry, implement hierarchical undo with sub-actions.

## Implications for Roadmap

Based on research, suggested **5-phase structure** for v1.3 EzyDraw milestone:

### Phase 1: EzyDraw Foundation (6-8 plans)
**Rationale:** Drawing modal must exist before canvas integration. Event isolation and memory cleanup are architectural foundations that can't be retrofitted.

**Delivers:** Standalone EzyDraw modal with freehand pencil, shapes, text, eraser, undo/redo, PNG export. Proper event isolation from ReactFlow, memory cleanup on unmount, Pointer Events API for cross-device support.

**Addresses:**
- STACK: Konva.js + react-konva + perfect-freehand installation, lazy-loading architecture
- FEATURES: Freehand pencil, basic shapes, text labels, eraser, select/move/resize, undo/redo, export PNG, clear canvas
- PITFALLS: Event handling conflicts (disable ReactFlow when modal open), canvas memory leaks (cleanup architecture), touch/stylus input (Pointer Events API from start), bundle size (lazy-load modal)

**Avoids:**
- Building on mouse-only events (would require full rewrite for touch later)
- Storing canvas refs in Zustand (creates memory leaks)
- Using Excalidraw/tldraw full SDK (300KB+ bundle bloat)
- Single global undo stack (creates undo conflicts later)

**Research flags:** Standard patterns for drawing canvas. Skip `/gsd:research-phase` — leverage STACK.md, ARCHITECTURE.md, PITFALLS.md findings.

### Phase 2: Drawing-Canvas Integration (4-5 plans)
**Rationale:** Once modal stable, integrate with ReactFlow canvas. Dual-state storage (vector + PNG) must be designed before users create drawings.

**Delivers:** DrawingImageNode custom ReactFlow node, drawingStore (Zustand), API routes for saving/loading drawings, vector data storage in `stepArtifacts.drawings[]`, PNG upload to Vercel Blob.

**Addresses:**
- ARCHITECTURE: Dual-state storage pattern (JSON + PNG), ReactFlow node as proxy to drawing state, modal-based editor (not inline)
- FEATURES: Re-edit saved drawings (double-click node → reopen modal with vector state)
- PITFALLS: JSONB storage bloat (store URLs not base64, simplify strokes with Douglas-Peucker)

**Avoids:**
- Storing only PNG (loses re-edit capability)
- Base64 images in JSONB (creates database bloat)
- Embedding drawing in ReactFlow node (coordinate system conflicts)

**Research flags:** Standard patterns. Skip research phase.

### Phase 3: UI Kit & Advanced Tools (3-4 plans)
**Rationale:** Core drawing works, now add differentiating features. UI kit shapes make EzyDraw purpose-built for product ideation (not general whiteboard).

**Delivers:** UI kit palette (10 component shapes: button, input, card, navbar, modal, dropdown, tab, icon, image, list), drag-and-drop with dnd-kit, speech bubbles, emoji picker.

**Addresses:**
- STACK: dnd-kit for drag-drop, @emoji-mart/react for emoji picker
- FEATURES: UI kit shapes (key differentiator), speech bubbles, emoji library
- PITFALLS: Bundle size monitoring (add webpack-bundle-analyzer, target <30KB for UI kit features)

**Avoids:**
- Building custom drag-drop (dnd-kit is accessible, touch-friendly, 20KB)
- Heavy emoji libraries (emoji-mart is industry standard, 45KB acceptable)

**Research flags:** Standard patterns. Skip research phase.

### Phase 4: Mind Map & Crazy 8s Canvases (5-6 plans)
**Rationale:** Reuse existing ReactFlow infrastructure for Mind Maps. Crazy 8s grid overlay pattern already proven in Journey Map (v1.2).

**Delivers:** MindMapCanvas (ReactFlow + dagre layout), MindNode custom node type, Crazy8sCanvas (ReactFlow + 8-slot grid overlay), AI-suggested mind map themes integration.

**Addresses:**
- ARCHITECTURE: ReactFlow custom nodes, dagre auto-layout, grid overlay pattern
- FEATURES: Mind Map (central HMW node, branches, connections), Crazy 8s (8 slots, tap-to-sketch), AI theme suggestions
- PITFALLS: Mind map performance (animation budget, progressive enhancement), layout algorithm complexity (pre-calculate server-side for static maps)

**Avoids:**
- Building separate mind map library (react-d3-graph 150KB, less flexible)
- Infinite nesting in mind maps (limit to 3 levels, prevents over-complexity)
- Real-time layout updates during user drag (pause simulation)

**Research flags:** Dagre integration is well-documented. Skip research phase unless performance issues emerge in testing.

### Phase 5: Visual Concept Cards (4-5 plans)
**Rationale:** Final canvas type depends on Crazy 8s drawings existing. AI-assisted SWOT is differentiator but requires Step 8 data.

**Delivers:** ConceptCardNode (custom ReactFlow node with image + text + SWOT grid + feasibility scores), AI-assisted SWOT generation (Vision API analyzes sketch), inline text editing, dealing-cards layout.

**Addresses:**
- ARCHITECTURE: Rich custom ReactFlow node with complex multi-section layout
- FEATURES: Concept cards (sketch thumbnail, elevator pitch, SWOT, feasibility rating), AI-assisted SWOT
- PITFALLS: SWOT grid rendering in node (use HTML/CSS not canvas for accessibility), AI Vision API integration (new dependency)

**Avoids:**
- Canvas-based text rendering for SWOT (HTML is easier, more accessible)
- Manual SWOT filling (AI pre-fill reduces friction)

**Research flags:** **MAY NEED `/gsd:research-phase`** for AI Vision API integration if Gemini vision capabilities unclear. Otherwise standard ReactFlow custom node patterns.

### Phase Ordering Rationale

**Why this order:**
1. **Phase 1 before all others:** Drawing modal is foundation. Event isolation and memory cleanup can't be bolted on later — must be architectural from start.
2. **Phase 2 before 3:** Integration architecture (dual-state storage) must exist before adding features that create drawings.
3. **Phase 3 in parallel with 4:** UI kit (Phase 3) and Mind Map/Crazy 8s (Phase 4) are independent — could be built in parallel if resources allow.
4. **Phase 5 last:** Concept Cards consume data from Crazy 8s (Phase 4). AI Vision API integration may need research.

**How this avoids pitfalls:**
- Event isolation (Phase 1) prevents two-canvas conflicts before integration (Phase 2)
- Memory cleanup (Phase 1) prevents leaks before users create 20+ drawings (Phase 3-5)
- Dual-state storage (Phase 2) prevents JSONB bloat before Crazy 8s creates 8 drawings (Phase 4)
- Pointer Events API (Phase 1) enables touch/stylus from start, no rewrite needed
- Bundle monitoring (Phase 3) catches size explosion before Mind Maps add more libraries (Phase 4)

### Research Flags

**Phases with standard patterns (skip `/gsd:research-phase`):**
- **Phase 1:** EzyDraw foundation — Konva/react-konva patterns well-documented, STACK.md + PITFALLS.md provide implementation guidance
- **Phase 2:** Drawing-Canvas integration — ReactFlow custom nodes proven, dual-state storage pattern documented in ARCHITECTURE.md
- **Phase 3:** UI Kit & tools — dnd-kit integration standard, emoji-mart well-documented
- **Phase 4:** Mind Map & Crazy 8s — ReactFlow + dagre examples abundant, grid overlay pattern already used in v1.2 Journey Map

**Phase likely needing deeper research:**
- **Phase 5:** Visual Concept Cards — **MAY NEED `/gsd:research-phase`** for AI Vision API integration (Gemini vision model capabilities, image analysis prompts, cost/latency) IF not already validated. Otherwise standard ReactFlow patterns.

**Recommendation:** Defer Phase 5 research decision until Phase 4 complete. If Gemini vision integration unclear, run `/gsd:research-phase` on "AI Vision API for sketch analysis" before planning Phase 5.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Konva.js vs Fabric.js vs tldraw comparison verified with bundle metrics, performance benchmarks, official docs. ReactFlow + dagre patterns proven. |
| Features | **MEDIUM-HIGH** | Table stakes validated via Excalidraw/Miro/FigJam feature comparison. Differentiators (UI kit, AI themes) inferred from competitor gaps. Hand-drawn aesthetic deferred based on UX research (beginner tools succeed with constrained options). |
| Architecture | **HIGH** | Dual-state storage pattern validated via tldraw persistence docs, ReactFlow custom node examples. Mind map dagre integration proven in ReactFlow examples. Two-canvas architecture researched via Excalidraw embedding discussions. |
| Pitfalls | **MEDIUM-HIGH** | Event conflicts, memory leaks, JSONB bloat, touch input divergence validated via GitHub issues (react-konva, Excalidraw, ReactFlow). Bundle size explosion verified via bestofjs metrics. Mind map performance O(n²) confirmed via D3 force simulation docs. |

**Overall confidence:** **HIGH** on technical feasibility and architecture patterns. **MEDIUM** on UX assumptions (hand-drawn aesthetic, icon library priority) — validate with user testing during beta.

### Gaps to Address

**Gaps requiring validation during implementation:**

1. **Stroke simplification threshold:** PITFALLS.md recommends Douglas-Peucker `tolerance=2`, but optimal value depends on drawing style. Plan: Test with real user sketches, adjust if visual quality degrades.

2. **Mind map node count limits:** Performance degradation starts at 30-50 nodes (research), but actual limit depends on device capabilities. Plan: Test on target devices (iPhone, iPad, Android), implement progressive degradation (disable auto-layout above threshold).

3. **JSONB size thresholds:** Research shows TOAST compression triggers at 2KB, but optimal drawing storage size unclear. Plan: Monitor database performance with real workshop data, migrate to separate drawings table if queries exceed 500ms.

4. **AI Vision API capabilities:** Gemini vision model quality for sketch analysis unknown. Gap: Can it distinguish UI components (button vs input) in low-fidelity sketches? Plan: Run Phase 5 research if needed, prototype vision prompts early.

5. **Palm rejection thresholds:** PITFALLS.md suggests `width > 30` for palm detection, but varies by device. Plan: Test on real iPads/Surface Pros, make threshold configurable, gather user feedback.

**Gaps acceptable for MVP (validate in beta):**

- Hand-drawn aesthetic value (defer to v2+ if not critical)
- Ideal number of UI kit components (start with 10, expand based on usage analytics)
- 8-minute timer necessity for Crazy 8s (defer if complexity high)
- Mind map auto-layout vs manual positioning preference (start manual, add auto if requested)

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- [Konva.js vs Fabric.js Technical Comparison](https://medium.com/@www.blog4j.com/konva-js-vs-fabric-js-in-depth-technical-comparison-and-use-case-analysis-9c247968dd0f) — Performance benchmarks, bundle size metrics
- [Bundle size comparison: Konva 54.9 KB, Fabric 95.7 KB](https://bestofjs.org/projects/konva) — BestofJS verified metrics
- [perfect-freehand 1.2 KB gzipped](https://github.com/steveruizok/perfect-freehand/discussions/6) — Creator confirmation
- [ReactFlow Custom Nodes Documentation](https://reactflow.dev/learn/customization/custom-nodes) — Official patterns
- [ReactFlow Dagre Layout Example](https://reactflow.dev/examples/layout/dagre) — Official integration guide
- [Vercel Blob Documentation](https://vercel.com/docs/vercel-blob) — Pricing, API, best practices

**Features Research:**
- [Excalidraw GitHub](https://github.com/excalidraw/excalidraw) — Open-source whiteboard feature analysis
- [Crazy 8's - Design Sprint Kit](https://designsprintkit.withgoogle.com/methodology/phase3-sketch/crazy-8s) — Official Google methodology
- [MindMeister Review 2026](https://www.scijournal.org/articles/mindmeister-review) — Mind map UX patterns
- [17 Card UI Design Examples](https://www.eleken.co/blog-posts/card-ui-examples-and-best-practices-for-product-owners) — Concept card layout patterns

**Architecture Research:**
- [tldraw Persistence Documentation](https://tldraw.dev/docs/persistence) — Dual-state storage validation
- [ReactFlow Mind Map Tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow) — Step-by-step implementation
- [Building Complex Diagrams with ReactFlow and dagre](https://dtoyoda10.medium.com/building-complex-graph-diagrams-with-react-flow-elk-js-and-dagre-js-8832f6a461c5) — Integration patterns

**Pitfalls Research:**
- [Postgres performance cliffs with large JSONB](https://pganalyze.com/blog/5mins-postgres-jsonb-toast) — TOAST compression analysis
- [GitHub Issue #514: Leaking WebGLRenderer when unmounting](https://github.com/pmndrs/react-three-fiber/issues/514) — Canvas memory leak patterns
- [GitHub Discussion #1492: Drawing on ReactFlow canvas](https://github.com/xyflow/xyflow/discussions/1492) — Two-canvas architecture conflicts
- [Apple Developer: Handling Events - Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html) — iOS touch event handling

### Secondary (MEDIUM confidence)

- [Top 5 JavaScript Whiteboard & Canvas Libraries](https://byby.dev/js-whiteboard-libs) — 2026 ecosystem overview
- [Top 5 Drag-and-Drop Libraries for React](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — dnd-kit analysis
- [Konva Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html) — Optimization patterns
- [D3 Force Simulation GitHub](https://github.com/d3/d3-force) — Layout algorithm behavior

### Tertiary (LOW confidence - needs validation)

- UI kit shape recognition thresholds (inferred from Balsamiq patterns, not tested)
- Optimal stroke simplification tolerance (Douglas-Peucker tolerance=2 is general guideline, not drawing-specific)
- Palm rejection contact area thresholds (e.width > 30 is heuristic, varies by device)

---

## CRITICAL CONFLICT RESOLUTION

**STACK.md (Konva.js) vs ARCHITECTURE.md (tldraw SDK):**

**Resolution:** Use **Konva.js + perfect-freehand** for EzyDraw modal, NOT tldraw SDK.

**Rationale:**
1. **Bundle size:** Konva approach = 98KB, tldraw SDK = ~500KB (5x larger)
2. **Feature fit:** EzyDraw is a constrained modal (fixed 800x600 canvas), not infinite whiteboard. tldraw's infinite canvas, collaboration, persistence are unused features adding bundle bloat.
3. **Pitfalls alignment:** PITFALLS.md explicitly warns against using full SDKs for feature subsets (Anti-Pattern 4).
4. **Lighthouse impact:** 500KB bundle increase drops performance score 95 → 68, 3G load time 1.2s → 3.5s.
5. **Control:** Custom Konva implementation allows precise UX tuning (tool palette, layer system, export formats) vs tldraw's opinionated UI.

**Architecture.md recommendation was based on feature completeness (tldraw has 100+ tools built-in), but Stack.md + Pitfalls.md demonstrate this violates the "build only what you need" principle for performance-critical mobile web apps.**

**Final decision:** Konva.js + perfect-freehand. Lazy-load EzyDrawModal to keep initial bundle impact minimal.

---

*Research completed: 2026-02-12*
*Ready for roadmap: YES*
*Total research files synthesized: 4 (STACK.md, FEATURES_EZYDRAW_VISUAL_IDEATION.md, ARCHITECTURE.md, PITFALLS.md)*
