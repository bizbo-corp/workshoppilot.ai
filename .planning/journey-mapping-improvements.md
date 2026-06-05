# Journey Mapping (Step 6) — improvement track

Multi-phase effort to make the journey-mapping step adapt to the challenge type,
read clearly for novices, and give the facilitator/participant direct control.
Context: today the AI funnels almost every workshop into the same 4 Task/Workflow
templates, the visual picker only exists in multiplayer, and stages can only be
edited by typing to the AI.

Decisions locked with the user:
- Root cause fix: BOTH rebalance the prompt AND (later) add challenge-type classification.
- Picker UX: one visual picker for everyone (solo + multiplayer).
- When to show: facilitator decides per-workshop whether to open a participant vote or just pick.

---

## Phase 1 — Rebalance selection + novice terminology ✅ DONE

Files:
- `src/lib/ai/prompts/steps/06_journey_mapping.ts` — replaced the "DEFAULT to
  workflow templates" priority ladder with INTENT-FIRST selection (acquire/buy,
  change how work gets done, build/create, recurring task, get help, grow over
  time). Added HARD RULE: at most ONE Task/Workflow cousin per 3-option trio.
  Added "write for a novice" instruction. Synced the inline catalog stage names
  + worked examples to the new plain-English labels.
- `src/lib/workshop/journeyTemplates.ts` — de-jargoned stage labels across the 42
  templates (e.g. "Validate & Parse" → "Check & Clean Up", "Triage" → "Sort by
  Priority", "Pre-contemplation" → "Not Yet Aware"). Template IDs unchanged.

Follow-up idea: verify in a real test workshop that 3 distinct-category options now
appear for non-workflow challenges (e.g. "research and buy a house", "switch payroll
system", "launch a podcast").

---

## Solo visual picker + radio UX ✅ DONE

- `src/components/workshop/journey-template-poll.tsx` — split into a presentational
  `JourneyTemplatePollView` (radio-style cards, "Confirm journey type" button) +
  `JourneyTemplatePoll` (multiplayer, voting) + `SoloJourneyTemplatePoll` (solo
  chooser, no Liveblocks). Cards now show a radio dot + hover lift; "Lock template"
  renamed to "Confirm journey type"; banner says "confirmed".
- `right-panel.tsx` — renders the solo picker in solo, the vote card in multiplayer.
- `chat-panel.tsx` — un-gated the journey poll OPEN + LOCK effects for solo (block
  only multiplayer participants). Solo selection persists via `_canvas.journeyPoll`.

Still open from the original plan (future): per-option rationale text, an explicit
"Build my own" option, and the facilitator "Open to team vote vs I'll pick" toggle.

## Phase 2 — Direct manipulation of stages ✅ DONE (mostly pre-existing)

Discovery: stage rename/add/remove/REORDER was already built into
`src/components/canvas/grid-overlay.tsx` (EditableColumnHeader, GripVertical drag →
moveGridColumn, X → removeGridColumn, "Add Stage" → addGridColumn) and wired in
`react-flow-canvas.tsx` with `canEditStructure = !isMultiplayer || isFacilitator`
(so the solo owner + multiplayer facilitator can edit). Available anytime, including
between rows. Change made: bumped the reorder grip from hidden (opacity-0) to
opacity-40 so the affordance is discoverable.

## Phase 3 — Per-row + per-cell autocomplete buttons ✅ DONE

- NEW `src/lib/canvas/grid-autocomplete-bus.ts` — client-side event bus (transient,
  per-client, NOT synced via Liveblocks) carrying autocomplete requests.
- `grid-overlay.tsx` — per-row "Auto-fill" pill under each row label (always visible)
  + a per-cell wand button in each cell's top-left corner (hover-revealed). Both
  gated on `canEditStructure`. They emit on the bus.
- `chat-panel.tsx` — subscribes to the bus and sends a hidden `__journey_autocomplete__`
  synthetic message instructing the AI to emit [GRID_ITEM] for that row/cell only
  (no row advance). Marker hidden from the transcript. Reuses the existing
  auto-apply-on-stream-completion path. Toasts if the AI is mid-response.
- `06_journey_mapping.ts` — added an AUTO-FILL REQUESTS note so the AI treats these
  as one-off, always closes by inviting the user to edit, and never advances rows.

Known tradeoff: per-cell buttons render for every cell (opacity-0 hover-reveal), so
the 18px top-left corner of a filled cell triggers autofill rather than the sticky.
Low-impact; could scope per-cell to EMPTY cells only if it feels intrusive.

## Phase 2 (original plan) — Challenge-type classification (still relevant)

- Add nullable `challengeType` to `workshops` table. ⚠️ dev/prod share ONE DB and
  `db:migrate` is broken — apply with `npm run db:push:dev`, confirm with user first.
- Classify once when Step 1 completes (small structured LLM call), store it, thread
  it through `assemble-context.ts` into the Step 6 prompt.
