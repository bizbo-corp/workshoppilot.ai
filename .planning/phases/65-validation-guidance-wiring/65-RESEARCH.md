# Phase 65: Validation Guidance Wiring - Research

**Researched:** 2026-06-11
**Domain:** Validate step (Step 10) output-type routing — classification, guidance card, Journey Flow gating
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Digital routing:** `app_digital`, `experience_design`, and other digital-leaning outputs get the "Recommended validation approach" card with Journey Flow link (`/workshop/[sessionId]/outputs/journey-flow/`) and low-fi prototype link disabled until Journey Flow is `isApproved === true`. NOT the old journey-map route.
- **Non-digital routing:** `campaign`, `offering`, `process_change`, `brand_comms`, `service`, `physical_product` — Journey Flow and prototype links NOT offered. Show existing `output-type-guidance.ts` content extended with "how to do this outside WorkshopPilot" off-platform explanation per type.
- **Single classifier:** `classifyOutputType()` in `src/lib/validation/classify-output-type.ts` is the only entry point. No parallel classifier.
- **Edge case handling:** low confidence → clear disclosure; combined `outputTypes` array → sensible presentation; user disagrees → manual reclassification affordance that persists.
- Scope boundary: Phase 65 ends at the gated link. Phase 66 builds the prototype builder itself. Phase 67 de-links old mapper. Steps 0–9 are untouched.

### Claude's Discretion
- Which types beyond `app_digital`/`experience_design` count as "digital-leaning" (audit the 8 types' semantics)
- Reclassification UX (dropdown/dialog on the guidance card) and where the override persists
- How the gated prototype link reads before Phase 66 ships (disabled + tooltip is the required gating; target route matches Phase 66's planned route)
- Low-confidence threshold and disclosure copy
- How Journey Flow completion state is read at the Validate step (server query of `build_packs` vs client fetch)

### Deferred Ideas (OUT OF SCOPE)
- The low-fi prototype builder UI itself (Phase 66 — this phase only gates the link)
- De-linking old mapper from guidance (Phase 67 handles the banner)
- Hi-fi pathway
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VAL-01 | Digital output types see a "Recommended validation approach" card linking to Journey Flow, with the low-fi prototype builder link disabled until Journey Flow is marked complete, plus after-workshop guidance | `output-type-guidance.ts` has the digital bucket already; `ValidationGuidanceCard.tsx` renders it; `GuidancePhase` renders `inWorkshop[]` items that need to become interactive links. Journey Flow completion gating: query `build_packs` title LIKE `'Journey Flow:%'` at SSR time, pass boolean prop down chain (same pattern as existing `journeyMapApproved`). |
| VAL-02 | Non-digital output types see type-appropriate alternatives with off-platform explanations, no Journey Flow/prototype actions | Each non-digital bucket in `GUIDANCE` (brand, physical, service, campaign, offering) needs an `offPlatform` field added to `ValidationGuidance` interface; `ValidationGuidanceCard` renders it; `getValidationGuidance()` already returns the right bucket. |
| VAL-03 | Classification edge cases handled: low confidence, combined types, user reclassification | `DetectOutputTypeCard` already handles reclassification (toggling types, persisting via `saveClassification`). `ValidationGuidanceCard` does not yet know the confidence — needs the `classification` object (or confidence + source) passed to it. Combined types: `activePlan.outputTypes` is already an array (up to 2); guidance currently uses only `activePlan.outputType` (primary). |
| VAL-04 | `classifyOutputType()` robustness audit — wired as single classifier | Currently called from `POST /api/validation/classify`. It returns `{ type, confidence, rationale }` from a single `generateObject` call using `gemini-2.5-flash-lite`. Returns exactly one type (no combined output). Combined type handling is UI-only (user toggles up to 2). Hardening needed: see Audit section below. |
</phase_requirements>

---

## Summary

Phase 65 is a UI-wiring and content phase with minimal new infrastructure. The classification machinery (`classifyOutputType()`, `DetectOutputTypeCard`, `saveClassification`) and the guidance rendering pipeline (`output-type-guidance.ts`, `ValidationGuidanceCard`) already exist and work. The new work is:

1. **Extending `ValidationGuidance` interface** with an optional `offPlatform` field and populating it for every non-digital bucket.
2. **Making `inWorkshop` items for digital types interactive** — the two existing plain-text strings ("Sketch the journey map…" and "Build a low-fidelity prototype…") must become linked/gated elements rather than static list items.
3. **Wiring Journey Flow `isApproved` completion** into the Validate step's SSR load, exactly like the existing `journeyMapApproved` for the old mapper, but querying `'Journey Flow:%'` instead of `'Journey Map:%'`.
4. **Threading the classification confidence** into `ValidationGuidanceCard` so it can render a low-confidence disclosure and a reclassification affordance.
5. **VAL-04 hardening**: the classifier returns a single type; combined-type support is already UI-only via `outputTypes[]`. The classifier's prompt is solid but two gaps need addressing (see Audit below).

**Primary recommendation:** Extend the existing guidance types + card in place. Do not redesign `ValidationGuidanceCard` from scratch — the `GuidancePhase` rail structure is preserved; the digital `inWorkshop` items become link elements inside that same structure.

---

## Standard Stack

No new libraries required. Everything is existing project stack:

| Item | Version | Purpose |
|------|---------|---------|
| Tailwind 4 + olive tokens | existing | Styling — `var(--primary)`, `var(--muted)`, etc. |
| shadcn/ui `Button`, `Tooltip` | existing | Gated link (disabled button with tooltip) |
| Drizzle `db.select()` + `like()` | existing | SSR query for Journey Flow `isApproved` |
| `saveClassification()` server action | existing | Persist user reclassification to `validateArtifact.classification` |

---

## Architecture Patterns

### Pattern 1: Journey Flow Completion Read (server-side, SSR)

The existing pattern for `journeyMapApproved` in `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` (lines 1173–1187) is the exact template for Journey Flow approval. **Only one change needed**: swap `'Journey Map:%'` for `'Journey Flow:%'`.

Current code (line 1179):
```typescript
.where(and(eq(buildPacks.workshopId, session.workshop.id), like(buildPacks.title, 'Journey Map:%'), eq(buildPacks.formatType, 'json')))
```

Phase 65 adds a parallel block for Journey Flow:
```typescript
// Phase 65: check Journey Flow approval (gates prototype builder link)
let journeyFlowApproved = false;
if (step.id === 'validate') {
  const jfRows = await db
    .select({ content: buildPacks.content })
    .from(buildPacks)
    .where(and(
      eq(buildPacks.workshopId, session.workshop.id),
      like(buildPacks.title, 'Journey Flow:%'),
      eq(buildPacks.formatType, 'json')
    ))
    .limit(1);
  if (jfRows[0]?.content) {
    try {
      const state = JSON.parse(jfRows[0].content);
      journeyFlowApproved = state.isApproved === true;
    } catch { /* invalid JSON */ }
  }
}
```

This `journeyFlowApproved` boolean then flows: `page.tsx` → `StepContainer` prop → `ValidatePanel` prop → `ValidationGuidanceCard` prop.

**Key finding:** `journeyMapApproved` is declared in `ValidatePanel`'s prop interface (line 70) but is **never used in the render** — it was scaffolded for this phase. Phase 65 must wire it into `ValidationGuidanceCard` (or rename it to `journeyFlowApproved` with the same unused state as a future consideration — but renaming is risky; adding a parallel `journeyFlowApproved` is safer and avoids prop interface churn in the multiplayer path).

### Pattern 2: Prop Propagation Chain for Journey Flow Approval

Full chain that needs updating:
1. `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` — SSR query → `journeyFlowApproved` boolean
2. `src/components/workshop/step-container.tsx` — `StepContainerProps` interface + `renderStep10Content()` at line 1298
3. `src/components/workshop/validate/ValidatePanel.tsx` — `ValidatePanelProps` interface (line 67–83), `renderStep10Content()` calls `ValidatePanel` with `journeyMapApproved={journeyMapApproved}` (line 1298)
4. `src/components/workshop/validate/ValidationGuidanceCard.tsx` — new prop

**Decision point:** The existing prop is named `journeyMapApproved` and refers to the OLD mapper. Phase 65 should rename or add `journeyFlowApproved`. Since the old mapper link (`artifactBuilderCta`) still points to `journey-map` (a separate code path), we need `journeyFlowApproved` as a new distinct prop rather than repurposing `journeyMapApproved`. The SSR page already queries both, or should query both (Journey Flow is the new one; old mapper query can stay for backward compat with any existing prototype CTA).

### Pattern 3: ValidationGuidanceCard Extension

Current card signature:
```typescript
function ValidationGuidanceCard({
  outputType,
  tailoredExample,
  tailoring = false,
  flat = false,
}: { outputType: OutputType; tailoredExample?: string; tailoring?: boolean; flat?: boolean })
```

Phase 65 additions:
```typescript
{
  outputType: OutputType;
  tailoredExample?: string;
  tailoring?: boolean;
  flat?: boolean;
  // Phase 65
  journeyFlowApproved?: boolean;       // gates the prototype link
  classification?: OutputTypeClassification | null;  // for low-conf disclosure + reclassify CTA
  sessionId?: string;                  // for building the journey-flow href
  onReclassify?: () => void;           // opens DetectOutputTypeCard back into edit mode
}
```

The `GuidancePhase` sub-component renders `items: string[]`. For the digital bucket's `inWorkshop` items, this must become a richer type. **Options:**
- Keep `inWorkshop: string[]` in the static content and handle digital links as a separate `inWorkshopLinks` override array in `ValidationGuidanceCard`.
- Or change `ValidationGuidance.inWorkshop` to `Array<string | { text: string; href?: string; disabled?: boolean; disabledReason?: string }>`.

**Recommendation:** Keep `output-type-guidance.ts` strings unchanged (since they're shared with the Build Pack markdown via `plan-markdown.ts`). Add the link logic as a computed override inside `ValidationGuidanceCard` based on `outputType`. This prevents the markdown export from getting link syntax in its output.

### Pattern 4: Reclassification Affordance

`DetectOutputTypeCard` already provides a full reclassification UI (the type toggles + "Confirm output type" button). Phase 65 needs a lightweight "change type" affordance on `ValidationGuidanceCard` for the case where the assembled plan's type looks wrong.

**Simplest path:** Add a small "Change output type" ghost button to `ValidationGuidanceCard` that calls `onEdit()` on the Detect section in `ValidatePanel` — i.e., `setEditingSection('detect')`. This re-opens the existing `DetectOutputTypeCard` in edit mode. No new dialog needed. The reclassification persists through the existing `saveClassification()` + `toggleType()` flow.

---

## VAL-04: Classifier Audit — Findings and Hardening

### What Exists

`classifyOutputType()` in `src/lib/validation/classify-output-type.ts`:
- Uses `generateObject` with Gemini 2.5 Flash Lite at temperature 0.1
- Schema: `{ type: OutputType, confidence: number (0–1), rationale: string }`
- Prompt: classifies into exactly one of 8 types; instructs to weight solution > reframed challenge > original challenge
- Confidence: classifier-declared (not derived); threshold < 0.6 = "best guess"
- Result stored in `validateArtifact.classification` via `updateValidateArtifact`

### Gaps That Need Hardening

**Gap 1 — No combined-type output from classifier.** The classifier always returns a single `type`. Combined types (`outputTypes: [primary, secondary]`) are a UI-only concept — the user adds a second type via `toggleType()`. The classifier doesn't (and shouldn't) return two types. This is correct by design. Hardening for VAL-04 = confirming this is documented and the UI handles it gracefully (it already does — `DetectOutputTypeCard` displays rationale under the grid, which still makes sense when the user has picked a second type).

**Gap 2 — Confidence disclosure not yet wired into assembled plan.** `DetectOutputTypeCard` shows `"Best guess — please confirm."` when `classification.confidence < 0.6`. But this disclosure disappears after the user confirms (section becomes `done`). When the user reaches the assembled plan and `ValidationGuidanceCard` renders, there is currently no disclosure visible if the type was low-confidence. **Fix:** Pass `classification` to `ValidationGuidanceCard`; render a subdued disclosure note if `confidence < 0.6` and `source === 'llm'` (user overrides are implicit confirmations).

**Gap 3 — `source: 'user_override'` is not used for guidance routing.** When a user overrides the type, the classification's `confidence` is borrowed from the previous LLM classification (line 249 in `ValidatePanel.tsx`): `confidence: classification?.confidence ?? 1`. This means a low-confidence LLM classification followed by a user override still shows `confidence < 0.6`. **Fix:** When constructing the override classification in `toggleType()`, set confidence to `1` (user is certain) so the disclosure doesn't appear after an explicit override. Or, gate the disclosure on `source === 'llm'` only.

**Gap 4 — No retry on LLM classification failure.** `classifyOutputType()` does a single `generateObject` call with no retry. If Gemini returns an invalid enum value, `generateObject` will throw at schema validation. The route handler logs and returns 500. `ValidatePanel` shows the error with a "Re-detect" button — this is sufficient. No action needed beyond confirming the current behavior is acceptable.

**Gap 5 — `outputTypeSchema` comment says "five types" but there are 8.** The schema comment on line 26 of `validation-schemas.ts` reads: `"Drives the artifact lookup (which cheapest-valid test to recommend) and the §5 visibility gate: ONLY app_digital reveals the UX Journey Map + V0 prototype."` — this is stale after Phase 65 adds `experience_design` to the digital routing. **Fix:** Update this comment as part of Phase 65.

### Digital vs Non-Digital Classification

The 8 types split into two routing buckets. Phase 65's locked decision says `app_digital` and `experience_design` are digital. The "other digital-leaning outputs" are Claude's discretion:

| Type | Bucket | Rationale |
|------|--------|-----------|
| `app_digital` | DIGITAL | Confirmed in brief |
| `experience_design` | DIGITAL | Confirmed in brief — redesigning a digital flow produces a digital testable prototype |
| `physical_product` | NON-DIGITAL | Physical prototype; no digital journey to map |
| `service` | NON-DIGITAL | Concierge/roleplay test; storyboard is not a digital flow |
| `process_change` | NON-DIGITAL | Internal org change; concept card + dry run |
| `offering` | NON-DIGITAL | Value-prop / landing page test; no UX journey |
| `brand_comms` | NON-DIGITAL | Message resonance test; contextual mockup, not a flow |
| `campaign` | NON-DIGITAL | Creative concept test; no UX journey |

**Confidence:** HIGH — the `output-type-guidance.ts` already codifies this split via `GuidanceBucket`. The `'digital'` bucket maps exactly to `app_digital` + `experience_design`. All 6 non-digital types have their own bucket with tailored guidance. No type is ambiguous.

**`offering`**: a value-prop landing page test could be seen as a light digital artifact, but the guidance bucket is `'offering'` (not `'digital'`), the artifact is a one-page landing page (not a full flow), and the brief explicitly lists it as non-digital. Keep non-digital.

---

## Where Links Currently Point (Pre-Phase 65)

The `artifactBuilderCta()` function in `ValidatePanel.tsx` (lines 700–719) is the primary routing point for the "Build & run your test" CTA block. For `revealsPrototype: true` artifacts, it currently points to:
- `href: /workshop/${sessionId}/outputs/journey-map` — the OLD mapper route

Phase 65 changes: `ValidationGuidanceCard`'s digital `inWorkshop` items must link to `/workshop/${sessionId}/outputs/journey-flow/`. The `artifactBuilderCta()` block is separate and should ALSO be updated to point to `journey-flow` for `revealsPrototype` artifacts (if this isn't done in Phase 67, it creates a confusing split where guidance says journey-flow but the CTA says journey-map). **Recommendation:** Phase 65 updates `artifactBuilderCta()` to use `journey-flow` as well, since the brief says "guidance must already point at Journey Flow" and NOT the old mapper. This is Phase 65 territory (VAL-01), not Phase 67 (which only handles the mapper's own banner).

---

## Phase 66 Route (Prototype Builder Gated Link)

The prototype builder does not yet exist as a route. Phase 66 will build it. Based on the brief ("modify the existing v0-prompt-panel surface") and the existing route convention, the most likely route is:

`/workshop/[sessionId]/outputs/prototype-prompt`

or, adjacent to journey-flow:

`/workshop/[sessionId]/outputs/journey-flow/prototype`

The brief says Phase 66 "modifies the existing v0-prompt-panel surface" — `v0-prompt-panel.tsx` lives inside `src/components/journey-mapper/`. The Phase 66 plan would likely create a new route and surface rather than embedding it in the journey-flow canvas. **Recommendation for Phase 65:** Use `/workshop/[sessionId]/outputs/prototype-prompt` as the gated link target. If Phase 66 picks a different route, only the href string in `ValidationGuidanceCard` needs updating — low-risk change.

---

## Render Location and Component Hierarchy

`ValidationGuidanceCard` is rendered in `ValidatePanel.tsx` at line 558–562 (inside the "assembled plan" block, gated on `assembled && activePlan`). It is also rendered in `plan-markdown.ts` for the Build Pack export (via `flat={true}`). The `sessionId` needed for the Journey Flow href is available in `ValidatePanel` (prop at line 71) but is not currently passed to `ValidationGuidanceCard`. Need to thread it.

**ValidatePanel call site** (current):
```tsx
<ValidationGuidanceCard
  outputType={activePlan.outputType}
  tailoredExample={activePlan.tailoredExample}
  tailoring={tailoring}
/>
```

**Phase 65 target** (additions bolded in comment form):
```tsx
<ValidationGuidanceCard
  outputType={activePlan.outputType}
  tailoredExample={activePlan.tailoredExample}
  tailoring={tailoring}
  journeyFlowApproved={journeyFlowApproved}   // new prop
  classification={classification}              // new prop (for low-conf disclosure + reclassify)
  sessionId={sessionId}                        // new prop (for journey-flow href)
  onReclassify={() => setEditingSection('detect')}  // new prop
/>
```

---

## Reclassification Persistence Pattern

User reclassification already works in `DetectOutputTypeCard` → `toggleType()` → `saveClassification()` (server action) → `updateValidateArtifact`. The artifact shape stores: `validateArtifact.classification = { type, confidence, rationale, source: 'user_override', classifiedAt }`.

The "reclassify" affordance on `ValidationGuidanceCard` triggers `onReclassify()` which sets `editingSection('detect')`, reopening the existing `DetectOutputTypeCard`. No new persistence pathway needed.

---

## Common Pitfalls

### Pitfall 1: Overwriting Build Pack Markdown with Link Syntax
**What goes wrong:** If `output-type-guidance.ts`'s `inWorkshop` strings are changed to contain HTML/Markdown links, `plan-markdown.ts` would export raw link syntax into the Build Pack PDF/text.
**How to avoid:** Keep `output-type-guidance.ts` as pure strings. All link logic lives in `ValidationGuidanceCard` as computed overrides keyed on `outputType` being digital.

### Pitfall 2: journey-map vs journey-flow Prefix Confusion
**What goes wrong:** The SSR query uses `like(buildPacks.title, 'Journey Flow:%')`. If this inadvertently matches `'Journey Map:%'` rows (they won't — different prefix), approval state is wrong.
**How to avoid:** The existing code already uses `'Journey Map:%'` for the old mapper and `'Journey Flow:%'` for the new one. The Phase 63 decision log explicitly documents this distinction to prevent data loss. Just use the exact prefix.

### Pitfall 3: journeyMapApproved Prop is Declared but Unused
**What goes wrong:** `ValidatePanel` already declares `journeyMapApproved?: boolean` (line 70) but never uses it in JSX. If Phase 65 adds `journeyFlowApproved` as a separate prop and wires it through the chain, but doesn't clean up `journeyMapApproved`, a reviewer may be confused.
**How to avoid:** Either rename `journeyMapApproved` to `journeyFlowApproved` in the prop interface and update all callers (safe refactor, 3 files), OR add `journeyFlowApproved` as a new prop and leave `journeyMapApproved` as a dead prop. **Recommendation:** Rename to avoid confusion — the old mapper approval is no longer the gate; Journey Flow is.

### Pitfall 4: Prototype CTA Block Still Points to journey-map
**What goes wrong:** `artifactBuilderCta()` at line 708 points to `/workshop/${sessionId}/outputs/journey-map`. Phase 65 guidance card links to `journey-flow`. The user sees two different "go prototype" entry points pointing at different routes.
**How to avoid:** Update `artifactBuilderCta()` in Phase 65 to point to `journey-flow` for `revealsPrototype` artifacts. This is in scope for VAL-01 (the requirement says guidance routes to Journey Flow, not old mapper).

### Pitfall 5: combined outputTypes → which bucket?
**What goes wrong:** When `activePlan.outputTypes = ['app_digital', 'physical_product']`, the card currently uses `activePlan.outputType` (primary = `'app_digital'`). The guidance is digital. But "physical product" is non-digital. Showing a Journey Flow link when one type is non-digital could confuse.
**How to avoid:** Route by primary type only (the brief's "pick the single best fit" rule). Make this explicit in the disclosure: "Guidance based on your primary type (App / Digital)". If both types are non-digital, show non-digital guidance. If primary is digital, show digital guidance regardless of secondary.

---

## Off-Platform Explanation Content (VAL-02)

Each non-digital bucket in `GUIDANCE` needs a new `offPlatform` field. Draft content by bucket:

| Bucket | Types | Draft offPlatform |
|--------|-------|-------------------|
| `campaign` | `campaign` | "Run a creative concept test using survey tools (e.g. Google Forms, Maze), a small paid social test, or a real landing page in an outside tool (Carrd, Webflow)." |
| `offering` | `offering` | "Put a landing page in front of buyers using Carrd, Webflow, or even a Notion page. Collect sign-ups with Typeform or a Google Form and follow up by phone or email." |
| `physical` | `physical_product` | "Build a physical mockup with paper, cardboard, or foam. Show it in person or via video call. For pre-order, use a simple Shopify draft or a form with a Stripe payment link." |
| `service` | `service`, `process_change` | "Run the concierge or dry-run test in person or over video call. Use a shared doc or Miro board to storyboard the flow and run stakeholders through it step by step." |
| `brand` | `brand_comms` | "Use Maze or UsabilityHub for a 5-second test, or run a message resonance check via Google Forms. Test copy variations directly in the channels you'd use (email, social post, etc.)." |

These are draft copy — the planner/executor may refine tone to match the app's voice (see `src/lib/ai/soul.md`).

---

## Architecture: New vs Modified Files

| File | Action | What Changes |
|------|--------|-------------|
| `src/lib/validation/output-type-guidance.ts` | Modify | Add `offPlatform?: string` to `ValidationGuidance` interface; populate for all 5 non-digital buckets |
| `src/components/workshop/validate/ValidationGuidanceCard.tsx` | Modify | Add props (`journeyFlowApproved`, `classification`, `sessionId`, `onReclassify`); render interactive digital links; render off-platform section; render low-conf disclosure; render reclassify CTA |
| `src/components/workshop/validate/ValidatePanel.tsx` | Modify | Add `journeyFlowApproved` to `ValidatePanelProps`; pass new props to `ValidationGuidanceCard`; fix `artifactBuilderCta()` to point to `journey-flow`; fix confidence=1 on user override (`toggleType`) |
| `src/components/workshop/step-container.tsx` | Modify | Add `journeyFlowApproved` to `StepContainerProps`; pass to `ValidatePanel` in `renderStep10Content()` |
| `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` | Modify | SSR query for Journey Flow `isApproved`; pass `journeyFlowApproved` to `StepContainer` (both solo and multiplayer branches) |
| `src/lib/schemas/validation-schemas.ts` | Modify | Fix stale comment on `outputTypeSchema` (says "five types", there are 8; update reference to prototype gate) |

---

## Open Questions

1. **Rename `journeyMapApproved` → `journeyFlowApproved`?**
   - What we know: The prop is declared but unused in `ValidatePanel`. The step page and `StepContainer` both pass it (scaffolded for this phase).
   - Recommendation: Yes — rename throughout the chain. Only 3 files touched. Cleaner than adding a second boolean that shadows the first.

2. **Phase 66 prototype builder route — `/outputs/prototype-prompt` or `/outputs/journey-flow/prototype`?**
   - What we know: Nothing is committed in code yet. Phase 66 is described as "modify the existing v0-prompt-panel surface."
   - Recommendation: Use `/workshop/[sessionId]/outputs/prototype-prompt` (a sibling route to journey-flow, consistent with the outputs route pattern). The brief frames it as a separate surface.

3. **`plan-markdown.ts` — does it need off-platform content too?**
   - What we know: `ValidationGuidanceCard` is used with `flat={true}` for Build Pack markdown export. The `offPlatform` field would render in the Build Pack if added.
   - Recommendation: Yes, include it — the "how to do this outside WorkshopPilot" explanation is useful in the exported Build Pack. The `flat` prop renders the same content without card chrome.

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `src/lib/validation/classify-output-type.ts` — full classifier implementation
- `src/lib/validation/output-type-guidance.ts` — bucket structure, all 6 buckets, existing content
- `src/components/workshop/validate/ValidationGuidanceCard.tsx` — current card structure
- `src/components/workshop/validate/ValidatePanel.tsx` — full orchestration, `artifactBuilderCta()`, `toggleType()`
- `src/components/workshop/validate/DetectOutputTypeCard.tsx` — reclassification UI
- `src/lib/schemas/validation-schemas.ts` — `OutputTypeClassification`, `ValidateArtifact`, `ValidationPlan`
- `src/lib/schemas/step-schemas.ts` — `validateArtifactSchema` full shape
- `src/actions/validation-actions.ts` — `saveClassification()`, `getValidationState()`
- `src/lib/validation/save-validation.ts` — `updateValidateArtifact()` read-modify-write pattern
- `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` lines 1173–1187 — `journeyMapApproved` SSR pattern (template for Phase 65)
- `src/lib/journey-flow/types.ts` — `JourneyFlowState.isApproved`, `DEFAULT_JOURNEY_FLOW_STATE`
- `src/stores/journey-flow-store.ts` — `setApproved()` action
- `.planning/STATE.md` — Phase 63/64 accumulated decisions
- `.planning/milestones/v2.1-BRIEF.md` — locked decisions

---

## Metadata

**Confidence breakdown:**
- Classification system: HIGH — read every relevant file
- Routing architecture (SSR gating): HIGH — exact template exists in codebase
- Content (off-platform copy): MEDIUM — draft copy needs voice alignment with `soul.md`
- Phase 66 route: MEDIUM — no code committed; recommendation based on naming convention

**Research date:** 2026-06-11
**Valid until:** This phase only — code in these files may change between phases
