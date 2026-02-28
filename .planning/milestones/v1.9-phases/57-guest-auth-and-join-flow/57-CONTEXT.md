# Phase 57: Guest Auth and Join Flow - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A participant can click a share link, enter their name, and land in a lobby — no Clerk account, no friction. The facilitator generates a share link from the multiplayer workshop; the guest joins via that link with just a display name. Covers: share link generation/copy, guest name entry, lobby waiting screen, auto-transition to canvas, reconnection/refresh recovery. Does NOT cover: guest permissions on the canvas, facilitator controls for removing participants, or real-time collaboration features (those are separate phases).

</domain>

<decisions>
## Implementation Decisions

### Share Link & Copy UX
- Share button lives in the workshop header/toolbar — always accessible, similar to Figma's share button
- One-click copy to clipboard — no modal, no popover, just copies and shows a toast confirmation
- URL format: `workshoppilot.ai/join/[token]` — clean, short, easy to share verbally
- No participant count badge on the share button — keep it a simple share icon

### Name Entry Modal
- Collect display name only — single text field, minimum friction
- Modal shows workshop title + facilitator name before the input — builds trust without revealing content
- Full-screen overlay with centered card — blurred/dimmed background, no workshop content visible behind it
- Name validation: minimum 2 characters, max ~30, trim whitespace — no profanity filter (facilitator manages participants)

### Lobby Waiting Screen
- Shows workshop title, "Waiting for the facilitator to start" message, and a live list of joined participants
- Auto-transition when facilitator starts — lobby fades out, canvas loads in, no action needed from participant
- WorkshopPilot branding only — no per-workshop customization for now
- Late joiners (workshop already started): brief lobby screen for 2-3 seconds ("Workshop in progress...") then auto-transition to canvas

### Reconnection Experience
- Subtle toast notification on disconnect/reconnect — "Reconnecting..." then "Reconnected", non-blocking
- On extended failure (30+ seconds): show "Connection lost" message with a "Reconnect" button — name stays in sessionStorage
- Page refresh: auto-rejoin with stored name from sessionStorage — skip name modal, land back in lobby or canvas
- Silent to other participants — no reconnection indicators, Phase 56 presence bar handles join/leave naturally

### Claude's Discretion
- Share token generation strategy (entropy, format)
- Guest cookie implementation details (HttpOnly, signing, scope)
- Liveblocks auth integration for guest participants
- Exact transition animations and timing
- Toast notification styling and duration
- Error states for invalid/expired share links

</decisions>

<specifics>
## Specific Ideas

- Share link copy should feel instant — like Figma or Notion's share button (one click, done)
- The join modal should block ALL workshop content — a guest should never see canvas state before entering their name
- Lobby participant list should update in real-time as others join — social proof that this is a live session
- Auto-transition to canvas should feel seamless — not a page reload, more like a view swap

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 57-guest-auth-and-join-flow*
*Context gathered: 2026-02-27*
