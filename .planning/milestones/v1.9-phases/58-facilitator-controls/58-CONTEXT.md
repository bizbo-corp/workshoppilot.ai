# Phase 58: Facilitator Controls - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

The facilitator has full control of the session — step progression, AI chat, viewport alignment, timers, and graceful session end — while participants cannot interfere with facilitation decisions. This phase gates existing controls by role (facilitator vs participant) and adds new facilitator-only tools (viewport sync, timer, end session).

</domain>

<decisions>
## Implementation Decisions

### Participant Restrictions
- Hide the entire footer bar for participants — not just individual buttons, the whole bar is facilitator-only
- AI chat: participants see conversation history read-only with real-time streaming (they watch AI responses appear live as the facilitator works)
- Step transitions: when facilitator advances, participants see a brief toast notification (e.g., "Moving to Step 3: Ideation") then the view transitions after ~1 second
- Facilitator indicator: subtle icon (star or similar) next to the facilitator's avatar in the presence list so participants know who's driving

### Countdown Timer
- Facilitator sets timer via preset buttons: 1 min, 3 min, 5 min, 10 min — plus a custom input option
- Timer displays as a floating pill in the top-right area, styled consistently with the whiteboard toolbar and zoom controls
- Must adapt to both light and dark mode
- On expiry: timer flashes red/pulses for a few seconds with a subtle chime sound
- Facilitator can pause (resume later) or cancel the timer mid-countdown
- Timer state broadcast to all participants — everyone sees the same countdown

### Session Ending
- "End Session" triggers a confirmation modal: "End this workshop session? All participants will be disconnected." with Cancel/End buttons
- On confirm: participants immediately see a full-screen "Session has ended" overlay with a button to return to dashboard
- Facilitator redirects to the existing workshop detail page after ending
- Final canvas state persisted to Neon via Liveblocks REST API snapshot before the room is archived

### Viewport Sync ("Bring Everyone to Me")
- Button placed in top-right area near the timer — facilitator-only controls grouped together
- On click: broadcasts facilitator's current viewport position and zoom to all participants
- Participant transition: smooth animated pan/zoom to facilitator's position over ~500ms
- Participants see a brief toast: "Facilitator is guiding your view"
- After sync, participants are free to pan/zoom away on their own — it's a one-time alignment, not a lock
- Facilitator can trigger sync as many times as needed

### Claude's Discretion
- Exact icon choices for facilitator indicator and viewport sync button
- Timer pill styling details (border radius, shadow, padding)
- Toast notification duration and positioning
- Sound asset selection for timer chime
- Server-side authorization patterns for role gating

</decisions>

<specifics>
## Specific Ideas

- Timer and viewport sync controls both live in the top-right area, creating a "facilitator tools" zone separate from the canvas toolbar
- Timer pill should match the style of the existing whiteboard toolbar and zoom controls — consistent floating UI language
- The full-screen "Session Ended" overlay should be unambiguous and clean — a clear endpoint for participants

</specifics>

<deferred>
## Deferred Ideas

- Workshop Review Page — a dedicated post-session review page accessible from Dashboard → workshop, acting as another artifact. Would show session summary, canvas snapshots, key decisions made. Belongs in a future phase.

</deferred>

---

*Phase: 58-facilitator-controls*
*Context gathered: 2026-02-28*
