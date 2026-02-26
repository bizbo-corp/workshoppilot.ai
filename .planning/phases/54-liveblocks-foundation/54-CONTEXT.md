# Phase 54: Liveblocks Foundation - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Install Liveblocks SDK, configure typed Presence/Storage definitions, wire auth and webhook endpoints, and add Neon schema for multiplayer workshops. This is infrastructure only — no UI for collaboration features, no canvas interactions, no invite flow UI. Every subsequent multiplayer phase builds on this foundation.

</domain>

<decisions>
## Implementation Decisions

### Presence shape
- Cursor position only — no step tracking or selection in Presence
- All participants must be on the same step together (synchronized step progression)
- Workshop owner is the only one who can advance steps
- Each participant's Presence includes: cursor position, assigned color, display name
- Current step is a session-level concept, not per-participant

### Storage shape
- Canvas elements only (sticky notes, cards, groupings — the visual artifacts)
- Chat messages and AI responses stay in Neon, not in Liveblocks Storage
- Storage shape must support per-user undo/redo via Liveblocks History API

### Workshop type model
- `workshopType` set at creation time (solo vs multiplayer) — not upgradeable after
- Owner can clone a solo workshop into a new multiplayer one (deferred to later phase — schema should not block this)
- Max 5 participants per multiplayer workshop, owner-configured at creation
- Join via shareable invite link (not code, not email)
- Start-then-invite flow: owner creates workshop first, shares link after
- Guests allowed — participants do not need a Clerk account to join

### Session & participant model
- One session per workshop = the entire collaboration lifecycle
- Owner can remove participants from a live session
- Disconnected participants show as "away" with a grace period (~30-60s) before presence removal
- Participants can rejoin via the same invite link after disconnect

### Persistence & data flow
- Webhook writes to Neon are debounced (not on every StorageUpdated event)
- Per-user undo/redo is a requirement — Liveblocks History API supports this
- Undo/redo UX is a later phase, but Storage shape must support it from day one

### Claude's Discretion
- `workshopType` enum values (solo/multiplayer or a more granular set based on roadmap needs)
- Hydration strategy on load (Liveblocks-first vs Neon-first)
- Whether solo workshops keep current data flow or eventually route through Liveblocks
- session_participants table columns (role, status, display info for guests)
- Debounce interval for webhook writes
- Exact Presence/Storage TypeScript type definitions
- Guest auth implementation details (signed cookies per INFR-04, stubbed in this phase)

</decisions>

<specifics>
## Specific Ideas

- Synchronized step progression is a core design choice — this is a facilitated workshop, not a free-roam collaboration tool
- Guest access is important for low-friction participation — workshop owner has a Clerk account, participants may not
- Undo/redo must be per-user (if I delete something, I can undo MY delete without affecting others)
- Clone solo→multiplayer should be possible later, so schema design should not create barriers

</specifics>

<deferred>
## Deferred Ideas

- Clone solo workshop to multiplayer — later phase (UI + data migration logic)
- Per-user undo/redo UX — later phase (canvas interaction)
- Invite flow UI — later phase (sharing/invitation management)
- Guest auth via signed cookies (INFR-04) — Phase 57, stubbed here
- Participant reconnection with state recovery (INFR-03) — Phase 57

</deferred>

---

*Phase: 54-liveblocks-foundation*
*Context gathered: 2026-02-26*
