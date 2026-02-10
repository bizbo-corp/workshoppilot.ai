# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** Phase 17 - Canvas Core Interactions

## Current Position

Milestone: v1.1 Canvas Foundation
Phase: 17 of 20 (Canvas Core Interactions)
Plan: 2 of 3 complete
Status: In progress
Last activity: 2026-02-10 — Completed 17-02-PLAN.md

Progress: [████████████████████░░░░] 82% (49 plans complete across v0.5 + v1.0 + v1.1)

## Completed Milestones

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v0.5 Application Shell | 1-6 | 19 | 2026-02-08 |
| v1.0 Working AI Facilitation | 7-14 | 25 | 2026-02-10 |

**Cumulative stats:**
- 49 plans completed (15 phases complete, Phase 17 in progress)
- ~12,700 lines of TypeScript across ~277 files
- 5 days total (2026-02-07 → 2026-02-10)

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

Last session: 2026-02-10
Stopped at: Phase 17, Plan 2 complete (Multi-select, delete, undo/redo, color picker interactions wired up)
Resume file: .planning/phases/17-canvas-core-interactions/17-02-SUMMARY.md
Next action: Execute 17-03-PLAN.md (grouping and hierarchy)

---
*Last updated: 2026-02-10 after completing 17-02-PLAN.md*
