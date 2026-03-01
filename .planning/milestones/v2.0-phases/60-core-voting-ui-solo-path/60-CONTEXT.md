# Phase 60: Core Voting UI + Solo Path - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

A solo user can complete the full dot voting flow on their Crazy 8s sketches — place votes via dedicated buttons, see their budget via a floating HUD, undo votes by clicking the badge, close voting, see ranked results in a separate panel, and select ideas to advance to Step 8c (Brain Rewriting). Multiplayer voting sync, facilitator timers, and participant indicators are Phase 61.

</domain>

<decisions>
## Implementation Decisions

### Vote Placement
- Dedicated vote button ("+1" or dot icon) on each sketch card — not tap-on-sketch
- Vote count shown as a circular badge on the top-right corner of each sketch card
- Clicking the badge retracts one vote (badge doubles as display + undo control)
- Stacking: badge number increments with each vote (e.g., "3"), no progressive visual emphasis on the card itself

### Budget HUD
- Floating pill positioned top-center of the canvas area, always visible during voting
- Format: count + dots visual (e.g., "●● ○○" with "2 of 4 remaining" text)
- At zero votes: pill text changes to "All votes placed" with a "Close Voting" CTA button
- Voting requires explicit "Start Voting" button from facilitator/solo user — does not auto-open on step entry

### Results Reveal
- Separate results panel/overlay (not in-place grid reordering)
- Simple fade-in animation, no staggered reveal
- Each result shows: sketch thumbnail + vote count + rank position + original slot label + description
- Zero-vote sketches shown at bottom, visually dimmed

### Idea Selection
- Checkboxes on each sketch in the results list to select ideas for advancement
- System suggests top-N voted sketches pre-checked, but user can add/remove freely
- After confirming selections, navigate to Step 8c (Brain Rewriting) with selected ideas
- User can re-open voting after closing (reset results, vote again) — forgiving for solo flow

### Claude's Discretion
- Exact vote button icon/styling
- Badge animation on vote/retract
- Results panel layout (slide-in direction, width)
- Top-N suggestion threshold
- "Start Voting" button placement and intro copy
- How selected ideas are passed to Step 8c

</decisions>

<specifics>
## Specific Ideas

- Budget HUD uses filled/empty dot icons (●○) for at-a-glance readability alongside the text count
- Badge on top-right corner mirrors notification badge patterns — familiar to users
- Results panel is a separate view, not a modal over the canvas — gives space for sketch thumbnails + metadata
- Re-voting allows solo users to iterate on their prioritization without penalty

</specifics>

<deferred>
## Deferred Ideas

- Multiplayer real-time vote sync — Phase 61
- Facilitator countdown timer — Phase 61
- Participant completion indicators — Phase 61
- Anonymous vote hiding during open voting — Phase 61

</deferred>

---

*Phase: 60-core-voting-ui-solo-path*
*Context gathered: 2026-02-28*
