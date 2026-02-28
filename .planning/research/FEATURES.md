# Feature Research

**Domain:** Workshop facilitation tool — dot voting for idea prioritization (Step 8) + mobile phone gate
**Researched:** 2026-02-28
**Confidence:** HIGH (dot voting patterns from Miro, FigJam, MURAL, NNGroup, Google Design Sprint Kit), MEDIUM (mobile gate — established pattern, implementation is straightforward)

---

## Context: What Is Being Added (v2.0)

WorkshopPilot already ships solo and multiplayer workshops, real-time canvas sync via Liveblocks, Crazy 8s sketching (Step 8), and a facilitator-controlled session model. v2.0 adds two features:

1. **Dot voting on Crazy 8s sketches** — Participants vote on which sketched ideas to advance. Works in solo mode (self-prioritization) and multiplayer mode (group prioritization). Facilitator controls when voting opens, sets a timer, closes voting, reviews results, and manually selects which ideas advance to Step 9.

2. **Mobile phone gate** — A dismissible full-screen overlay shown at breakpoint < 768px informing phone users that the experience is designed for desktop. Does not block access if dismissed.

Research draws from: Miro voting system, FigJam voting sessions, MURAL facilitation patterns, NNGroup dot voting research, Google Design Sprint Kit Crazy 8s voting methodology, and existing WorkshopPilot v1.9 codebase.

---

## Feature Area 1: Dot Voting — Core Mechanics

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Fixed vote budget per participant | Every dot voting tool (Miro, FigJam, MURAL, EasyRetro) gives participants a set number of votes. Without a budget, voting becomes meaningless — everyone votes for everything. | LOW | Rule of thumb from NNGroup: votes = ~25% of total options. For 8 Crazy 8s slots, 2 votes per participant is the right default. Make it configurable 1–8. |
| Multi-vote on same item | Participants must be able to stack multiple votes on a single sketch if it's strongly preferred. This is the canonical dot voting pattern — single-vote-only prevents expressing conviction. | LOW | Miro implements this via "one vote per object" toggle (off by default). Build as same toggle: default allows stacking. |
| Visual vote counter per sketch | After placing a vote, participants see a count on each sketch. Miro and FigJam both display running dot counts on each item. Without visible feedback, participants cannot track their remaining budget. | LOW | Dot indicator overlaid on each Crazy 8s slot. Shows count + remaining budget in a HUD. |
| Remaining vote budget visible | Participants track how many votes they have left. FigJam and Miro show this throughout the session. Running out of votes without knowing it causes frustration. | LOW | Persistent vote budget counter (e.g., "2 votes remaining") visible during the voting phase. Decrements as votes are placed. |
| Facilitator opens/closes voting | In both Miro and MURAL, voting is not open by default — the facilitator starts it deliberately. This prevents premature voting and gives the facilitator control over group pacing. | LOW | "Open Voting" button (facilitator-only in multiplayer, available to solo user). Voting UI activates across all participants simultaneously via Liveblocks broadcast. |
| Results visible after voting closes | Miro, FigJam, and MURAL all hide results until the facilitator ends voting. Revealing votes while voting is open causes groupthink — participants anchor on the current leaders. | MEDIUM | Hide vote counts from participants while session is open. Reveal all counts simultaneously when facilitator closes voting. In solo mode, reveal immediately on close. |
| Facilitator manually selects ideas to advance | After voting closes, the facilitator (or solo user) reviews the ranked results and picks which sketches advance to Step 9. This is the Google Design Sprint methodology — votes inform, facilitator decides. | MEDIUM | Post-voting UI shows ranked list with vote counts. Facilitator checks which sketches to advance. Replaces the current manual "idea-selection" tap-to-select on the Crazy 8s canvas. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Countdown timer with auto-close | Miro and MURAL allow facilitators to set a timer (e.g., 5 minutes). The timer displays to all participants, creating urgency. On expiry, voting closes automatically. WorkshopPilot already has a countdown timer component from v1.9 — this reuses existing infrastructure. | LOW | Reuse the existing countdown timer Liveblocks broadcast pattern from v1.9. On expiry, trigger the same close-voting action as manual close. Timer is optional — facilitator can close manually instead. |
| Anonymous voting during open session | FigJam hides other participants' votes during the voting window to prevent anchoring. MURAL calls this "blind voting." This is a meaningful differentiator over simple sticker-on-board approaches. | LOW | During an open voting session, only show the participant's own votes (not others'). When session closes, reveal all. This is a Liveblocks presence-scoped visibility concern — each client sees only their own votes until reveal. |
| Ranked results view after close | After voting closes, present sketches ranked by vote count (highest first). NNGroup research confirms this is the expected post-voting output — groups use it to identify clear winners and surface surprises. | LOW | Sort Crazy 8s slots by descending vote count after reveal. Display rank position (1st, 2nd, etc.) alongside each sketch. |
| Vote undo (before close) | Participants who mis-click or change their mind need to remove a vote. Miro allows clicking an already-voted item to remove the vote. Without undo, voting becomes high-stakes and anxious. | LOW | Toggle behavior: clicking a voted slot removes one vote from it and returns it to the budget. Standard pattern across all voting tools. |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic idea advancement based on vote count | Seems like it completes the loop automatically | Removes facilitator judgment. Design Sprint methodology is explicit: voting informs, but the Decider (facilitator) makes the final call. Auto-advancement trains users to follow the algorithm over their judgment. | Facilitator reviews ranked results and manually selects which ideas advance. Vote data is input, not output. |
| Real-time vote count visible to all during session | Transparency feels fair | This is the groupthink trap. NNGroup research is unambiguous: seeing live results anchors later voters to current leaders, destroying the independence that makes voting valuable. Miro learned this and added anonymous mode as the default. | Reveal counts only after facilitator closes the session. |
| Permanent vote history across sessions | Feels like accountability | Storing per-user vote records across sessions adds GDPR surface and complexity without value. Workshop votes are ephemeral decisions, not auditable records. | Store aggregate vote counts per slot on the workshop record. User identity on votes is irrelevant after the session. |
| Emoji reactions on sketches (separate from voting) | Richer feedback | Dilutes the voting signal. If participants can react with hearts, fire, and thumbs-up alongside dots, facilitators face conflicting signals. One prioritization mechanism per session. | Dot voting is the prioritization mechanism. Emoji reactions belong on AI messages (already shipped in v1.9 scope). |
| Custom vote colors per participant | Visual differentiation in multiplayer | Each participant's dots being a different color defeats anonymous voting. It also reintroduces social pressure (everyone can see who voted for what). | Uniform dot appearance. Participant identity on votes is not surfaced during the session. |

---

## Feature Area 2: Dot Voting — Solo vs Multiplayer Modes

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Solo mode: self-prioritization | NNGroup notes dot voting can be adapted for solo use, though it's primarily a group tool. For WorkshopPilot solo users, the flow still makes sense: review sketches with a vote budget, then decide. It formalizes the evaluation step. | LOW | Solo mode: same UI as multiplayer, but there are no other participants. User opens voting, places their own votes, closes it, reviews ranked results, advances ideas. No timer required (optional). Vote reveal is immediate on close. |
| Multiplayer mode: all participants vote | This is the canonical use case. Every participant in the Liveblocks session gets the same vote budget and casts votes during the open window. | MEDIUM | Voting state synced via Liveblocks. Each participant's votes are tracked in presence or storage. Facilitator opens/closes. All participants' votes aggregate for the reveal. |
| Facilitator controls voting in multiplayer | In all professional workshop tools, the facilitator controls voting start/stop. Participants cannot open their own session. | LOW | Open/Close Voting button is facilitator-only in multiplayer mode. Participants see the voting UI when active but cannot trigger state transitions. |
| Solo user is their own facilitator | In solo mode, the single user has full control — they open voting, set optional timer, vote, close, review. | LOW | In solo sessions (no Liveblocks room), all facilitator controls are visible to the solo user. No role gating needed. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Configurable vote count at open time | Facilitators who have run workshops know the right vote budget depends on group size and sketch count. Miro exposes a +/- control when starting voting. | LOW | When facilitator opens voting, show a configurable vote count field (default: 2, range: 1–8). This value broadcasts to all participants and sets their budget. |
| Participant completion indicator | Miro shows who is "done voting" in the participant list. Facilitators need to know when the whole group has finished before closing. | LOW | Track per-participant "done" state in Liveblocks presence. Show completion status in the existing participant list panel (e.g., checkmark beside name when all votes are placed or user clicks "Done Voting"). |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-participant vote budgets (some get more votes) | Seems fair for weighted roles | Adds a permission configuration UI and logic branching that is disproportionate to value. In design thinking, equal voice is the point. | All participants get the same configurable vote count, set by the facilitator at open time. |

---

## Feature Area 3: Mobile Phone Gate

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full-screen overlay at < 768px | Users who hit a tool on mobile and see a broken layout are more frustrated by the bad experience than by a clear gate. A full-screen overlay intercepts before they encounter the broken canvas. This is standard practice for desktop-first tools (Miro shows a simplified mobile view, many SaaS tools show a "desktop required" overlay). | LOW | Detect viewport width on mount and on resize. If < 768px, render the gate overlay over the entire page. The existing `ideation-sub-step-container.tsx` already has `isMobile` detection at 768px — the gate is a global wrapper of this same check. |
| Dismissible with user acknowledgment | Users should always be able to override. NNGroup research on error messages: always give users a path forward, even if the path is "proceed anyway." A hard block that cannot be dismissed creates hostility. | LOW | A clear dismiss button ("Continue Anyway" or "I understand, let me try"). Clicking dismiss stores the decision in localStorage so the gate does not re-appear on the same device for the same session. |
| Clear value message, not just a warning | The overlay must explain what the user is missing, not just say "not supported." Users who understand the reason are more likely to switch to desktop than users who see a generic error. | LOW | Message: tool-specific ("WorkshopPilot is a canvas-based design thinking tool. It requires a desktop or tablet for the best experience."), with an optional CTA to email a link to themselves for later. |
| Does not block all app access | The gate is informational, not a hard block. Public-facing pages (landing, pricing, sign-in) work fine on mobile. The gate is only relevant inside the workshop flow (canvas + chat). | LOW | Apply the gate inside the workshop page layout, not at the root app level. Marketing pages are outside this scope. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Email me a link for desktop" CTA | Users on phone who discover the tool want to try it later on desktop. A one-tap email-to-self removes friction of remembering to come back. | LOW | Simple mailto link pre-populated with the current URL. No server-side sending needed — opens the user's email client. Useful for landing page and workshop invite scenarios. |
| Persist dismissal across page loads | If a user dismisses the gate, they should not see it again on every navigation within the same session. Re-showing it on every step transition would be more annoying than the original problem. | LOW | Store dismissal in localStorage with a session-scoped key (e.g., `mobile-gate-dismissed`). Clear on sign-out or after 24 hours. |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Hard block (no dismiss) | Prevents "bad experiences" | Removes user autonomy. Tablet users at 767px get hard-blocked when their experience would actually be fine. Touch users who want to read the AI chat only (not canvas) are unnecessarily locked out. | Dismissible gate with a clear explanation. The app continues to work at the user's own risk. |
| Full mobile-optimized workshop experience | Mobile participation is in the FFP roadmap | Building a proper mobile experience is a separate engineering project (touch canvas, EzyDraw on mobile, chat layout reflow). A halfway attempt creates a worse experience than the gate. Building it now conflicts with PROJECT.md out-of-scope decisions. | Gate for now. "Mobile participant mode" is already in the FFP backlog. |
| Redirect to a "mobile landing page" | Gives mobile users something to do | Adds a new page to maintain. The dismiss path is sufficient — most users will either open on desktop or read the landing page which already works fine on mobile. | Gate overlay with dismiss + email-link CTA is sufficient. |

---

## Feature Dependencies

```
[Dot Voting — Open/Close Session]
    └──requires──> Voting session state (open/closed/revealing)
    └──requires──> Facilitator role check (multiplayer only)
    └──broadcasts──> via Liveblocks in multiplayer
    └──enables──> [Vote Placement UI]
    └──enables──> [Countdown Timer integration]

[Vote Placement UI]
    └──requires──> [Dot Voting — Open/Close Session] (voting must be open)
    └──requires──> crazy8sSlots in canvasStore (existing, already persisted)
    └──requires──> Vote budget state (per-participant, ephemeral during session)
    └──enables──> [Anonymous Vote Hide during session]
    └──enables──> [Vote Undo]

[Anonymous Vote Hide during session]
    └──requires──> [Vote Placement UI]
    └──requires──> Liveblocks presence-scoped storage (own votes visible, others hidden)
    └──resolves-to──> Aggregate count visible to all on session close

[Results Reveal + Ranked View]
    └──requires──> [Dot Voting — Open/Close Session] session closed
    └──requires──> Aggregate vote totals per slot
    └──enables──> [Facilitator Idea Selection to advance to Step 9]

[Facilitator Idea Selection]
    └──requires──> [Results Reveal + Ranked View]
    └──replaces──> current manual tap-to-select on Crazy 8s canvas (idea-selection phase)
    └──writes-to──> selectedSlotIds in canvasStore (existing field)
    └──enables──> Step 9 concept card generation (existing downstream)

[Countdown Timer in Voting]
    └──enhances──> [Dot Voting — Open/Close Session]
    └──reuses──> existing v1.9 countdown timer Liveblocks pattern
    └──auto-triggers──> session close on expiry

[Participant Completion Indicator]
    └──enhances──> [Vote Placement UI]
    └──requires──> Liveblocks presence (participant list, existing from v1.9)
    └──requires──> "Done Voting" action per participant

[Mobile Phone Gate]
    └──independent──> from all dot voting features (no shared state)
    └──requires──> viewport width detection (isMobile hook — already exists in ideation-sub-step-container.tsx)
    └──requires──> localStorage for dismissal persistence
    └──applies-to──> workshop page layout only (not marketing pages)
```

### Dependency Notes

- **Dot voting replaces, not extends, the current idea-selection phase.** The existing `currentPhase === 'idea-selection'` in `ideation-sub-step-container.tsx` uses tap-to-select directly on the Crazy 8s canvas. The new voting flow supersedes this: voting open → votes placed → voting closed → ranked results → facilitator picks → selectedSlotIds written. The post-voting selection writes to the same `selectedSlotIds` field in canvasStore, so downstream Step 9 is unaffected.

- **Liveblocks is already the sync layer.** Vote placement in multiplayer goes through the existing Liveblocks room. Voting session state (open/closed, budget configuration, aggregate counts) lives in Liveblocks storage, not Postgres. Individual vote placement is ephemeral Liveblocks presence until close, at which point aggregate totals are written to the canvas state and persisted to Postgres via the existing `saveCanvasState` action.

- **Solo mode requires no Liveblocks.** In solo workshops, there is no Liveblocks room. Solo voting is purely local React state — open, place votes, close, reveal, select. No broadcast needed.

- **Mobile gate is independent.** The gate does not depend on voting or any other v2.0 feature. It is a standalone layout component applied to the workshop page. It can be shipped first with no risk of blocking other work.

- **Existing `isMobile` logic in `ideation-sub-step-container.tsx` is already at 768px.** The gate standardizes this breakpoint globally. The existing component-level mobile detection can remain for its tab-based layout switching, but the gate means phone users (< 768px who haven't dismissed) will see the gate before reaching that component.

---

## MVP Definition

### Launch With (v2.0 — Must Have)

- [ ] Voting session state machine (open/closed/revealing) — required for everything
- [ ] Facilitator opens voting with configurable vote count (default 2, range 1–8)
- [ ] Vote budget per participant — tracked locally (solo) or via Liveblocks presence (multiplayer)
- [ ] Vote placement UI — tap Crazy 8s slot to place dot, tap again to remove
- [ ] Remaining vote count HUD — visible throughout voting
- [ ] Anonymous mode — own votes visible, others hidden until close
- [ ] Facilitator closes voting (manually or via countdown timer expiry)
- [ ] Results reveal — aggregate counts visible to all on close
- [ ] Ranked results view — slots sorted by vote count
- [ ] Facilitator idea selection — pick which sketches advance from ranked list
- [ ] Solo mode — full voting flow without Liveblocks
- [ ] Multiplayer mode — voting state broadcasts via existing Liveblocks room
- [ ] Mobile phone gate — dismissible full-screen overlay at < 768px
- [ ] Gate dismissal persistence — localStorage, does not re-appear on navigation

### Add After Validation (v2.0 Follow-On)

- [ ] Countdown timer integration into voting — optional timer set at voting open
- [ ] Participant completion indicator — checkmark on participant list when votes placed
- [ ] Email-to-self CTA on gate — mailto link pre-filled with current URL

### Future Consideration (v2+)

- [ ] Vote history export — include vote tallies in Build Pack deliverable
- [ ] Multi-round voting — second voting pass with reduced budget to break ties (NNGroup describes this as best practice for close results)
- [ ] Per-concept card voting in Step 9 (same mechanism, different phase)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Voting session open/close | HIGH | LOW | P1 |
| Vote placement UI on Crazy 8s slots | HIGH | LOW | P1 |
| Vote budget HUD | HIGH | LOW | P1 |
| Anonymous vote hide during session | HIGH | LOW | P1 |
| Results reveal + ranked view | HIGH | LOW | P1 |
| Facilitator idea selection from ranked list | HIGH | MEDIUM | P1 |
| Solo voting mode (local state) | HIGH | LOW | P1 |
| Multiplayer voting via Liveblocks | HIGH | MEDIUM | P1 |
| Mobile phone gate | MEDIUM | LOW | P1 |
| Gate dismissal persistence (localStorage) | MEDIUM | LOW | P1 |
| Countdown timer for voting | MEDIUM | LOW | P2 |
| Participant completion indicator | MEDIUM | LOW | P2 |
| Email-to-self CTA on gate | LOW | LOW | P2 |
| Multi-round voting (tie-breaking) | MEDIUM | MEDIUM | P3 |
| Vote export in Build Pack | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Add after P1 is stable — ideally within the same milestone
- P3: Future milestone

---

## Competitor Feature Analysis

| Feature | Miro | FigJam | MURAL | WorkshopPilot v2.0 Approach |
|---------|------|--------|-------|-----------------------------|
| Vote budget per participant | Yes — configurable 1–99, +/- control | Yes — configurable count | Yes — configurable | Yes — configurable 1–8, set at open time |
| Multi-vote on same item | Yes — toggleable "one vote per object" | Implied — stamp tool places multiple votes | Yes | Yes — default allows stacking, no separate toggle needed for v2.0 |
| Anonymous during session | Yes — "Vote anonymously" toggle | Yes — cursors hidden, others' votes hidden | Yes | Yes — own votes visible, others hidden until close |
| Results reveal on close | Yes — auto-reveal | Yes — "results immediately shown" | Yes | Yes — aggregate counts revealed when facilitator closes |
| Countdown timer | Yes — minutes/hours/days, auto-close | Separate timer (not voting-specific) | Yes | Yes — optional, reuses v1.9 timer pattern |
| Facilitator-only start/stop | Yes — facilitator or board editor | No — anyone with edit can start | Yes | Yes — facilitator-only in multiplayer, solo user controls in solo |
| Ranked results view | Counts visible, no auto-sort | No auto-sort | Yes — auto-sort by votes | Yes — sort by descending vote count after reveal |
| Participant completion tracking | Yes — "I'm done" button, shown in participant list | Not explicit | Yes | Yes — "Done Voting" maps to participant list checkmark |
| Context: tied to specific content type | No — votes on any board object | No — votes on any board object | No — votes on any sticky/frame | Yes — votes specifically on Crazy 8s sketches in Step 8 (context-specific) |
| Mobile gate | Shows simplified mobile app | Shows simplified mobile app | Shows simplified mobile app | Dismissible overlay with desktop recommendation, gate only inside workshop flow |

---

## Sources

- [Dot Voting: A Simple Decision-Making and Prioritizing Technique in UX — NN/G](https://www.nngroup.com/articles/dot-voting/)
- [Voting — Miro Help Center](https://help.miro.com/hc/en-us/articles/360017572274-Voting)
- [Run Voting Sessions in FigJam — Figma Help Center](https://help.figma.com/hc/en-us/articles/9359912208663-Run-voting-sessions-in-FigJam)
- [FREE Dot Voting Template — Miro 2025](https://miro.com/templates/dot-voting/)
- [Blind Voting Discussion — Miro Community](https://community.miro.com/ask-the-community-45/blind-voting-3418)
- [Workshop: Dot Voting and the Right Number of Votes — Designary Blog](https://blog.designary.com/p/workshop-dot-voting-and-the-right)
- [Design Techniques: Better Dot Voting — UX Collective](https://uxdesign.cc/design-techniques-better-dot-voting-590085fe36db)
- [How to Use Dot Voting for Group Decision-making — Lucidspark](https://lucid.co/blog/dot-voting)
- [Dot Voting — Wikipedia (multi-vote definition)](https://en.wikipedia.org/wiki/Dot-voting)
- [Dot Voting in Agile — daily.dev](https://daily.dev/blog/dot-voting-in-agile-prioritization-technique)
- [What is Multivoting — ASQ (multi-vote same item)](https://asq.org/quality-resources/multivoting)
- [Crazy 8s Sharing and Voting — Google Design Sprint Kit](https://designsprintkit.withgoogle.com/methodology/phase3-sketch/crazy-8s-sharing-and-voting)
- [Dot Voting Template — Dot Voting in Design Thinking (Tufts)](https://designthinking.it.tufts.edu/framework/ideate/dot-voting)
- [WorkshopPilot PROJECT.md — internal planning doc](/.planning/PROJECT.md)
- [ideation-sub-step-container.tsx — existing codebase](src/components/workshop/ideation-sub-step-container.tsx)

---

*Feature research for: WorkshopPilot.ai v2.0 — Dot Voting & Mobile Gate*
*Researched: 2026-02-28*
