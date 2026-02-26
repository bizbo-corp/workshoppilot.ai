# Requirements: WorkshopPilot.ai

**Defined:** 2026-02-26
**Core Value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## v1.9 Requirements

Requirements for v1.9 Multiplayer Collaboration. Each maps to roadmap phases.

### Session Management

- [ ] **SESS-01**: Facilitator can create a multiplayer workshop (distinct from solo AI-led mode)
- [ ] **SESS-02**: Facilitator can generate a shareable link for the workshop
- [ ] **SESS-03**: Participant can join a multiplayer workshop via share link with name only (no account needed)
- [ ] **SESS-04**: Participants see a lobby/waiting screen before the facilitator starts the session
- [ ] **SESS-05**: All participants see a "session ended" overlay when facilitator ends the session

### Real-Time Canvas

- [ ] **SYNC-01**: All canvas nodes and edges sync in real-time across all connected participants
- [ ] **SYNC-02**: Multiple participants can concurrently edit the canvas (add/move/delete nodes)
- [ ] **SYNC-03**: Post-it notes inherit the creating participant's assigned color
- [ ] **SYNC-04**: In Crazy 8s (Step 8b), each participant has their own set of 8 sketch slots for simultaneous drawing *(defer to v2 if too complex — requires per-participant canvas regions)*
- [ ] **SYNC-05**: For shared drawing nodes outside Crazy 8s, EzyDraw is locked to one user at a time

### Live Presence

- [ ] **PRES-01**: Each participant's cursor is visible to all others in real-time
- [ ] **PRES-02**: Cursors display the participant's name and assigned color
- [ ] **PRES-03**: Participant list panel shows all connected users with online/idle status
- [ ] **PRES-04**: Toast notifications appear when participants join or leave
- [ ] **PRES-05**: Facilitator's cursor is visually distinct (badge/icon)
- [ ] **PRES-06**: Participants inactive >2 minutes show an idle indicator

### Facilitator Controls

- [ ] **FACL-01**: Only the facilitator can advance or navigate between steps
- [ ] **FACL-02**: Only the facilitator can interact with the AI chat input
- [ ] **FACL-03**: Facilitator can broadcast viewport to all participants ("bring everyone to me")
- [ ] **FACL-04**: Facilitator can set a countdown timer visible to all participants
- [ ] **FACL-05**: Facilitator can end the session (final state persisted to database)

### Infrastructure

- [ ] **INFR-01**: Real-time sync uses a managed WebSocket provider compatible with Vercel serverless (Liveblocks)
- [ ] **INFR-02**: Canvas state persists to database via webhook for durability
- [ ] **INFR-03**: Participants can reconnect after network interruption with state recovery
- [ ] **INFR-04**: Guest authentication uses signed cookies (not Clerk accounts)
- [ ] **INFR-05**: Multiplayer components are lazy-loaded to avoid bundle size impact on solo workshops

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI Chat Multiplayer

- **CHAT-01**: AI chat conversation visible to all participants in real-time (read-only for participants)
- **CHAT-02**: AI streaming tokens broadcast to all connected clients simultaneously
- **CHAT-03**: Participant emoji reactions on AI messages (ephemeral)

### Advanced Collaboration

- **COLLAB-01**: Private mode for independent ideation with deferred reveal (per-node authorization)
- **COLLAB-02**: Breakout groups / sub-canvases for parallel team work
- **COLLAB-03**: Session recording / transcript export
- **COLLAB-04**: Facilitator private notes panel
- **COLLAB-05**: Dot voting for idea selection in multiplayer context

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Per-node lock/ownership (beyond EzyDraw) | Prevents collaborative refinement, which is the core purpose |
| Participant-to-participant side channel chat | Professional facilitators actively prevent sidebar conversations |
| Individual AI conversations per participant | Destroys shared understanding; one AI thread per session |
| Email invitation flow | Share link achieves the same goal without deliverability engineering |
| Forced "follow facilitator" viewport lock | Participants feel trapped; soft viewport sync (FACL-03) is sufficient |
| Native mobile app for participants | Web-first; mobile browser participation is acceptable for v1.9 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated by roadmapper) | | |

**Coverage:**
- v1.9 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after initial definition*
