# Phase 24: Output-to-Canvas Retrofit (Steps 2 & 4) - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate Steps 2 (Stakeholder Map) and 4 (Empathy Map) from output-panel rendering to canvas-first with spatial zone layouts. Canvas replaces the output panel entirely for these steps. Reuse the "Add to Whiteboard" pattern from Step 6. Existing workshops with output-only data auto-migrate silently.

</domain>

<decisions>
## Implementation Decisions

### Step 2: Stakeholder Map — Concentric Rings Layout
- **Concentric rings** (not 2x2 grid) — 3 rings with most important stakeholders in center
- Single combined importance axis (not separate power/interest axes) — users drag cards closer to center for greater importance
- Inner ring must be generously sized to fit key player cards comfortably
- Cards distribute evenly around each ring's circumference
- Visible ring boundaries (dashed/solid circles between rings)
- Center label only ("Most Important") — no labels on outer rings
- Color-coded rings with subtle background tints per ring level
- Miro/FigJam visual aesthetic

### Step 4: Empathy Map — Classic 6-Zone Layout
- **6 zones total:** Says, Thinks, Feels, Does (4 quadrants top) + Pains and Gains (2 horizontal strips bottom)
- Classic empathy map spatial arrangement
- Color-coded zones: 4 quadrants share a neutral palette, Pains warm/red-ish, Gains cool/green-ish
- Persistent zone header labels always visible
- Miro/FigJam visual aesthetic

### Card Arrangement
- Tidy grid arrangement within zones (not organic scatter)
- Auto re-associate zone when card is dragged to a new zone (no confirmation)
- Zones expand to accommodate cards when crowded (canvas scrolls to fit)

### Output Panel Transition
- Canvas fully replaces output panel for Steps 2 & 4 — no text fallback view
- Same split-screen layout as Step 6: chat left, canvas right
- "Add to Whiteboard" button pattern from Step 6 — AI summarizes in chat, user clicks button to place cards
- Auto-zoom to fit after card placement
- Empty layout template (rings/zones) visible on step entry, before any AI output
- Other steps (1, 3, 5, 7-10) remain as-is with output panels — future phases will address

### Migration
- Auto-migrate silently when user opens existing workshop with old output-only data
- One-way conversion — no need to preserve old output format
- Persist canvas positions lazily: only write to DB once user interacts (drag, add, etc.)

### Claude's Discretion
- Smart vs default placement strategy for migrated data (use stakeholder scores / empathy categories to determine positions)
- Exact color palette for zones and rings
- Ring boundary line style (dashed vs solid)
- Card sizing within zones
- Animation/transition when cards are placed

</decisions>

<specifics>
## Specific Ideas

- "Concentric rings for stakeholders — most important in the center" — user explicitly chose this over 2x2 grid
- Miro/FigJam style whiteboard aesthetic as the visual reference
- "Smart boards with logical zones" — boards should be spatially meaningful, not just free-form post-it dumps
- Reuse Step 6 Journey Map's "Add to Whiteboard" button flow exactly
- Inner circle must be large enough for comfortable card placement
- "Leave other steps as-is but they will be replaced in time" — future canvas expansion planned but out of scope

</specifics>

<deferred>
## Deferred Ideas

- Canvas views for Steps 1, 3, 5, 7-10 — future phases
- Text export / copy-as-text for canvas data — not needed now
- Toggle between canvas and list views — canvas only for now

</deferred>

---

*Phase: 24-output-to-canvas-retrofit*
*Context gathered: 2026-02-12*
