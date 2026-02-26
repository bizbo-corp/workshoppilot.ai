# Phase 56: Live Presence - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time presence awareness for workshop participants. Every participant can see who else is in the workshop and where their cursors are on the canvas. Covers cursor broadcasting, participant list, join/leave notifications, and color assignment. Does not include chat, reactions, or other collaboration features beyond presence.

</domain>

<decisions>
## Implementation Decisions

### Cursor Appearance
- Arrow pointer + name tag pill (Figma/Miro style) — colored arrow cursor with name label attached below-right
- Facilitator cursor distinguished by crown/star badge icon next to their name in the cursor label
- Smooth interpolation between broadcast positions for fluid cursor movement
- Name tag always visible as long as cursor is on canvas — no fade behavior

### Participant List Panel
- Top-right avatar stack in the toolbar area — row of avatar circles
- No overflow/+N counter needed — max 6 people (5 participants + 1 facilitator), all always visible
- Avatars show two-letter initials on a colored circle background matching their assigned cursor color
- Click avatar stack to expand full participant list showing name, role, online/idle status
- Idle indicator (>2 min inactive): avatar circle becomes semi-transparent with a gray/yellow dot

### Join/Leave Notifications
- Minimal text toasts: "Sarah joined" / "Sarah left" — small, auto-dismiss after ~3 seconds
- Bottom-right corner placement
- Stack individually — each person gets their own toast, no batching
- Same toast style for all roles — no special facilitator emphasis on join/leave

### Color Assignment
- Fixed 6-color soft pastel palette, assigned sequentially by join order
- No special color reservation for facilitator — gets whatever slot based on join order
- Color persists per workshop — stored with participant record so Sarah is always the same color in a given workshop

### Claude's Discretion
- Exact pastel color hex values for the 6-color palette
- Cursor interpolation timing/easing function
- Toast animation style (slide-in, fade, etc.)
- Avatar stack spacing and sizing
- Expanded participant list layout details
- How cursor position converts between screen and flow coordinates

</decisions>

<specifics>
## Specific Ideas

- Cursor style should follow the Figma collaboration pattern — arrow pointer with colored name pill
- With max 6 participants, the avatar stack should always show everyone without overflow
- Soft pastel palette rather than vibrant/saturated — gentler on the eyes during extended workshops

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 56-live-presence*
*Context gathered: 2026-02-27*
