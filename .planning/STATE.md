# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** Phase 20 - Bundle Optimization & Mobile Refinement

## Current Position

Milestone: v1.1 Canvas Foundation
Phase: 20 of 20 (Bundle Optimization & Mobile Refinement)
Plan: 2 of 2
Status: Phase complete
Last activity: 2026-02-11 — Completed 20-01-PLAN.md (Bundle Optimization & Mobile Refinement)

Progress: [████████████████████████] 100% (59 plans complete across v0.5 + v1.0 + v1.1)

## Completed Milestones

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v0.5 Application Shell | 1-6 | 19 | 2026-02-08 |
| v1.0 Working AI Facilitation | 7-14 | 25 | 2026-02-10 |

**Cumulative stats:**
- 59 plans completed (20 phases complete)
- ~13,900 lines of TypeScript across ~290 files
- 5 days total (2026-02-07 → 2026-02-11)

**Velocity:**
- v0.5: 2 days, 6 phases, 19 plans
- v1.0: 3 days, 8 phases, 25 plans
- Average: ~2.5 hours/phase

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting v1.1:

- **Canvas library choice**: ReactFlow (@xyflow/react) for v1.1 — MIT, ~200KB, graph-first data model with queryable relationships for AI context
- **Context architecture**: Hierarchical compression proven in v1.0, canvas state extends via stepArtifacts JSONB
- **State management**: Zustand single source of truth, unidirectional flow, no prop-syncing
- **Canvas store pattern** (15-01): Zustand factory pattern with `createStore` from zustand/vanilla for SSR safety and per-request isolation
- **Post-it visual design** (15-01): Classic yellow (amber-100), 120x120px, shadow-md, system font, no rotation, hover lift
- **SSR safety** (15-01): next/dynamic with ssr: false for ReactFlow canvas to prevent hydration errors
- **Canvas edit UX** (15-01): nodrag/nopan classes on textarea prevent ReactFlow pan/zoom during text input
- **Double-click creation** (15-02): Manual detection using onPaneClick with 300ms threshold (ReactFlow has no native onPaneDoubleClick)
- **Auto-edit mode** (15-02): shouldEditLatest ref flag + useEffect watching postIts array length to activate edit on new post-it
- **Dealing-cards offset** (15-02): Toolbar + button places post-its at +30x, +30y from last post-it position
- **Snap-to-grid** (15-02): 20px grid matching dot grid background, applied to creation and drag operations
- **Canvas persistence** (15-03): Stored in stepArtifacts JSONB column with schemaVersion 'canvas-1.0', no new migrations needed
- **Auto-save timing** (15-03): 2s debounce with 10s maxWait, matching existing chat auto-save pattern
- **Silent retry** (15-03): First 2 failures logged but hidden, error UI shown after 3 consecutive failures
- **Force-save** (15-03): On component unmount and beforeunload to prevent data loss on navigation
- **Undo/redo middleware** (17-01): Zundo temporal() wrapper with 50-state limit, partialize excludes isDirty for transient state isolation
- **PostIt color model** (17-01): Optional color field (defaults to 'yellow') with 5 presets (yellow, pink, blue, green, orange)
- **Edit mode visual feedback** (17-01): Edit ring (blue-400) distinct from selection ring (blue-500), maxLength={200} enforced at textarea
- **COLOR_CLASSES pattern** (17-01): Record<PostItColor, string> mapping for consistent color rendering across components
- **Multi-select pattern** (17-02): Shift+click and drag-select box with SelectionMode.Partial (Ctrl disabled to avoid undo conflict)
- **Delete safety** (17-02): Conditional deleteKeyCode (null when editingNodeId set) prevents deletion during text input
- **Undo/redo integration** (17-02): Temporal store subscription for reactive toolbar state, mod+z keyboard shortcuts cross-platform
- **Color picker UX** (17-02): Right-click context menu with fixed positioning, closes on viewport change/click outside
- **Group visual design** (17-03): Translucent gray-100 background with dashed gray-300 border, NodeResizer for manual sizing
- **Grouping mechanics** (17-03): Bounding box calculation with 20px padding, children positioned relatively inside parent
- **Ungroup preservation** (17-03): Children converted back to absolute positions, preserving canvas location
- **Group deletion behavior** (17-03): Auto-ungroups children instead of deleting them, prevents accidental data loss
- **Parent-child rendering** (17-03): Groups sorted first in nodes array for ReactFlow parent-before-children requirement
- **Split-screen layout** (16-01): Chat panel defaults to 25% (~320px), right panel 75%, canvas visible on ALL steps
- **Invisible divider** (16-01): w-0 class with hover/drag opacity reveal for cleaner visual split
- **Panel persistence** (16-01): react-resizable-panels id prop persists sizes across steps via localStorage
- **Accordion expansion pattern** (16-01): onExpandedChange callback from child to parent enables conditional layout switching
- **Mobile tab pattern** (16-02): Chat/Canvas tabs at bottom above step navigation, CSS hidden toggle for instant switching
- **Panel collapse pattern** (16-02): Desktop panels collapse to 40px icon strips, enabling full-chat or full-canvas focus modes
- **Checkpoint verification pattern** (16-03): Automated polish (build/lint/grep) before human verification checkpoint for efficient UX review
- **Center-point quadrant detection** (18-01): Use post-it center (x + width/2, y + height/2) for quadrant assignment, not top-left corner
- **Viewport-aware overlay** (18-01): ReactFlow useStore selector for reactive viewport subscription in QuadrantOverlay SVG component
- **Fixed label offset** (18-01): 80px fixed offset for quadrant labels (not scaled by zoom) to maintain readability at all zoom levels
- **Step-specific canvas config** (18-01): Configuration registry with semantic step IDs ('stakeholder-mapping', 'sense-making') matching step-metadata.ts
- **Quadrant at creation** (18-02): Detect quadrant immediately on post-it creation (double-click, toolbar) for instant feedback
- **Empty canvas centering** (18-02): onInit callback centers viewport on (0,0) for empty quadrant canvases using container dimensions
- **Phase 19 AI wiring** (18-02): Canvas context assembly functions created in Phase 18, wired to AI pipeline in Phase 19 per roadmap separation
- **Canvas context as Tier 4** (19-01): Canvas state injected after persistent/summaries, before messages - visual short-term memory
- **Canvas action markup** (19-01): [CANVAS_ITEM] markup instructions only on Steps 2 and 4 during gather/synthesize arc phases
- **Canvas duplication prevention** (19-01): AI instructed to NOT re-suggest items already on canvas for better conversation flow
- **Canvas item parsing** (19-02): parseCanvasItems function extracts [CANVAS_ITEM] markup and strips it from displayed AI messages
- **Dual parser composition** (19-02): Parse suggestions first, then canvas items from cleaned result to avoid parser interaction
- **Action button UX** (19-02): "Add to canvas" buttons below AI messages show full item text with Plus icon, distinct from suggestion pills
- **Default post-it creation** (19-02): Position (0,0), 120x120 size, yellow color - user drags to desired location after AI suggests
- **Duplicate handling in AI suggestions** (19-02): No state tracking of "already added" - allow duplicates, user can delete or undo (Option A)
- **lucide-react tree-shaking** (20-01): optimizePackageImports config for lucide-react (546 icons) prevents ~500KB bundle bloat via Next.js experimental feature
- **iOS Safari zoom prevention** (20-01): maximumScale=1 and userScalable=false both required for reliable iOS Safari double-tap zoom prevention (conflicts with canvas double-click)
- **dvh viewport units** (20-01): .canvas-container uses 100dvh with @supports fallback for iOS Safari collapsing toolbar (44-88px offset with regular vh)
- **iOS scroll prevention** (20-01): overscroll-behavior:none on html/body prevents iOS bounce scroll interfering with canvas pan
- **Canvas gesture prevention** (20-01): touch-action:none on .react-flow CSS class prevents default touch behaviors conflicting with ReactFlow pointer handling
- **iOS Safari passive event workaround** (20-02): Native addEventListener with passive:false for preventDefault support on iOS Safari 11.3+ (React synthetic events don't support passive option)
- **Touch handler container ref pattern** (20-02): Hook takes containerRef instead of CSS selector for React-idiomatic approach, avoids stale references
- **Interactive element touch exclusion** (20-02): Allow touch on buttons/textareas/inputs/toolbar to preserve form interaction while preventing canvas scroll
- **Belt-and-suspenders touchAction** (20-02): Inline touchAction:'none' on post-it nodes alongside global CSS for gesture prevention in React portal scenarios

### Known Tech Debt

- Workshops table needs deletedAt column for soft delete (defer to v1.2)
- Next.js middleware → proxy convention migration (non-blocking)
- CRON_SECRET configuration in Vercel dashboard (production requirement)

### v1.1 Critical Risks

From research (research/SUMMARY.md):
- SSR hydration errors with canvas libraries — mitigate with dynamic imports + ssr: false
- Bundle size explosion (Tldraw: 600KB) — target <300KB with code splitting
- Touch gesture conflicts on mobile Safari — requires real device testing

### Key Architecture Notes

- Hierarchical context: short-term (verbatim) + long-term (summaries) + persistent (artifacts)
- 6-phase conversational arc: Orient → Gather → Synthesize → Refine → Validate → Complete
- Zod schemas with retry for structured outputs
- Exponential backoff for Gemini rate limits
- AI SDK 6 manual retry pattern (setMessages + sendMessage)

## Session Continuity

Last session: 2026-02-11
Stopped at: Phase 20 complete - All v1.1 Canvas Foundation work complete (59/59 plans)
Resume file: .planning/phases/20-bundle-optimization-mobile-refinement/20-01-SUMMARY.md
Next action: v1.1 Canvas Foundation milestone complete - ready for production deployment and milestone verification

---
*Last updated: 2026-02-11 after completing 20-01-PLAN.md execution*
