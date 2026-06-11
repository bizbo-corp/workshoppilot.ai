# Phase 3: Application Shell - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete app layout with header, sidebar, and all 10 design thinking step pages routable and visible. Landing page connects to workshop creation. Workshop pages follow /workshop/[sessionId]/step/[stepId] routing. Step containers are structured shells ready for AI chat and output components. This phase delivers the structural skeleton — no AI functionality.

</domain>

<decisions>
## Implementation Decisions

### Workshop Layout
- Sidebar is **collapsible** (not always-visible)
- Sidebar shows **step number + name only** (no descriptions) — status shown by color/icon
- Sidebar is a **flat list** of all 10 steps (no grouping by design thinking phase)
- Sidebar collapse/expand via **toggle button + keyboard shortcut** (e.g., Cmd+B)
- Sidebar **collapsed/expanded state persists in localStorage** across sessions
- On mobile: **top stepper bar** — compact horizontal progress indicator, tap to expand full step list
- Header **scrolls away** with content (not sticky/fixed)
- Header contains: **logo + workshop name + step indicator + user menu**
- When sidebar is collapsed, **header step indicator is sufficient** — no icon rail needed
- Explicit **'Exit Workshop' button** in header (not logo click) to return to dashboard
- Exit workshop shows **confirmation dialog**: "Are you sure? Your progress is saved."
- Main content area is **full width** (no max-width cap) — stretches to fill available space
- Visual style: **Clean & minimal (Linear-like)** — subtle borders, muted colors, whitespace
- **Dark mode + light mode from the start** — CSS variables / Tailwind dark: classes
- Separate header components for **landing page vs workshop** (not a shared adaptive header)

### Step Containers
- Placeholder shows **step number + name + brief description** of what the step does
- All steps have **uniform visual treatment** (no per-step color accents)
- Step page includes a **real chat shell placeholder** — actual input box (disabled) + empty message area
- Disabled input shows **placeholder text**: "AI facilitation coming soon..."
- Step page has **side-by-side split**: chat area on left, output panel on right
- Split divider is **resizable** (user can drag to adjust proportions)
- On mobile: **stacked layout** — chat on top, outputs below (scroll to see both)
- Output panel shows **step-specific mock content** — each step previews its output type (e.g., Empathize shows mock persona, Ideate shows mock ideas list)
- Step descriptions are **hardcoded in component** (not fetched from DB step_definitions)

### Session Creation Flow
- Clicking 'Start Workshop' goes **straight into Step 1** — no naming dialog
- Workshop **auto-named by AI from first message** — generates a meaningful name from the user's idea
- Before AI naming, workshop appears as **'New Workshop'** in dashboard
- URL uses session ID: `/workshop/ses_abc123/step/1`
- Session **created immediately in DB** when 'Start Workshop' is clicked (not deferred)
- Brief **loading screen**: "Setting up your workshop..." with animation (1-2 seconds)
- **Anonymous users can start** workshops — auth wall appears at step 4 (per Phase 2 decisions)
- Users can have **multiple workshops** in progress simultaneously
- Dashboard primary CTA: **'Continue' most recent workshop** — 'Start New' is secondary
- Workshop cards show: **name + current step + last active** (e.g., "Pet Adoption App — Step 3: Ideate — 2 days ago")
- Workshop delete/archive: **deferred** — not in this phase
- User can **rename workshop** from dashboard or header (inline edit, click the name)

### Landing → Workshop Transition
- **Smooth morph** transition — landing page elements animate into workshop layout positions
- Resuming from dashboard also shows **brief loading screen**: "Resuming your workshop..."
- Landing page and workshop have **separate header components** (different contexts)

### Integration of Chat Area
- Chat and output panel are **equal split (50/50)** by default (user can resize)
- Chat input is an **expanding textarea** — starts single line, grows as user types
- **AI greeting per step** — pre-populated welcome message specific to each step (e.g., "Welcome to Empathize! Tell me about the problem you're solving.")
- Send behavior: **Enter sends, Shift+Enter for newline** (standard chat pattern)

### Claude's Discretion
- Sidebar width (narrow ~240px vs medium ~320px)
- Exact loading screen animation style
- Smooth morph transition implementation details
- Typography and spacing specifics
- Error state handling throughout
- Loading skeleton designs
- Mobile breakpoint thresholds
- Keyboard shortcut for sidebar toggle (suggested Cmd+B but flexible)

</decisions>

<specifics>
## Specific Ideas

- Visual style reference: **Linear** — subtle borders, muted colors, lots of whitespace, professional tool aesthetic
- Chat input behavior reference: **ChatGPT** — expanding textarea, Enter to send
- Workshop naming: AI-generated from user's first message — creates meaningful names instead of generic dates
- "AI is the PRIMARY UI" — chat area is central to the step experience, not a sidebar
- Step-specific mock outputs should preview what each step will actually produce (personas, problem statements, ideas, etc.)
- Exit confirmation dialog should reassure: "Your progress is saved"

</specifics>

<deferred>
## Deferred Ideas

- Workshop delete/archive from dashboard — future phase
- Workshop management features (bulk actions, search, filtering) — future phase

</deferred>

---

*Phase: 03-application-shell*
*Context gathered: 2026-02-07*
