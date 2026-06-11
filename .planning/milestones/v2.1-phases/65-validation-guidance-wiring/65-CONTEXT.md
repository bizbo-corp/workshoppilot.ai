# Phase 65: Validation Guidance Wiring - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning
**Source:** PRD Express Path (`.planning/milestones/v2.1-BRIEF.md`)

<domain>
## Phase Boundary

Wire the existing output-type classification into validation routing: digital output types get a guidance card linking to Journey Flow with a prototype-builder link gated on flow completion; non-digital types get strengthened off-platform alternatives and no Journey Flow/prototype links; classification edge cases (low confidence, combined types, user disagreement) are handled; `classifyOutputType()` is audited and remains the single classifier.

In scope: VAL-01 through VAL-04. Out of scope for this phase: the prototype prompt builder itself (Phase 66 — the gated link can point at the planned route or a placeholder consistent with Phase 66's route), old-mapper de-linking/banner (Phase 67), changes to Steps 0–9.

</domain>

<decisions>
## Implementation Decisions

### Digital routing (locked by brief)
- For digital types (`app_digital`, `experience_design`, and other digital-leaning outputs), the "Recommended validation approach" card reads (matching existing card structure):
  - **Approach:** A UX journey map and/or an interactive (clickable) prototype.
  - **In the workshop:** "Sketch the journey map for the core flow" → links to **Journey Flow** (`/workshop/[sessionId]/outputs/journey-flow/`), NOT the old journey-map route. "Build a low-fidelity prototype of that flow to react to" → links to the low-fi prototype builder, **disabled until the Journey Flow is marked complete** (Phase 63's `isApproved` state).
  - **After the workshop:** higher-fidelity clickable prototype (e.g. Figma-fidelity); usability tests against the mapped journey.

### Non-digital routing (locked by brief)
- Campaign, offering, process change, brand & comms, service, physical product: Journey Flow / prototype actions are **NOT offered**.
- Show the type-appropriate alternative (largely existing guidance in `output-type-guidance.ts`) and **extend each with a short explanation of how to achieve it outside WorkshopPilot** (e.g., campaign → how to run a creative concept test off-platform).

### Classification (locked by brief)
- `classifyOutputType()` in `src/lib/validation/classify-output-type.ts` is the single classifier — wire it in, do NOT create a parallel classifier.
- Audit its robustness as part of this phase: confidence handling, combined types (`outputTypes` array).
- Handle edge cases in the UI: low confidence → clear disclosure; combined types → sensible presentation; user disagrees → manual reclassification affordance that persists.

### Claude's Discretion
- Which types beyond `app_digital`/`experience_design` count as "digital-leaning" (decide from the classifier's actual semantics and document the decision)
- Reclassification UX (dropdown/dialog on the guidance card) and where the override persists (`validateArtifact.classification` or alongside)
- How the gated prototype link reads before Phase 66 ships (disabled with "complete your Journey Flow first" tooltip is the required gating; target route should match Phase 66's planned route)
- Low-confidence threshold and disclosure copy
- How Journey Flow completion state is read at the Validate step (server query of `build_packs` vs client fetch)

</decisions>

<specifics>
## Specific Ideas

- Existing surfaces: `src/lib/validation/classify-output-type.ts` (8 types, stored in `validateArtifact.classification` at Validate-step entry), `src/lib/validation/output-type-guidance.ts` (static per-type guidance + AI-tailored example line), `ValidationGuidanceCard.tsx` (renders it).
- Journey Flow completion lives in `build_packs.content` under the `'Journey Flow:'` title prefix with `isApproved: boolean` (Phase 63).
- Match existing card structure/visual language; olive tokens; light/dark parity.
- A campaign/brand/process workshop must see NO Journey Flow or prototype links (milestone success criterion).

</specifics>

<deferred>
## Deferred Ideas

- The low-fi prototype builder UI itself — Phase 66 (this phase only gates the link)
- De-linking old mapper from guidance — Phase 67 handles the banner; but THIS phase must already point guidance at Journey Flow, not the old mapper
- Hi-fi pathway — future milestone

</deferred>

---

*Phase: 65-validation-guidance-wiring*
*Context gathered: 2026-06-11 via PRD Express Path*
