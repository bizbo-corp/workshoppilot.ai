---
phase: 65-validation-guidance-wiring
verified: 2026-06-11T00:00:00Z
status: human_needed
score: 7/7 automated must-haves verified
human_verification:
  - test: "Digital path live routing — Journey Flow link active, prototype gated"
    expected: "App_digital / experience_design workshop at Step 10 shows 'Open Journey Flow ->' linking to /outputs/journey-flow; 'Build your prototype' is disabled with '— complete Journey Flow first' note"
    why_human: "Runtime rendering and link interactivity; SSR approval gate requires a real loaded page"
  - test: "Prototype gate release after Journey Flow approval"
    expected: "After approving Journey Flow and reloading the Validate step, the prototype link becomes active pointing to /outputs/prototype-prompt (expected placeholder page)"
    why_human: "Requires a live session with a Journey Flow build-pack row having isApproved=true; SSR-derived prop"
  - test: "Non-digital path — no digital links, off-platform copy visible"
    expected: "Campaign / Brand / Physical / Service / Offering types show 'Doing this outside WorkshopPilot:' paragraph; NO Journey Flow or prototype links on card or in any CTA"
    why_human: "Structural guarantee via isDigitalOutputType() is verified; actual render output with each type needs visual confirmation"
  - test: "Combined-type note"
    expected: "After tagging a second type in the Detect section, guidance card shows 'Guidance follows your primary type (X); you also tagged (Y)'"
    why_human: "Requires UI interaction through the wizard; conditional render verified in code"
  - test: "Dark mode appearance"
    expected: "All new elements (link buttons, disabled state, disclosure banner, off-platform paragraph, reclassify button) render correctly in both light and dark themes — olive tokens only"
    why_human: "Visual parity check requires human eye; no hardcoded palette classes confirmed programmatically"
  - test: "User-approved at checkpoint"
    expected: "The 65-03-SUMMARY.md documents 6 rounds of checkpoint iteration culminating in user approval; this documents the human-verified status"
    why_human: "Checkpoint approval was already obtained during plan execution per 65-03-SUMMARY.md — this item is an audit record, not a pending check"
---

# Phase 65: Validation Guidance Wiring — Verification Report

**Phase Goal:** The Step 10 validation guidance card routes each workshop to the correct next action — Journey Flow + prototype builder for digital outputs, off-platform alternatives for non-digital outputs — with robust edge-case handling and a single audited classifier.
**Verified:** 2026-06-11
**Status:** human_needed (all automated checks pass; 5 live-behavior items noted; user already approved at plan checkpoint)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every non-digital guidance bucket carries an off-platform explanation | VERIFIED | `offPlatform` field populated on all 5 non-digital buckets (brand, physical, service, campaign, offering) in `output-type-guidance.ts`; digital bucket intentionally omits it |
| 2 | Build Pack markdown export includes the off-platform explanation | VERIFIED | `plan-markdown.ts` line 37–39: `if (guidance.offPlatform)` renders `**Doing this outside WorkshopPilot:** ${guidance.offPlatform}` |
| 3 | `classifyOutputType()` is the single classifier, docs accurate | VERIFIED | Single `export async function classifyOutputType` in `src/lib/validation/classify-output-type.ts`; called from exactly one site (`src/app/api/validation/classify/route.ts`); "five types" → "eight types" + AUDIT block documenting single-entry-point contract |
| 4 | `isDigitalOutputType()` exported as canonical helper | VERIFIED | Exported at line 167 of `output-type-guidance.ts`; consumed in `ValidationGuidanceCard.tsx` line 9 (import) and line 60 (usage) |
| 5 | SSR derives `journeyFlowApproved` from `Journey Flow:%` build-pack row and threads it to ValidatePanel in both solo and multiplayer branches | VERIFIED | `page.tsx` line 1179: `like(buildPacks.title, 'Journey Flow:%')`; two `journeyFlowApproved={journeyFlowApproved}` passes confirmed; zero `journeyMapApproved` references remain |
| 6 | Digital outputs see active Journey Flow link + gated prototype link on guidance card | VERIFIED | `ValidationGuidanceCard.tsx` lines 84–116: item 0 renders active Link to `outputs/journey-flow?from=validate`; item 1 renders active Link to `outputs/prototype-prompt` when `journeyFlowApproved`, else disabled button with "complete Journey Flow first" |
| 7 | Non-digital outputs see off-platform paragraph, zero digital-path links | VERIFIED | `offPlatform` render gated on `guidance.offPlatform` (lines 201–206); digital links gated on `digital && sessionId` (line 77) — structurally impossible for non-digital types to show Journey Flow/prototype links |
| 8 | Low-confidence LLM disclosure surfaces on card | VERIFIED | `showLowConfidence` flag: `classification.source === 'llm' && classification.confidence < 0.6`; disclosure banner rendered at lines 150–172 with "Best guess:" label and inline reclassify link |
| 9 | Combined-type pair shows primary-type guidance note | VERIFIED | `showCombinedNote` = `outputTypes.length === 2`; note rendered at lines 175–180 naming both types via `OUTPUT_TYPE_LABELS` |
| 10 | User can reopen output-type selection; override persists with confidence 1 | VERIFIED | `onReclassify={() => setEditingSection('detect')}` at line 620 of `ValidatePanel.tsx`; `toggleType()` at line 261 sets `confidence: 1` explicitly; `void saveClassification(workshopId, cls)` at line 267 persists |
| 11 | `artifactBuilderCta` block removed; no journey-map route in validate surface | VERIFIED | No `outputs/journey-map` found in `src/components/workshop/validate/`; no `artifactBuilderCta` function in `ValidatePanel.tsx` |
| 12 | `/outputs/prototype-prompt` placeholder route exists, auth-checked | VERIFIED | `src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/page.tsx` exists; auth check via Clerk + participant resolution; dynamic `?from=validate` back link to Validate step |
| 13 | `?from=validate` back link in Journey Flow toolbar is dynamic | VERIFIED | `journey-flow-toolbar.tsx`: `from` prop drives `backHref` and `backLabel`; `journey-flow/page.tsx` reads `searchParams.from` and passes to `JourneyFlowContent` → toolbar |
| 14 | `tsc --noEmit` exits 0 | VERIFIED | Clean pass with zero errors across all 12 modified files |

**Score:** 14/14 automated truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/validation/output-type-guidance.ts` | `offPlatform` field + 5 non-digital entries + `isDigitalOutputType()` export | VERIFIED | 5 `offPlatform:` entries confirmed; `export function isDigitalOutputType` at line 167 |
| `src/lib/validation/plan-markdown.ts` | Off-platform line rendered after "After the workshop" | VERIFIED | `guidance.offPlatform` render at lines 37–39 |
| `src/lib/validation/classify-output-type.ts` | AUDIT block, "eight types", single-entry-point docs | VERIFIED | "eight types" at line 4; AUDIT block at line 8 |
| `src/lib/schemas/validation-schemas.ts` | Corrected `outputTypeSchema` comment + `acknowledgedAt` field | VERIFIED | Digital-path gate comment at lines 16–19; `acknowledgedAt` at line 169 |
| `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` | SSR query `'Journey Flow:%'` + 2 prop passes | VERIFIED | Line 1179 prefix; count=2 `journeyFlowApproved={journeyFlowApproved}` passes |
| `src/components/workshop/step-container.tsx` | `journeyFlowApproved` prop interface + pass in both branches | VERIFIED | Lines 160, 213, 1294 |
| `src/components/workshop/validate/ValidatePanel.tsx` | `journeyFlowApproved` destructured, card props wired, confidence:1 fix, no journey-map href | VERIFIED | Lines 88, 617–620, 261; no `outputs/journey-map` present |
| `src/components/workshop/validate/ValidationGuidanceCard.tsx` | Digital links, gated prototype, offPlatform render, disclosures, reclassify CTA; 150+ lines | VERIFIED | 293 lines; all features present |
| `src/components/workshop/validate/ValidationPlanDeliverable.tsx` | Receives `sessionId` + `journeyFlowApproved` | VERIFIED | Props declared at lines 26–27, 32, 34; passed to `ValidationGuidanceCard` at lines 120–121 |
| `src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/page.tsx` | Auth-checked placeholder; dynamic back link | VERIFIED | File exists; Clerk auth + participant check; `from === 'validate'` back-link logic |
| `src/components/journey-flow/journey-flow-toolbar.tsx` | `from` prop drives dynamic back link | VERIFIED | `from?: string` prop at line 32; `backHref`/`backLabel` derived at lines 46–50 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `plan-markdown.ts` | `output-type-guidance.ts` | `guidance.offPlatform` | WIRED | `getValidationGuidance().offPlatform` consumed at line 39 |
| `page.tsx` | `build_packs` | `like()` on `'Journey Flow:%'` prefix | WIRED | Line 1179 |
| `step-container.tsx` | `ValidatePanel.tsx` | `journeyFlowApproved={journeyFlowApproved}` in `renderStep10Content()` | WIRED | Line 1294 |
| `ValidationGuidanceCard.tsx` | `output-type-guidance.ts` | `isDigitalOutputType()` drives link rendering | WIRED | Import line 9; called at line 60 |
| `ValidatePanel.tsx` | `ValidationGuidanceCard.tsx` | `journeyFlowApproved / classification / sessionId / onReclassify` props | WIRED | Lines 615–621 |
| `ValidationGuidanceCard.tsx` | `/outputs/prototype-prompt` | Gated prototype link href | WIRED | Line 99 |
| `ValidationGuidanceCard.tsx` | `/outputs/journey-flow` | Active digital link with `?from=validate` | WIRED | Line 84 |
| `journey-flow-toolbar.tsx` | `/workshop/[sessionId]/step/validate` | `from === 'validate'` back link | WIRED | Lines 47–49 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VAL-01 | 65-02, 65-03 | Digital outputs see Journey Flow link + gated prototype builder | SATISFIED | `isDigitalOutputType()` gate; active Journey Flow link; prototype gated on `journeyFlowApproved`; SSR prop chain |
| VAL-02 | 65-01, 65-03 | Non-digital outputs see off-platform alternatives, no digital-path links | SATISFIED | `offPlatform` on all 5 non-digital buckets; rendered in card + Build Pack markdown; structural link exclusion |
| VAL-03 | 65-03 | Classification edge cases: low confidence, combined types, user reclassification | SATISFIED | `showLowConfidence` banner; `showCombinedNote`; `onReclassify → setEditingSection('detect')` + `confidence: 1` override |
| VAL-04 | 65-01 | `classifyOutputType()` audited as single classifier, accurate docs | SATISFIED | One definition, one call site; "eight types" + AUDIT block; stale schema comment corrected |

All four requirements verified. VAL-03 was marked "Pending" in REQUIREMENTS.md — the implementation is complete per code inspection; the REQUIREMENTS.md checkbox should be updated.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `prototype-prompt/page.tsx` | "coming soon" placeholder content | INFO | Intentional — Phase 65 decision to establish URL contract ahead of Phase 66 implementation; not a stub in the bug sense |

No blockers. The "coming soon" page is a documented deviation from 65-03-SUMMARY.md and is the intended state until Phase 66.

---

### Human Verification Required

The 65-03 plan checkpoint was approved by the user across all 5 verification checks (digital links, gate release, non-digital absence, combined-type note, dark mode). This is documented in 65-03-SUMMARY.md. The items below are audit records of what was verified live, not pending checks.

#### 1. Digital routing — Journey Flow link and gated prototype state

**Test:** Open a workshop at Step 10 (Validate) with output type App / Digital and a completed validation plan
**Expected:** Card shows "Open Journey Flow" as an active button linking to `/workshop/<id>/outputs/journey-flow`; "Build your prototype" shows as disabled with "— complete Journey Flow first"
**Why human:** SSR-rendered page + interactive link click; journeyFlowApproved is false until Journey Flow is approved

#### 2. Prototype gate release after Journey Flow approval

**Test:** Approve the Journey Flow for a digital workshop, reload the Validate step
**Expected:** "Build your prototype" becomes an active link to `/outputs/prototype-prompt`; clicking lands on the auth-checked placeholder page (not 404)
**Why human:** Requires a real Journey Flow build-pack row with `isApproved: true`; SSR-derived boolean

#### 3. Non-digital path — off-platform copy, no digital links

**Test:** Switch to Campaign or Brand & Comms via "Change output type"
**Expected:** Card shows "Doing this outside WorkshopPilot:" paragraph; NO Journey Flow or prototype buttons anywhere; reclassification persists on page reload
**Why human:** Visual scan across all non-digital types; persistence requires a page reload

#### 4. Combined-type note

**Test:** Tag a second output type in the Detect section
**Expected:** Guidance card immediately shows "Guidance follows your primary type (X); you also tagged (Y)"
**Why human:** State-driven UI interaction through the wizard

#### 5. Dark mode appearance

**Test:** Toggle to dark mode with both digital and non-digital guidance cards visible
**Expected:** All new elements (buttons, disabled state, disclosure banner, off-platform paragraph, reclassify button) are legible and styled correctly — no hardcoded gray/blue/white failures
**Why human:** Visual quality; confirmed programmatically that no hardcoded palette classes exist in `ValidationGuidanceCard.tsx`

---

### Scope Additions (Checkpoint-Scope, User-Approved)

These items were added during the 6-round checkpoint iteration and are in the shipped codebase. They are not in the original plan must_haves but were verified live by the user:

- **Per-test `acknowledgedAt` Done state** — `validation-schemas.ts` line 169; Done button inside card sets timestamp; persists per assumption across reloads
- **Preview/edit mode toggle** — Done collapses card to read-only; "Edit test" re-enters edit mode; no auto-redirect
- **Plan/act/status gestalt regroup** — ValidatePanel sections reorganised into clear zones
- **Prior-test visibility rules** — Prior tests hidden during active wizard, revealed on close
- **`ValidationPlanDeliverable` receives `sessionId` + `journeyFlowApproved`** — Anticipates Phase 66 post-workshop surfacing; guidance links available in Build Pack view

---

### Gaps Summary

No gaps found. All 14 automated truths verified; TypeScript passes clean; no blockers. The `outputs-content.tsx` and `dashboard-sidebar.tsx` references to `journey-map` are for the old UX Journey Mapper (a separate Phase 63 feature), not the validate surface — correctly scoped out.

The only open item is human confirmation of live rendering behavior, which was already obtained during the 65-03 checkpoint (documented in 65-03-SUMMARY.md). The REQUIREMENTS.md VAL-03 checkbox should be updated from `[ ]` to `[x]`.

---

_Verified: 2026-06-11_
_Verifier: Claude (gsd-verifier)_
