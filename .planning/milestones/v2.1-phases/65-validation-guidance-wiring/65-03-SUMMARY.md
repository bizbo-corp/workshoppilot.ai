---
phase: 65-validation-guidance-wiring
plan: 03
subsystem: ui
tags: [validation, guidance-card, journey-flow, prototype-prompt, output-type-routing, completion-ux]

# Dependency graph
requires:
  - phase: 65-01
    provides: isDigitalOutputType helper, offPlatform field, output-type-guidance.ts content layer
  - phase: 65-02
    provides: journeyFlowApproved prop declaration on ValidatePanel, journeyMapApproved rename
  - phase: 63-journey-flow-editor-core
    provides: /outputs/journey-flow route, Journey Flow approval build-pack row
provides:
  - ValidationGuidanceCard wired with digital links (journey-flow active, prototype gated on journeyFlowApproved)
  - Non-digital output types get off-platform paragraph and zero digital-path links
  - Low-confidence LLM disclosure and combined-type note on guidance card
  - Manual reclassification affordance from the guidance card header
  - Per-test acknowledgedAt Done state in validation artifact (schema addition)
  - Preview/edit mode toggle on validate page
  - Build Pack ValidationPlanDeliverable receives sessionId + journeyFlowApproved (post-workshop surfacing)
  - /outputs/prototype-prompt placeholder page (auth-checked; Phase 66 replaces content)
  - Dynamic ?from=validate back link in Journey Flow toolbar
affects: [phase-66-low-fi-prototype-prompt, phase-67-park-old-mapper]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-test acknowledgedAt field in validation artifact schema — Done state survives reload without global flags"
    - "?from= query param for contextual back-link in output-page toolbars"
    - "Preview/edit mode toggle pattern in ValidatePanel — Done collapses card into summary view"
    - "Placeholder route pattern — create auth-checked page ahead of implementation phase to establish the URL contract"

key-files:
  created:
    - src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/page.tsx
  modified:
    - src/components/workshop/validate/ValidationGuidanceCard.tsx
    - src/components/workshop/validate/ValidatePanel.tsx
    - src/components/workshop/validate/ValidationPlanDeliverable.tsx
    - src/lib/schemas/validation-schemas.ts
    - src/components/journey-flow/journey-flow-toolbar.tsx
    - src/components/journey-flow/journey-flow-canvas.tsx
    - src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/journey-flow-content.tsx
    - src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/page.tsx
    - src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx
    - src/app/(dashboard)/workshop/[sessionId]/outputs/page.tsx
    - src/components/workshop/step-container.tsx

key-decisions:
  - "Per-test acknowledgedAt added to validation-schemas.ts — enables Done state to persist per assumption without a global section flag"
  - "Preview/edit mode toggle: Done collapses the validation card into a read-only summary; user re-enters edit mode via 'Edit test' button — avoids auto-redirect which breaks mid-plan review flow"
  - "prototype-prompt placeholder page created in Phase 65 — establishes the URL contract Phase 66 builds against; content is auth-checked 'coming soon'; Phase 66 should replace page.tsx body only, not recreate the route"
  - "?from=validate query param added to Journey Flow toolbar back link — contextual navigation without hardcoding the referrer in toolbar component"
  - "artifactBuilderCta prototype CTA REMOVED from ValidatePanel rather than repointed — the card's inline gated link is the canonical entry point; two entry points with different states were confusing"

patterns-established:
  - "Placeholder route pattern: create auth-checked 'coming soon' page ahead of implementation phase to lock URL contract early"
  - "Per-item acknowledgedAt in artifact schemas instead of section-level flags — finer-grained persistence, survives partial completion"
  - "?from= contextual back-link convention in output-page toolbars — toolbar stays reusable, navigation context flows via query param"

requirements-completed: [VAL-01, VAL-02, VAL-03]

# Metrics
duration: multi-session (6 feedback rounds at checkpoint)
completed: 2026-06-11
---

# Phase 65 Plan 03: Validation Guidance Card Wiring Summary

**ValidationGuidanceCard fully wired: digital outputs get active Journey Flow link + prototype link gated on journeyFlowApproved; non-digital types get off-platform alternatives and zero digital-path links; per-test acknowledgedAt Done state, preview/edit mode toggle, and prototype-prompt placeholder route established for Phase 66**

## Performance

- **Duration:** Multi-session (original 2 auto tasks + 6-round human checkpoint iteration)
- **Started:** 2026-06-11
- **Completed:** 2026-06-11
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 12

## Accomplishments

- ValidationGuidanceCard reworked: digital path (app_digital / experience_design) renders "Open Journey Flow →" as active link and "Build your prototype →" gated behind journeyFlowApproved, with disabled affordance + inline note when not yet approved
- Non-digital path renders `guidance.offPlatform` paragraph with structural guarantee of zero journey-flow/prototype links
- Classification edge cases surfaced: low-confidence LLM disclosure (< 0.6, source llm), combined-type note (primary + secondary), manual reclassify button in card header
- Completion UX redesigned across 6 checkpoint feedback rounds: per-test acknowledgedAt persistence, preview/edit mode toggle, plan/act/status gestalt regroup, Done button placement, prior-test visibility rules
- /outputs/prototype-prompt placeholder page created (auth-checked, "coming soon") — URL contract for Phase 66 established in Phase 65
- Journey Flow toolbar back link made dynamic via ?from=validate param

## Task Commits

1. **Task 1: Rework ValidationGuidanceCard** — `b8971b8` (feat) — digital links, gated prototype, off-platform section, low-confidence disclosure, combined-type note, reclassify affordance
2. **Task 2: Wire ValidatePanel** — `f4435c4` (feat) — new card props, journey-flow CTA, confidence:1 fix for user override
3. **Checkpoint feedback round 1** — `3578a05` (feat) — Test-another-assumption outside card, CTA renamed to Done
4. **Checkpoint feedback round 2** — `39f2cbd` (feat) — Build Pack validation section receives sessionId + journeyFlowApproved
5. **Checkpoint feedback round 3** — `66f5dad` (feat) — Done collapses card, auto-redirect removed
6. **Checkpoint feedback round 4** — `27d24da` (feat) — dynamic ?from= back link in Journey Flow toolbar
7. **Checkpoint feedback round 5** — `31a1ece` (feat) — prototype-prompt placeholder page
8. **Checkpoint feedback round 5** — `050824b` (feat) — consolidated completion row
9. **Checkpoint feedback round 5** — `32eabb5` (feat) — per-test acknowledgedAt Done state in validate artifact
10. **Checkpoint feedback round 5** — `1e0eeb6` (feat) — hide prior tests during new-test wizard
11. **Checkpoint feedback round 6** — `5ed2c96` (feat) — plan/act/status hierarchy regroup
12. **Checkpoint feedback round 6** — `cbd6270` (feat) — stronger guidance buttons, record-result card chrome, prior-test visibility
13. **Checkpoint feedback round 6** — `75c0949` (feat) — preview/edit mode toggle, tertiary buttons, Done inside card

## Files Created/Modified

- `src/components/workshop/validate/ValidationGuidanceCard.tsx` — Digital link overrides, gated prototype, off-platform paragraph, low-confidence disclosure, combined-type note, reclassify CTA
- `src/components/workshop/validate/ValidatePanel.tsx` — New card props wired, prototype CTA repointed to journey-flow, confidence:1 fix, completion UX redesigned (per-test Done, preview/edit mode, plan/act/status zones, prior-test visibility)
- `src/components/workshop/validate/ValidationPlanDeliverable.tsx` — Receives sessionId + journeyFlowApproved for post-workshop Build Pack surfacing
- `src/lib/schemas/validation-schemas.ts` — acknowledgedAt field added to per-test artifact type
- `src/components/journey-flow/journey-flow-toolbar.tsx` — Dynamic ?from= back link
- `src/components/journey-flow/journey-flow-canvas.tsx` — Supporting changes for toolbar wiring
- `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/journey-flow-content.tsx` — ?from= param threading
- `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/page.tsx` — ?from= param pass-through
- `src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx` — Navigation updates
- `src/app/(dashboard)/workshop/[sessionId]/outputs/page.tsx` — Navigation updates
- `src/components/workshop/step-container.tsx` — Supporting wiring
- `src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/page.tsx` — NEW: auth-checked placeholder; Phase 66 replaces content

## Decisions Made

- **Per-test acknowledgedAt schema field:** Added to validation-schemas.ts so Done state persists per assumption without a global section flag. Finer-grained than section-level flags; survives partial completion and reload.
- **Preview/edit mode toggle over auto-redirect:** Done collapses the validation card into a read-only summary view; user re-enters via "Edit test" button. Auto-redirect was removed because it broke mid-plan review flow when a user wanted to review already-completed tests.
- **prototype-prompt placeholder created in Phase 65:** Establishes the URL contract (`/workshop/[sessionId]/outputs/prototype-prompt`) that Phase 66 builds against. Phase 66 should replace the page body content only, not recreate the route.
- **artifactBuilderCta block removed (not just repointed):** The guidance card's inline gated link is the single canonical entry to prototype building. Two entry points at different gating states created UX confusion.
- **?from= query param convention for toolbar back links:** Journey Flow toolbar reads `?from=validate` and renders a contextual back link. Keeps the toolbar component reusable without hardcoding referrer logic.

## Deviations from Plan

### Checkpoint-Scope Additions (6 UX Feedback Rounds)

The original plan had 2 auto tasks + 1 human-verify checkpoint. The checkpoint required 6 rounds of iterative UX feedback before approval. All work below was scoped to the validate UX and was necessary for the feature to be usable.

**1. [Rule 2 - Missing Critical] Per-test acknowledgedAt Done state**
- **Found during:** Checkpoint round 5
- **Issue:** No per-test completion state existed; Done had nowhere to persist
- **Fix:** Added `acknowledgedAt?: string` to per-test type in `validation-schemas.ts`; ValidatePanel writes the timestamp on Done
- **Files modified:** `src/lib/schemas/validation-schemas.ts`, `src/components/workshop/validate/ValidatePanel.tsx`
- **Committed in:** `32eabb5`

**2. [Rule 1 - Bug / UX] Preview/edit mode toggle + Done-collapses-card**
- **Found during:** Checkpoint rounds 3 and 6
- **Issue:** Auto-redirect after Done broke mid-plan review flow; Done button placement and card collapse behavior were unclear across rounds
- **Fix:** Done button placed inside the card, clicking sets preview mode (read-only summary); "Edit test" re-enters edit mode; no auto-redirect
- **Files modified:** `src/components/workshop/validate/ValidatePanel.tsx`
- **Committed in:** `66f5dad`, `75c0949`

**3. [Rule 2 - Missing Critical] Plan/act/status gestalt regroup**
- **Found during:** Checkpoint round 6
- **Issue:** Information hierarchy was flat — plan, actions, and status indicators weren't visually grouped
- **Fix:** Reorganised ValidatePanel sections into plan/act/status zones with clear visual separation
- **Files modified:** `src/components/workshop/validate/ValidatePanel.tsx`
- **Committed in:** `5ed2c96`

**4. [Scope Addition] Prior-test visibility rules**
- **Found during:** Checkpoint rounds 5 and 6
- **Issue:** Completed prior tests were cluttering the active wizard flow
- **Fix:** Prior tests hidden during new-test wizard; revealed on wizard close
- **Files modified:** `src/components/workshop/validate/ValidatePanel.tsx`
- **Committed in:** `1e0eeb6`, `cbd6270`

**5. [Scope Addition - Anticipates Phase 66] Build Pack ValidationPlanDeliverable receives sessionId + journeyFlowApproved**
- **Found during:** Checkpoint round 2
- **Issue:** Build Pack validation section had no post-workshop surfacing of guidance links
- **Fix:** sessionId and journeyFlowApproved threaded to ValidationPlanDeliverable — anticipates post-workshop intent from milestone brief
- **Files modified:** `src/components/workshop/validate/ValidationPlanDeliverable.tsx`
- **Committed in:** `39f2cbd`

**6. [Scope Addition - Enables Phase 66] /outputs/prototype-prompt placeholder page**
- **Found during:** Checkpoint round 5
- **Issue:** The gated prototype link targets `/outputs/prototype-prompt` (Phase 66's route) but the route didn't exist, causing 404 — confusing during verification
- **Fix:** Created auth-checked placeholder page with "coming soon" content and a back link to validate step; Phase 66 replaces the page body, route stays the same
- **Files modified:** `src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/page.tsx` (new file)
- **Committed in:** `31a1ece`

**7. [Scope Addition] Dynamic ?from= back link in Journey Flow toolbar**
- **Found during:** Checkpoint round 4
- **Issue:** Journey Flow toolbar had no way to navigate back to the validate step after being opened from the guidance card link
- **Fix:** Toolbar reads `?from=validate` query param and renders a contextual "Back to Validate" link
- **Files modified:** `src/components/journey-flow/journey-flow-toolbar.tsx`, `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/journey-flow-content.tsx`, `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/page.tsx`
- **Committed in:** `27d24da`

---

**Total deviations:** 7 (4 correctness/UX auto-fixes, 3 scope additions that directly enable the feature and Phase 66)
**Impact on plan:** All additions necessary for the UX to be verifiable and usable. The prototype-prompt placeholder and ?from= back link are explicit enablers for Phase 66; Phase 66 planner should note the route already exists.

## Issues Encountered

- TypeScript passed clean throughout (`npx tsc --noEmit` exits 0 at all 13 commit points)
- Checkpoint approval required 6 iterative rounds — original 2-task plan was technically correct but UX quality required substantially more iteration than the checkpoint assumed

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- VAL-01, VAL-02, VAL-03 verified by user across digital/non-digital paths, gate-release after Journey Flow approval, combined-type note, and dark mode
- `/outputs/prototype-prompt` route exists as auth-checked placeholder — Phase 66 should replace the page body (do NOT recreate the route)
- `?from=validate` back-link convention established in Journey Flow toolbar — Phase 66 can apply the same pattern for its prototype-prompt toolbar
- journeyFlowApproved already flows through ValidatePanel → guidance card → Build Pack deliverable — Phase 66 gating has the data it needs
- Phase 65 is the last of 3 plans in this phase — Phase 65 is complete

---
*Phase: 65-validation-guidance-wiring*
*Completed: 2026-06-11*
