# Phase 16: Split-Screen Layout & Step Container Integration - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the step page layout into a split-screen with chat on the left and a right panel (canvas + output accordion) on the right. Resizable divider on desktop, tab-based switching on mobile. Both panels collapsible on desktop.

</domain>

<decisions>
## Implementation Decisions

### Panel sizing & divider
- Chat panel defaults to 320px fixed width, canvas/right panel fills the remainder
- Divider is resizable — user can drag to adjust chat width
- No minimum/maximum constraints specified (use sensible defaults)
- Panel sizes persist across steps (when user resizes on Step 2, it stays on Step 3)
- Divider is invisible until hover — no visible line, just a hover zone that highlights on mouse-over

### Right panel content
- Canvas appears on ALL steps (not just Step 8) — every step gets a canvas in the right panel
- Output appears as an accordion at the bottom of the right panel, labeled "Output"
- Output accordion only appears when an artifact has been extracted (hidden otherwise)
- When collapsed: just the "Output" label with a chevron, no preview snippet
- When expanded: takes bottom 50% of the right panel, canvas compressed to top 50%
- ArtifactConfirmation buttons (Confirm/Edit) appear inside the expanded accordion
- Canvas toolbar (+ post-it, undo/redo, group) floats over the canvas (current Phase 15/17 behavior preserved)

### Mobile stacking (<768px)
- Tabs to switch between Chat and Canvas (not stacked, one visible at a time)
- Chat tab is the default when landing on a step
- Tab bar sits at the bottom of the screen, above the step navigation
- Output accordion appears on the Canvas tab (same as desktop behavior)

### Toggle regions (collapsible panels)
- Chat panel is collapsible on desktop — collapses to a thin icon strip (~40px) with chat icon and expand button
- Canvas/right panel is also collapsible — user can go full-chat or full-canvas
- Step navigation remains fixed at the bottom, spanning full width across both panels

### Claude's Discretion
- Exact collapse/expand animation (if any)
- Thin strip icon choices and hover behavior
- Keyboard shortcut for collapse (if any)
- Accordion expand/collapse animation
- Exact minimum panel width during resize

</decisions>

<specifics>
## Specific Ideas

- Chat panel at 320px is closer to a sidebar width — the canvas is the primary workspace, chat is the assistant
- The accordion pattern for output keeps canvas as the hero view without sacrificing access to extracted artifacts
- Both panels being collapsible means users can focus: full-canvas for visual work, full-chat for conversation-heavy steps

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-split-screen-layout*
*Context gathered: 2026-02-11*
