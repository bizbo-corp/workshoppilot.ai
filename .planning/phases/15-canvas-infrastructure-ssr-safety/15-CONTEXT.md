# Phase 15: Canvas Infrastructure & SSR Safety - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

ReactFlow canvas foundation — SSR-safe dynamic imports, Zustand canvas store as single source of truth, basic post-it creation + drag, auto-save/load persistence to existing stepArtifacts JSONB column. No editing, color-coding, multi-select, grouping, quadrants, or AI integration — those are Phases 16-19.

</domain>

<decisions>
## Implementation Decisions

### Post-it appearance
- Classic sticky note style — yellow square, drop shadow, skeuomorphic feel
- No rotation — perfectly aligned, not randomly tilted
- Default color: classic yellow (color-coding comes in Phase 17)
- Small post-its (~120x120px) designed for short phrases (5-10 words)
- Post-it grows taller to fit if text overflows — no truncation
- No corner fold — shadow alone conveys the sticky note depth
- App font (system/sans-serif) — not handwritten style
- Hover effect: Claude's discretion

### Canvas creation flow
- Two creation methods: toolbar "+" button AND double-click on empty canvas space
- Toolbar "+" for discoverability, double-click as power-user shortcut
- New post-it immediately enters text editing mode (cursor blinking, ready to type)
- Toolbar "+" places post-it slightly offset from the last created one (dealing-cards pattern)
- Double-click places post-it at click position
- Minimal toolbar for Phase 15: just the "+" button (no zoom controls yet)

### Save/load behavior
- Subtle "Saving..." / "Saved" status indicator in corner of canvas
- Auto-save debounced at 2s (per roadmap success criteria)
- On save failure: retry silently, show warning only after 3 consecutive failures
- Force-save when user navigates away from step — no "unsaved changes" dialog
- Loading: brief skeleton (canvas grid/background), then post-its fade in

### Canvas initial state
- Subtle dot grid background — helps with spatial orientation
- Empty state: centered hint text "Double-click to add a post-it" — disappears after first post-it created
- On load with existing data: auto-fit zoom to show all post-its (not last zoom/pan position)
- No visible canvas boundaries — extends in all directions, dot grid continues
- Drag behavior: other post-its stay put, overlapping allowed, full manual control
- Snap-to-grid for tidy placement (invisible grid points)
- Create animation: Claude's discretion

### Claude's Discretion
- Hover effect style on post-its (lift vs border vs other)
- Post-it creation animation (pop-in, fade, or none)
- Exact shadow depth and style
- Grid snap size
- Skeleton loading animation details
- Exact positioning offset for toolbar-created post-its

</decisions>

<specifics>
## Specific Ideas

- Reference feel: Miro/FigJam — collaborative whiteboard with sticky notes on an expansive canvas
- Classic yellow sticky note is the iconic visual — instantly recognizable
- Should feel like a real design thinking session, but in a digital tool
- "Dealing cards" offset pattern when creating multiple post-its via toolbar

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-canvas-infrastructure-ssr-safety*
*Context gathered: 2026-02-10*
