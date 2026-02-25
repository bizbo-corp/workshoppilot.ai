# Phase 42: Visual Polish - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Make every surface of the app look intentional, consistent, and responsive to user interaction. This covers: olive theme audit and gap closure, page/route transitions, loading skeletons, hover/active states, toast notifications, and micro-interactions. No new features — purely visual refinement of what exists.

</domain>

<decisions>
## Implementation Decisions

### Transition & Animation Feel
- Step navigation transitions: instant swap with fade-in (new content fades in from slight opacity) — snappy, not jarring
- Animation speed: snappy tempo, 150-200ms across the app
- Both panels (chat + canvas) transition together as a unified view
- Panels that open/close (step sidebar, mobile drawers): slide from edge — spatial and intuitive

### Loading & Empty States
- Skeleton style: static placeholders (gray blocks, no shimmer/pulse animation) — quieter, less distracting
- Skeleton fidelity: Claude's discretion per component, but lean toward layout-accurate where practical (user noted some skeletons already exist and prefers accuracy)
- Priority areas: comprehensive coverage — workshop list/dashboard, chat message history, and canvas content all need skeletons
- Empty states: skipped from discussion — Claude's discretion

### Hover & Micro-Interactions
- Overall intensity: subtle — barely-there, professional, understated
- Buttons: background color shift + slight lift (translateY(-1px) with shadow) — feels tactile
- Workshop cards: lift with increased shadow on hover — feels interactive
- Step navigation hover/active states: Claude's discretion — pick what matches existing patterns

### Toast & Feedback Style
- Position: bottom-right
- Visual differentiation: olive system colors — success uses olive accent, errors use muted red, stays within design language
- Coverage: all user actions get toast feedback — create, delete, save, copy, export, errors — comprehensive
- Dismissal: all toasts auto-dismiss (3-5 seconds) — unobtrusive, no persistent toasts

### Claude's Discretion
- Empty state design and tone
- Step navigation hover/active animation style
- Skeleton fidelity level per component
- Exact micro-interaction easing curves
- Which existing components need the olive audit most urgently (prioritize by visibility)

</decisions>

<specifics>
## Specific Ideas

- Some loading skeletons already exist in the codebase — extend the pattern rather than inventing a new approach
- Sonner is already installed but underutilized — expand usage rather than replacing
- Known tech debt: semantic status colors (green/amber/red) in synthesis-summary-view are outside the olive token system — this is a known audit target
- The olive theme was rolled out in v1.5 Phase 36 — audit should catch anything that was missed or regressed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 42-visual-polish*
*Context gathered: 2026-02-25*
