# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** Phase 18 - Step-Specific Canvases

## Current Position

Milestone: v1.1 Canvas Foundation
Phase: 18 of 20 (Step-Specific Canvases)
Plan: 2 of 2
Status: Phase complete
Last activity: 2026-02-11 — Completed 18-02-PLAN.md (Step-specific canvas integration complete)

Progress: [█████████████████████░░░] 88% (55 plans complete across v0.5 + v1.0 + v1.1)

## Completed Milestones

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v0.5 Application Shell | 1-6 | 19 | 2026-02-08 |
| v1.0 Working AI Facilitation | 7-14 | 25 | 2026-02-10 |

**Cumulative stats:**
- 55 plans completed (18 phases complete)
- ~13,750 lines of TypeScript across ~289 files
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
Stopped at: Phase 18 complete - Step-specific canvases fully integrated with quadrant detection and AI context assembly
Resume file: .planning/phases/18-step-specific-canvases/18-02-SUMMARY.md
Next action: Begin Phase 19 (AI-Canvas Integration) - wire canvas context assembly into AI pipeline

---
*Last updated: 2026-02-11 after completing Phase 18, Plan 02 (18-02-PLAN.md)*
