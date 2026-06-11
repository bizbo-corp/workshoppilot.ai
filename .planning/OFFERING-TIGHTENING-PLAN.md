# Offering-Tightening Plan — Validation as the Core

*Build brief. Updated 2026-06-12. Grounded in a read of the validation engine, output generators, and workshop flow. Written to hand to Claude Code — strategy first, then file-level work items with acceptance criteria.*

## The one-line shift

Stop selling **artifacts** ("Developer-Ready Build Pack") and start selling **a verdict you can trust** ("find out if your idea is worth building, and walk out with the test already built"). The **Validation Score** becomes the hero; the documents become a digital-only bonus tier, not the headline.

This is a *repositioning + a few focused builds*, not a teardown. Most of what's needed already exists.

---

## 1. What already exists (do NOT rebuild)

The "Assumption Blaster" is ~70% built — buried at Step 10 and positioned as a footnote. Shipped and production-grade:

- **Riskiest-assumption proposer** — `src/lib/validation/propose-assumption.ts` (falsifiable assumption + 2–3 alternatives, broad/specific scope, cites source steps).
- **Signal designer** — `src/lib/validation/suggest-signal.ts` (metric, target, kill threshold, and the **assumption-test strength rating** `proxyStrength`: `weak | medium | strong`, rendered as the dot-strength indicator in `DefineSignalCard.tsx`). **This strength rating is existing, load-bearing functionality — preserve it.**
- **Score + verdict** — `src/lib/validation/score.ts` (`computeScore()` → 0–100 + verdict; `nextStepNudge()`).
- **Meter UI** — `src/components/workshop/validate/ScoreRing.tsx`.
- **8-type idea classifier** — `src/lib/validation/classify-output-type.ts` (app_digital, physical_product, service, process_change, offering, experience_design, brand_comms, campaign; confidence + rationale; user override).
- **Type-aware guidance** — `getValidationGuidance()` + `isDigitalOutputType()` already split in-workshop vs. off-platform tests by type.
- **Build Pack sync** — `src/lib/validation/plan-markdown.ts`, `sync-build-pack.ts`.

The horizontal, type-aware validation product is mostly built. The work is *exposing it, hardening the honesty, and pointing the marketing at it.*

---

## 2. Cut-list — storefront vs. pipeline

**"Cut" means remove from the storefront, not rip out of the pipeline.** Several artifacts feed each other; deleting engines is expensive and risky, hiding cards is cheap and safe.

| Deliverable | Decision | How | Risk |
|---|---|---|---|
| **Validation Plan + Score** | Promote to hero | Primary outcome for ALL idea types | build |
| PRD | Keep — digital tier | Built. Gate behind digital type | none |
| Tech Specs | Keep — digital tier | Built | none |
| Prototype prompt | Keep — digital tier | Built (Journey Flow → low-fi prompt) | none |
| Journey Map / Flow | Keep — internal + digital | Feeds Feature Prioritization + prototype | none |
| **Feature Roadmap** | Cut from storefront, keep engine | Hide the output card. It still feeds PRD + Tech Specs + Prototype internally — do NOT delete the generator | low |
| **Stakeholder Deck (.pptx)** | Cut | Standalone, low coupling — hide or delete | low |
| **User Stories** | Cut (not real) | Never generated as an artifact — exists only in marketing copy. Remove from copy | trivial |

Feature Prioritization is the hub: PRD, Tech Specs, and the prototype all derive from it. Removing it = 4–6h refactor + regression risk across the three *kept* deliverables. Hiding its card = same storefront result, zero risk. The whole cut-list is a **marketing + UI edit**.

---

## 3. The single meter — two states

One meter only: the **Validation Score**, post-test. No second "readiness" gauge (it would read as a participation trophy — the opposite of the honesty we're selling). Instead the same `ScoreRing` has two states:

1. **Armed (in-session)** — the gauge renders empty but with the committed bar drawn on it: "hit 40 signups → validated; ≤10 → killed." It visualises the target + kill threshold the user just set. Honest; makes the empty gauge feel *loaded*, not unfinished.
2. **Scored (post-test)** — user runs the test off-platform, logs the result, gauge fills. `computeScore()` already handles this.

This makes the empty meter a hook — "your score is waiting, go get it" — which is the stickiness. The in-session deliverable (assumption + designed test + built asset + honest read) must fully stand on its own, because the score is the *sequel*, not the product.

---

## 4. In-session honesty — qualitative, no number

The differentiator and the one genuinely new behaviour. Today the flow *designs a test* but never *judges the idea's strength in-session*. We add that as **qualitative facilitator honesty**, not a second gauge.

- The facilitator calls out thin spots directly — weak evidence, hand-wavy demand, an audience that's "everyone."
- **Anti-sycophancy is structural, not tonal:** the read may only credit *evidence the user actually gave during the workshop*, never assertion. "You believe there's demand" is thin; "three people asked and one pre-paid" is real. Anchor every call-out to a cited workshop step (the proposer already returns `sources` — reuse that pattern).
- **Always end constructive:** a hard read comes with the cheapest next experiment that would prove or kill it — so a low read feels like "you just saved me months," not "computer says no." Defuses refund risk.
- `soul.md` already bans validation padding ("That's a great point!"). Extend that ethos from *tone* into a *judgment the user can't argue around* — but keep it in the dialog, not in a number.

---

## 5. Follow-up reminder — the come-back HVCO

The Validation Score only appears after an off-platform test, so the return nudge is what realises the stickiness. Treat the **report/score as the high-value offer** in a follow-up.

- A few days post-session, send a follow-up email: *"Ready to log your results and unlock your Validation Score? Download your report →"*
- Links straight back to the Validate step (armed gauge) to record the result and download the finished plan/report.
- Resend is already in the stack (per CLAUDE.md). Open item for build: locate/confirm the trigger mechanism (cron, scheduled job, or post-completion delayed send) and the email template surface.

---

## 6. Horizontal — surface idea-type early

Idea type is only detected at Step 10 today, so Steps 1–9 are generic and someone can be steered toward an app when they meant a service. For a horizontal product this is the core gap.

- Add an idea-type signal at **Step 1 (Challenge)** — AI guess + confirm/edit — then thread it forward.
- **Reuse, don't fork:** `classifyOutputType()` is the audited single classification entry point (Phase 65). Feed the early signal into it; do not add a parallel classifier.
- Digital lean is fine: default examples and bonus artifacts stay digital-first; non-digital types still get the full validation core with off-platform tests (`getValidationGuidance()` already handles this).

---

## 7. Type-aware lenses — where to inject

Thin parameterisation, not a rewrite. Inject a per-type lens only where domain changes the question:

- **Step 1 (Challenge)** — capture/confirm idea type.
- **`propose-assumption.ts`** — examples lean digital ("Speakers will want an app…"); add per-type phrasing + per-type "what weak evidence looks like."
- **`suggest-signal.ts`** — the cheap-test menu differs by type (fake-door vs. pre-order vs. one-team pilot vs. concierge).
- **In-session honesty read (§4)** — per-type evidence bar.

Type-awareness and anti-sycophancy are the same instruction written per type — one job, not two. Everything else in the 10 steps stays as-is.

---

## 8. Build sequence (handoff to Claude Code)

Cheapest, highest-leverage first. Each item is independently shippable. **Read `.planning/codebase/DEFENSIVE_PATTERNS.md` before touching the chat/greeting flow.** Confirm which worktree's dev server is running before editing (HMR caveat in CLAUDE.md).

### WI-1 — Storefront cut *(½ day, no pipeline changes)*
- **Goal:** remove Feature Roadmap, Stakeholder Deck, User Stories from the user-facing offering without touching generators they feed.
- **Files:** outputs page (`src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx`); marketing/landing + pricing copy; any "User Stories" string.
- **Approach:** hide the Feature Prioritization and Stakeholder Deck deliverable cards (feature-flag or remove from the cards array). Leave `generate-feature-prioritization`, `generate-presentation`, and the Feature Prioritization store/route intact. Delete "User Stories" from copy only.
- **Acceptance:** PRD, Tech Specs, and Prototype prompt still generate correctly (they depend on Feature Prioritization internally). No Feature Roadmap / Stakeholder Deck / User Stories visible anywhere user-facing. `npx tsc --noEmit` + `npm run lint` clean.

### WI-2 — Reposition marketing *(½–1 day, no engineering)*
- **Goal:** Validation Score as hero; Build Pack demoted to digital-tier bonus; horizontal, honest promise.
- **Files:** landing page sections, hero, pricing copy.
- **Approach:** new headline (pick from candidates below), validation-led hero, Build Pack framed as "for digital ideas you also get…". Remove "Developer-Ready" from the masthead; keep it in the digital tier.
- **Headline candidates:** *"From vague idea to a ready-to-run validation plan in 2 hours — and the honest truth about whether it's worth building."* / *"In 2 hours: your riskiest assumption, the test that proves or kills it, and the test already built."* / *"Stop guessing. Find out if your idea holds up — before you spend a year finding out the hard way."*
- **Acceptance:** no "Developer-Ready" in the masthead; validation is the primary value prop above the fold; non-digital idea types are not excluded by the copy.

### WI-3 — Armed-state gauge *(1–2 days)*
- **Goal:** `ScoreRing` shows the committed target + kill threshold before any result exists.
- **Files:** `src/components/workshop/validate/ScoreRing.tsx`, its parent in `ValidatePanel.tsx`; read-only from the saved `Signal`.
- **Approach:** add an "armed" render path — empty fill, target/kill markers drawn from `Signal.target` / `Signal.killThreshold`, plain-language caption ("hit X → validated, ≤Y → killed"). No scoring math; purely the pre-result view of the existing gauge.
- **Acceptance:** after a user commits a signal but before logging a result, the gauge shows the bars and the caption. After a result is logged, it fills via existing `computeScore()` path unchanged.

### WI-4 — In-session honesty read *(2–3 days, the differentiator)*
- **Goal:** an evidence-anchored qualitative read that can call the idea weak, in the facilitator voice. No number.
- **Files:** new prompt/module alongside `src/lib/validation/`; surfaced in `ValidatePanel.tsx`; extend `soul.md` guidance. Reuse the `sources`-citation pattern from `propose-assumption.ts`.
- **Approach:** generate a short, direct read keyed to a few universal dimensions (problem, audience, edge, evidence, cost-to-test). A dimension may only score well on evidence cited from actual workshop steps. Each weak call-out pairs with the cheapest next test. Per-type evidence bar (ties to WI-6).
- **Acceptance:** for a thin workshop the read is visibly critical and cites which step the weakness comes from; for a well-evidenced workshop it's affirming but specific. Never credits unsupported assertion. Always ends with a concrete next experiment.

### WI-5 — Follow-up reminder HVCO *(1 day)*
- **Goal:** post-session email pulling users back to log results / download report.
- **Files:** Resend integration; locate trigger surface (cron / scheduled / delayed send) — flagged open item.
- **Approach:** N days after completion (and only if no result logged yet), send "log your results, unlock your Validation Score, download your report" linking to the armed Validate step.
- **Acceptance:** email fires once per eligible workshop, suppressed once a result is logged, deep-links to the correct workshop's Validate step.

### WI-6 — Idea-type early + per-type lenses *(2–3 days)*
- **Goal:** capture idea type at Step 1 and thread it through; remove digital-only phrasing from the proposer + signal designer.
- **Files:** `src/lib/ai/prompts/steps/01_challenge.ts`; `classify-output-type.ts` (feed early signal in — do NOT add a parallel classifier); `propose-assumption.ts`; `suggest-signal.ts`.
- **Approach:** AI-guess-then-confirm idea type at Challenge; per-type phrasing and per-type cheap-test menus; per-type "weak evidence" definitions shared with WI-4. Changes to `suggest-signal.ts` are **additive only**.
- **PRESERVE — do not remove:** the `proxyStrength` (`weak | medium | strong`) field on each signal candidate in `suggest-signal.ts` and its dot-strength rendering in `DefineSignalCard.tsx`. The per-type test menus extend this flow; they must not replace or drop the strength rating, its schema field, or its UI.
- **Acceptance:** a service/process/physical idea runs end-to-end without app-centric language; the assumption and signal read naturally for that type; classification stays single-source; **`proxyStrength` is still returned for every candidate and still renders as before.**

---

## 9. Open decisions — RESOLVED 2026-06-12

1. **WI-5 trigger:** pick per existing infra at build time (no cron infra in repo; Vercel cron is the default candidate).
2. **§4 read bite:** ✅ **Full honesty.** The read may say "this isn't worth building yet" — always paired with the cheapest next experiment.
3. **Idea-type at Step 1:** ✅ **Hybrid.** User writes their challenge first; AI guesses the type and pre-selects it in a visible type chooser (the 8 types); user can correct it.
4. **Feature Prioritization:** ✅ Hidden-but-wired (per recommendation).
5. **Pricing:** ✅ **One price for everyone.** Validation verdict is the product; the digital Build Pack is a bonus, not a tier.

Execution: direct WI-by-WI on wt1 (port 3001), one commit per work item, reviewed against acceptance criteria between items.

---

## Sequencing summary

WI-1 + WI-2 ship this week, no code risk, and test the repositioning immediately. WI-3 → WI-6 are the product work, ordered so the differentiator (WI-4) lands early. WI-4 and WI-6 share the per-type evidence-bar work — build them adjacent.

## Build status — ALL SIX SHIPPED on `wt1` (2026-06-12)

| WI | Commit | Notes |
|---|---|---|
| WI-1 storefront cut | `ecdd41d` | Cards hidden, generators wired; PRD page got a contextual Feature Prioritization link |
| WI-2 reposition | `67cf22e` | Headline candidate 1; archived landings (v0/v2/v3) deleted; scrollytelling MockBuildPack visuals deferred per Michael |
| WI-3 armed gauge | `57e36ea` | ArmedScoreRing + armedCaption; surfaces in RecordResultsCard + read-only view |
| WI-4 honesty read | `6f9e14a` | Full-honesty per decision; evidence-bars shared with WI-6; persisted on plan |
| WI-5 reminder email | `6a3f2df` | Vercel cron daily 09:00 UTC; **ship step: set CRON_SECRET in Vercel env** |
| WI-6 type early + lenses | `7d0ed16` | IdeaTypeChooser at Step 1 seeds the single classification record; per-type lenses additive; proxyStrength preserved |

Remaining (deliberately deferred): scrollytelling `MockBuildPack` payoff visuals still show deck/roadmap panels — rework after everything else (Michael's call). UAT all six on wt1.test.localhost:3001, then merge wt1 → main.
