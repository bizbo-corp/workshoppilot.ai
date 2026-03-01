# Phase 61: Multiplayer Voting - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the solo voting flow (Phase 60) into multiplayer — participant votes sync in real time via Liveblocks CRDT storage, individual votes are anonymous during open voting, the facilitator controls voting open/close via a coupled timer, and a completion indicator shows who has used all their votes. Timer infrastructure and facilitator controls already exist (countdown-timer.tsx, facilitator-controls.tsx). Idea selection for Step 8c advancement is facilitator-only in multiplayer.

</domain>

<decisions>
## Implementation Decisions

### Vote Anonymity & Visibility
- During open voting, all participants see aggregate vote counts on each sketch (total badge number), but no attribution of who voted for what
- Facilitator has a "god view" — can see which participant placed which votes during open voting
- On results reveal (voting closed), totals appear instantly for all participants — no staggered/animated reveal
- After results are shown, facilitator has an optional toggle to reveal individual vote attribution to all participants

### Timer & Voting Lifecycle
- Timer and voting are coupled: starting a voting timer opens voting for all participants; timer expiry closes voting and triggers results reveal simultaneously
- Facilitator can manually close voting early before timer expires (button cancels timer + triggers reveal)
- Re-voting supported: facilitator can re-open voting after results reveal, which performs a full reset — all participants' votes are cleared and everyone gets fresh budgets
- Existing timer infrastructure (countdown-timer.tsx, facilitator-controls.tsx with presets + custom input) is reused — voting hooks into the existing TIMER_UPDATE broadcast events

### Completion Indicators
- Visible to ALL participants, not facilitator-only
- Displayed as a checkmark overlay on participant avatars in the existing presence bar
- "Complete" = participant has used their entire vote budget (e.g., 4/4 votes placed)
- Dynamic: if a participant retracts a vote after being marked complete, their checkmark disappears

### Sync & Edge Cases
- Late joiners (participant joins while voting is open) can vote immediately with full budget; they see the timer at its current position
- Votes are persisted in Liveblocks CRDT storage — disconnect/reconnect preserves existing votes and remaining budget seamlessly
- Idea selection (checkboxes to advance ideas to Step 8c) is facilitator-only in multiplayer; participants see results but cannot change the selection

### Claude's Discretion
- God view UI design for facilitator (how attribution info is displayed without cluttering)
- Attribution reveal toggle placement and interaction pattern
- How "Start Voting" integrates with existing timer preset UI (combined control vs. separate)
- Checkmark overlay styling on presence avatars
- How late-joiner timer sync is handled (derive from CRDT state vs. broadcast catchup)
- CRDT schema design for multiplayer vote storage

</decisions>

<specifics>
## Specific Ideas

- Presence bar checkmarks should be lightweight — a small green check badge on the avatar, similar to online status indicators in Slack/Discord
- Facilitator god view should not look dramatically different from participant view — just additional info layered on, not a separate dashboard
- The coupled timer-voting model keeps the facilitator's mental model simple: "set a timer = start voting"
- Full reset on re-vote ensures clean rounds — no confusion about which votes are from which round

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 61-multiplayer-voting*
*Context gathered: 2026-03-01*
