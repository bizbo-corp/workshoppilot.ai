# Plan: Renumber workshop steps 1–10 + move to slug-based step URLs

**Status:** Ready for execution. Not yet started.
**Decided by user (2026-06-08):**
- Target list: `stakeholder-mapping`=1 … `validate`=10 (10 numbered steps). ✅
- `challenge` stays as **pre-workshop setup** — keep its slug, prompt, DB row, and team-approval machinery; just remove it from the numbered 1–10 flow. ✅
- **Clean cut, no redirects** for old URLs. ✅
- **URL scheme: slug-based** — `/workshop/[id]/step/stakeholder-mapping` … `/step/validate`, `/step/challenge`. No numbers in URLs ever again. Display numbers derive from list position. ✅

---

## 1. Diagnosis (what's actually wrong today)

The "challenge removal" was done **at the display layer only**, which created a permanent off-by-one:

- `src/lib/workshop/step-metadata.ts` — `STEPS` still has **11 entries**, `challenge` at `order: 1`, `validate` at `order: 11`. `TOTAL_STEPS = 11`.
- The sidebar (`workshop-sidebar.tsx:196,230`) and mobile stepper (`mobile-stepper.tsx:61,80,111`) **filter out `challenge`** and render `step.order - 1` as the visible number.
- But links and routing use the **raw `order`**: `/step/${step.order}`, and the route parses the URL segment as an integer (`page.tsx:46` `parseInt`, `getStepByOrder`).

Result: `brainwriting` (order 9) shows as **"Step 8"** but lives at **`/step/9`**. Exactly the reported symptom.

**The fix:** make the slug the URL + identity key everywhere; keep `order` purely as an internal display/sequence number, now **1–10 for workshop steps and `0` for `challenge`** (so `challenge` is outside the numbered flow but still resolvable).

---

## 2. Target architecture

- **Slug is identity.** URLs, navigation, broadcasts, and behavioral branching all key on the slug (`step.id`).
- **`order` is display/sequence only.** `challenge.order = 0`; `stakeholder-mapping`=1 … `validate`=10. The sidebar's `-1` hack is deleted — numbered steps render `step.order` directly.
- **Route accepts slugs.** `getStepBySlug(stepId)` replaces `parseInt` + `getStepByOrder`. Unknown/invalid slug → redirect to the first navigable step.
- **Magic-number comparisons become slug checks.** Every `stepOrder === N` that encodes a specific step is rewritten as `step.id === '<slug>'`. This is the core robustness win and prevents silent breakage when order shifts.
- **Numeric `stepOrder` prop threading stays.** `StepContainer` and its children keep receiving a numeric `stepOrder` (fed the new `step.order` value) so we don't have to refactor a 2,000-line component and its broadcast types. Only behavioral comparisons get converted to slug checks.

### Paywall boundary
Currently `stepNumber >= 8` gates `ideation, brainwriting, concept, validate`. After renumber, `ideation` = order 7. To gate the **exact same steps**, define a single source of truth:
- Add `PAYWALL_START_SLUG = 'ideation'` (or `PAYWALL_START_ORDER = 7`) in `src/lib/billing/paywall-config.ts`.
- Replace `stepNumber >= 8` with `step.order >= getStepBySlug('ideation').order`.

---

## 3. OUT OF SCOPE — do not touch (false positives)

These matched the greps but are unrelated numbering systems. Touching them will break things:

- **Crazy 8s / brainwriting phase badges (`stepNumber` 1–4)** inside the ideation canvas:
  `phase-container-node.tsx`, `phase-container-shell.tsx`, `voting-container-node.tsx`,
  `brain-rewriting-container-node.tsx`, `mind-map-canvas.tsx`. These are intra-canvas phase numbers, not workshop steps.
- **AI build-pack summary numbering (`stepSummaries`, `stepNumber 1-10`)**:
  `lib/extraction/extract-artifact.ts:71`, `lib/schemas/step-schemas.ts:466`,
  `api/dev/seed-workshop/fixtures.ts`, `components/workshop/synthesis-summary-view.tsx`.
  This is generated build-pack *content* (the AI already numbers Challenge=1…Validate=10 with brainwriting folded in). Separate concern — leave as-is. *(Note: it's internally inconsistent with the canvas flow, but that's a content decision, not navigation.)*
- `lib/drawing/history.ts` (`currentStep` = undo pointer), `api/dev/cleanup-orphaned-blobs` (chunk size). Unrelated.

---

## 4. Changes, grouped

### A. Canonical metadata — `src/lib/workshop/step-metadata.ts`
1. Set `challenge.order = 0`. Renumber the rest: `stakeholder-mapping`=1, `user-research`=2, `sense-making`=3, `persona`=4, `journey-mapping`=5, `reframe`=6, `ideation`=7, `brainwriting`=8, `concept`=9, `validate`=10.
2. `TOTAL_STEPS = 10` (the numbered count). Update the interface comment `// 1-10`.
3. Add helpers to centralize logic and kill scattered arithmetic:
   - `NUMBERED_STEPS = STEPS.filter(s => s.order >= 1)` (for stepper rendering).
   - `getFirstStep()` → `stakeholder-mapping`; `getNextStep(slug)`, `getPrevStep(slug)` (by order among numbered steps, so Back from step 1 doesn't land on `challenge`).
   - Keep `getStepByOrder`, `getStepBySlug`, `getStepById` (all still valid; `getStepByOrder(0)` = challenge).

### B. The step route — `src/app/workshop/[sessionId]/step/[stepId]/page.tsx`
4. Replace `parseInt(stepId)` + range check (lines 46–58) with `const step = getStepBySlug(stepId)`; if missing → `redirect(.../step/stakeholder-mapping)`.
5. Internal redirects currently pointing at `/step/1` (lines 50, 57, 215, 217) → point at the correct slug:
   - "not found" / fallback → `/step/stakeholder-mapping` (first numbered step) **or** `/step/challenge` depending on context (line 215 uses `activeStepDef?.order || 1` → change to `activeStepDef?.id ?? 'stakeholder-mapping'`).
6. Paywall (lines 220–245): replace `stepNumber >= 8` with `step.order >= getStepBySlug('ideation').order`. Pass `stepNumber={step.order}` to `PaywallOverlay` (still numeric, for display).
7. `stepOrder={stepNumber}` passed to `StepContainer` (lines 1256, 1298) → `stepOrder={step.order}`.

### C. Stepper / header display (drop the `-1` hack, parse slug from pathname)
8. `src/components/layout/workshop-sidebar.tsx`:
   - Pathname regex (line 144) `/step/(\d+)/` → `/step/([^/]+)/`; compare against `step.id` (not number).
   - Keep `.filter(s => s.id !== 'challenge')`. Link `href={.../step/${step.slug}}` (line 269).
   - Display number: render `step.order` directly (line 230, remove `- 1`).
   - `isLocked` (line 202): `step.order >= getStepBySlug('ideation').order` (i.e. `>= 7`).
   - Loading skeleton count (line 166) `length: 9` → `10`.
9. `src/components/layout/mobile-stepper.tsx`:
   - Pathname regex (line 44) → slug; `onChallenge = currentSlug === 'challenge'` (line 47).
   - Header (line 61) `Step ${currentStep - 1} of 9` → `Step ${currentStep.order} of 10`; name lookup (line 65) `STEPS[currentStep-1]` → `getStepBySlug(currentSlug)`.
   - Filter + link `step.slug` (line 138); display number `step.order` (line 111, remove `- 1`); `isLocked` `>= 7` (line 86).
10. `src/components/layout/workshop-header.tsx`: pathname parse (line 126) → slug; `Step {currentStep.order - 1}` (line 185) → `{currentStep.order}`.
11. `src/app/workshop/[sessionId]/lobby/lobby-steps-journey.tsx:144`: `{card.order - 1}` → `{card.order}` (verify `card.order` is the renumbered value).

### D. Step navigation — `src/components/workshop/step-navigation.tsx`
12. `currentStepOrder` prop stays numeric (fed `step.order`). But:
    - `isFirstStep` (line 109): `currentStepOrder <= 2` → `currentStepOrder <= 1` (first numbered step is now order 1). Better: derive from `getPrevStep(currentSlug) == null`.
    - `isLastStep` (line 110): `currentStepOrder === STEPS.length` → `currentStepOrder === TOTAL_STEPS` (=10) or `step.id === 'validate'`.
    - `handleNext` (lines 149–150): find current/next via `getNextStep`. Keep passing slug ids to `advanceToNextStep`.
    - `handleBack` (line 204) and forward nav (line 360): `router.push(.../step/${prevSlug})` / `${nextSlug}` via `getPrevStep`/`getNextStep`, **not** `currentStepOrder ± 1`.

### E. Multiplayer broadcast + advance action
13. `src/actions/workshop-actions.ts`:
    - `advanceToNextStep` final redirect (line 708) `/step/${nextStepOrder}` → `/step/${nextStep.id}`.
    - `STEP_CHANGED` broadcast payload (line 618) — add/replace `stepOrder` with `stepSlug: nextStep.id` (keep `stepOrder` too for the toast label if desired).
    - Early returnUrls/redirects/`revalidatePath` pointing at `/step/1` (lines 189, 209, 262, 338) → `/step/challenge` (these are the challenge/setup entry points — verify each: setup flow = `challenge`).
    - Order-based filters (lines 870, 981) and `STEPS.map((step,index))` (line 133) keep working with new orders (challenge order 0 sorts first; it still gets a `workshopSteps` row — intended).
14. `src/components/workshop/multiplayer-room.tsx` (lines 121, 126, 350): consume `stepSlug` from the broadcast; `router.push`/`window.location.href` → `/step/${stepSlug}`. Toast label can still show the number via `getStepBySlug(slug).order`.
15. `src/app/join/[token]/page.tsx` (lines 102–103, 116): redirect `/step/${activeStep.stepDefinition.slug}`; `currentStepOrder` prop → keep numeric for display via `.order`.

### F. Behavioral magic-number → slug checks
16. `src/components/workshop/step-container.tsx`:
    - Lines 916, 923: `stepOrder === 1` (challenge team-setup) → `step?.id === 'challenge'`.
    - Lines 933, 1006: `router.replace(.../step/1...)` → `/step/challenge`.
    - Fallback labels (lines 1721, 2178) `Step ${stepOrder}` are fine (numeric display).
17. `src/components/workshop/output-panel.tsx` lines 175/194/213: `stepOrder === 5/6/7` → `step.id === 'persona'/'journey-mapping'/'reframe'` (use `getStepByOrder(stepOrder)?.id`).
18. `src/components/workshop/facilitator-controls.tsx:514`: `stepOrder === 10` (concept) → `getStepByOrder(stepOrder)?.id === 'concept'`.

### G. Paywall / upgrade UI
19. `src/components/workshop/paywall-overlay.tsx`: returnUrl `/step/8` (line 103) → `/step/ideation`; `router.push(.../step/7)` (line 118) → `/step/reframe` (the last free step before the wall — verify intent).
20. `src/components/workshop/upgrade-dialog.tsx`: returnUrl `/step/8` (line 94) → `/step/ideation`; next-step lookups (lines 66–67) keep working; hardcoded copy "7 of 10 steps complete — 3 to go" (line 158) — re-verify against new numbering (reframe=6 is the last free step → "6 of 10 … 4 to go", OR keep generic). Decide during execution.

### H. Outputs / results / journey deep-links
21. `src/app/workshop/[sessionId]/results/results-content.tsx:56` `/step/10` → **verify intent**: order-10 today = `concept`. Likely meant "the last/Validate step" → `/step/validate`. Confirm before converting.
22. `src/app/workshop/[sessionId]/outputs/outputs-content.tsx:130,362` `/step/10` → same verification → `/step/validate` (probably).
23. `src/components/journey-mapper/ux-journey-mapper.tsx:914` `/step/10?v0=creating` → resolve which step this is meant to open (concept vs validate) and convert to slug.

### I. Emails, setup, challenge, invitation actions (all `/step/1` = challenge, `/step/2` = first numbered)
24. Convert and re-verify `revalidatePath`/link targets to slugs:
    - `src/actions/workshop-setup-actions.ts:135,139,176,200,201,205,296` — `/step/1`→`/step/challenge`, `/step/2`→`/step/stakeholder-mapping`.
    - `src/actions/challenge-actions.ts:190`, `src/actions/challenge-approval-actions.ts:227,318` — `/step/1`→`/step/challenge`.
    - `src/actions/invitation-actions.ts:397,433,690` — `/step/1`→`/step/challenge`.
    - `src/lib/email/invitation-email.ts:287` — `/step/1`→`/step/challenge`.
    - `src/components/dialogs/settings/challenge-settings-tab.tsx:108` — `/step/1`→`/step/challenge`.
    - `src/app/workshop/[sessionId]/lobby/page.tsx:53` — `/step/1` → likely `/step/stakeholder-mapping` (lobby is post-challenge) — **verify**.
    - `src/lib/email/research-reminder-email.ts:21` — comment references `/step/3` (user-research) — update doc comment; if it builds a URL, → `/step/user-research`.
25. `src/app/dashboard/page.tsx`: `currentStep` numeric (lines 96–117) → derive slug for the CTA link (line 312) `/step/${slug}`; fallback `getStepByOrder(1)` (line 104) — order 1 is now `stakeholder-mapping`; if the intent was "challenge/first", use `getStepBySlug('challenge')` or `getFirstStep()`. **Verify intent.**

### J. Middleware — `src/middleware.ts`
26. The numeric matchers (`/step/1..10`) become stale. Note: step protection here is largely **vestigial** — the catch-all `'/workshop/:path*/step/:stepId'` (line 33) already makes every step page public, and the protected branch lets page routes through (lines 95–96). Recommended: **remove the per-step numeric matchers** (lines 20–22 public, 45–51 protected) and rely on the existing catch-all + `AuthGuard`. This also resolves the latent bug where `/step/11` (validate) was never protected. Confirm no other logic depends on those matchers.

### K. DB seed (⚠ shared prod DB)
27. `scripts/seed-steps.ts`: update `order` values to match (challenge=0, stakeholder=1 … validate=10). Re-running the seed updates the `step_definition.order` column (upsert). **No migration needed** — `order` is data, not schema, and `workshopSteps.stepId` (slug FK) is untouched, so existing workshops are unaffected.
   - ⚠️ **`.env.local` is production** (per memory `dev-prod-share-one-database`). Running `npm run db:seed` writes to prod. The `order` column is only read for display/sequencing, so updating it is low-risk, but do it deliberately and confirm before running.
   - `scripts/seed-workshop.ts` uses `STEPS` + slug `--up-to-step`; should need no change beyond inheriting new orders. Verify.

### L. Tests
28. `e2e/workshop-walkthrough.spec.ts` (+ `e2e/demo-test.spec.ts`): if they navigate by numeric `/step/N`, convert to slugs; update "10 steps" comments. Run `npm run test:e2e -- e2e/workshop-walkthrough.spec.ts` after changes.

---

## 5. Pre-flight reading (per CLAUDE.md)
- `.planning/codebase/DEFENSIVE_PATTERNS.md` — regression-critical chat greeting flow; the step route touches greeting/message init (`page.tsx` lines 247–287). Don't regress.
- `.planning/codebase/CONCERNS.md` — known footguns.

## 6. Verification checklist
- `npx tsc --noEmit` clean.
- `npm run lint` clean.
- Manual (dev server in **this** worktree, `wt2`): create/open a workshop →
  - Sidebar shows **1…10**, names correct, current-step highlight correct.
  - URL for each step is the **slug** and matches the displayed number (validate = `/step/validate`, shown as 10).
  - Back from step 1 does **not** land on `challenge`; Next from `validate` shows Complete.
  - Challenge/setup reachable at `/step/challenge`; team-mode setup wizard still appears.
  - Paywall: `ideation` onward gated (free preview through `reframe`); upgrade/return links land on the right slugs.
  - Multiplayer: facilitator "Next" moves participants to the correct next step (broadcast slug).
  - Dashboard "Continue" CTA opens the correct in-progress step.
- `npm run test:e2e -- e2e/workshop-walkthrough.spec.ts`.

## 7. Risks / watch-outs
- **Old in-flight URLs break by design** (clean cut). `/step/9` etc. now 404→redirect. Acceptable per decision; if any live prod sessions exist, expect a one-time bounce to the first step.
- **`/step/10` deep-links (§H)** currently mean `concept`, not `validate` — must verify intent per call site, not blind-convert.
- **`/step/1` everywhere means `challenge`** — but a few (lobby, dashboard fallback) may intend "first workshop step" = `stakeholder-mapping`. Verify each (§24–25).
- **Shared prod DB** for the seed re-run (§27).
- **Don't touch** the phase-badge / build-pack `stepNumber` systems (§3).

## 8. Suggested execution order (atomic commits)
1. Metadata + helpers (§A) — foundation.
2. Route + paywall (§B) — makes slugs resolve.
3. Stepper/header/nav display + navigation (§C, §D) — visible fix.
4. Behavioral slug checks (§F) + paywall UI (§G).
5. Multiplayer/advance/join (§E) + emails/setup/challenge/dashboard links (§E,§I,§J).
6. Deep-link intent fixes (§H).
7. Seed (§K) — deliberate, prod-aware.
8. Tests + comments (§L), then full verification (§6).
</content>
</invoke>
