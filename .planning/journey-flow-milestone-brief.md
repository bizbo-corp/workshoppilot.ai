# Milestone Brief: Journey Flow + Low-Fidelity Prototype Pipeline

> Prompt for `/gsd:new-milestone`. Rewrite of `notepad.md` raw notes, grounded in the existing codebase.

## The problem

The existing UX Journey Mapper (`src/components/journey-mapper/ux-journey-mapper.tsx` and friends, reached from Step 10 at `/workshop/[sessionId]/outputs/journey-map/`) is too complex. It carries stage swimlanes, a dual sitemap view with navigation groups, an emotion-curve overlay, pinned views, and peripheral/core screen categorization. Users only need a simple picture of the flow they're about to test, and a path from that picture to a low-fidelity prototype.

## The vision

Replace it with **Journey Flow**: a simpler node-based editor where each node is a **data-only card** representing a screen/section (name, UI type, key elements, purpose, pain addressed) — no visual wireframing, no swimlanes, no alternate views. The AI auto-generates a baseline flow from workshop outputs, the user adjusts it, and the flow then drives a **low-fidelity (wireframe-style) prototype prompt** — a plain text prompt the user pastes into their preferred AI coding agent (v0, Claude, Codex, Replit, etc.). Validation-plan guidance routes digital solutions into this pipeline and routes non-digital solutions to appropriate alternatives instead.

## Decisions already made (do not relitigate)

1. **Park, don't delete.** The old UX Journey Mapper stays in the codebase and reachable until Journey Flow is proven. Journey Flow lives at a new route (e.g. `/workshop/[sessionId]/outputs/journey-flow/`). Deletion of the old mapper is a later cleanup, not part of this milestone.
2. **What survives from the old mapper:** only (a) nodes connected by drag-to-connect edges, (b) the (+) plus icon to add an adjacent screen/section, and (c) the AI baseline-generation pipeline (adapt `heuristic-mapper.ts` / `intent-detection.ts`). Everything else — swimlanes, sitemap view, nav groups, emotion curve, pinned views — is cut.
3. **Nodes are data-only.** A node is structured metadata about a screen, not a drawing. That metadata is what feeds the prototype prompt.
4. **Test scope is an explicit user choice, asked up front.** When the user enters Journey Flow they choose: test the **end-to-end journey** or test a **single feature/concept** from the workshop. No AI inference of this choice.
   - Journey mode → AI generates the full baseline flow.
   - Single-feature mode → AI generates a **mini-flow** of just that feature's screens (entry → action → result); same editor, smaller graph.
5. **Flow archetypes are AI-determined.** Based on the workshop outputs, the AI picks the baseline shape:
   - Linear sequence — long step-by-step processes (experience design, onboarding-like apps).
   - Hub-and-spoke — dashboard + detail screens.
   - Single-page sections / simple site structure — brochure-style outputs.
   - Funnel / landing-page test — deliberately short conversion flow (landing → sign-up → confirmation) for desirability/fake-door tests; the prototype prompt emphasizes a strong CTA and a thank-you screen.
   - Branching flow — mostly linear with one or more decision forks (eligibility check, triage, approve/reject, choose-your-path onboarding). The editor's free-form edges already support forks; the archetype permits the AI to generate them.
   - Single-screen tool — input → result utility with no real journey (calculator, generator, checker). Natural fit for single-feature test mode; maps to the existing `tool` prompt template.
   - Loop / engagement cycle — log → feedback → return flows (habit, fitness, learning) where the journey cycles back to its start and the validation question is "would they come back."
   The user can rearrange afterwards; the archetype only shapes the generated baseline. Note: these archetypes overlap with the existing `strategicIntent` enum (marketing-site / admin-portal / dashboard / tool / web-app) — the plan must reconcile the two into a single concept rather than maintain both.
6. **Low fidelity = wireframe visual style.** The generated prompt must instruct the coding agent to render the prototype grayscale, boxy, unbranded, deliberately sketch-like, with only the elements necessary to test the idea — so testers react to the flow, not aesthetics.
7. **The prototype handoff is agent-agnostic.** The output is a simple text prompt the user copies and pastes into any AI coding agent (v0, Claude, Codex, Replit, Lovable, etc.) — no tool-specific API integration in the primary flow. WorkshopPilot's job ends at producing the prompt plus clear next-step instructions.
8. **High fidelity is scaffold-only in this milestone.** Build the low/high fidelity switch and keep journey-understanding functions shared and reusable, but the hi-fi pathway (richer prompt, hand-off to an AI coding agent) is a stub specified in a future milestone.

## What already exists — reuse, don't rebuild

- **Output-type classification:** `classifyOutputType()` in `src/lib/validation/classify-output-type.ts` already classifies the solution into 8 types (`app_digital`, `experience_design`, `physical_product`, `service`, `process_change`, `offering`, `brand_comms`, `campaign`) once at Validate-step entry, stored in `validateArtifact.classification`. This is the "system smarts" — wire it in; don't create a parallel classifier. Audit its robustness as part of this milestone (confidence handling, combined types).
- **Per-type validation guidance:** static guidance in `src/lib/validation/output-type-guidance.ts` rendered by `ValidationGuidanceCard.tsx`, already including non-digital alternatives (e.g. campaign → creative concept test) plus an AI-tailored example line. The new work is linking digital guidance into Journey Flow / prototype actions and strengthening non-digital guidance with "how to do this outside WorkshopPilot" explanations.
- **AI baseline generation:** `src/lib/journey-mapper/heuristic-mapper.ts` + `intent-detection.ts` already generate strategic intent, feature nodes, edges, and groups from Step 5–10 artifacts. Adapt/simplify for Journey Flow's leaner node model.
- **Prompt builder (currently v0-targeted):** `buildJourneyAwareV0Prompt()` in `src/lib/ai/prompts/journey-v0-prompt.ts` (5 templates by strategic intent) + `v0-prompt-panel.tsx` + `POST /api/build-pack/create-v0-chat`. The template/dispatch logic is reusable, but this milestone replaces the v0-specific handoff with an agent-agnostic prompt. There is no separate system-prompt channel — the generated markdown prompt *is* the full instruction, so "low-fi system prompt" means a low-fi preamble baked into it.
- **Persistence:** journey map state currently lives in a Zustand store and saves to `build_packs.content` with debounced autosave. Journey Flow should follow the same pattern with a simpler state shape.

## Requirements

### A. Journey Flow editor (new, replaces UX Journey Mapper)

- New route `/workshop/[sessionId]/outputs/journey-flow/` alongside the parked old one.
- React Flow canvas with a single node type: a screen/section card showing name + UI type + short description. Node data model (suggested): `{ id, name, uiType, purpose, keyElements: string[], addressesPain?, priority }`.
- Drag-to-connect edges between nodes; (+) icon on a node to add an adjacent screen (reuse/port the existing toolbar + adjacency-placement logic).
- Entry experience: explicit choice — "Test the whole journey" vs "Test a single feature" (with concept picker for feature mode).
- AI generates the baseline flow per the chosen scope and archetype; user edits from there. Regenerate option.
- Simple Zustand store + debounced autosave to `build_packs.content` (same pattern as today, leaner shape). Mark approved/complete state — downstream actions depend on it.

### B. Validation-plan wiring (classification → routing)

- For digital types (`app_digital`, `experience_design`, and other digital-leaning outputs), the "Recommended validation approach" card reads (matching existing structure):
  - **Approach:** A UX journey map and/or an interactive (clickable) prototype.
  - **In the workshop:** "Sketch the journey map for the core flow" → links to Journey Flow. "Build a low-fidelity prototype of that flow to react to" → links to the low-fi prototype builder, **disabled until the Journey Flow is marked complete**.
  - **After the workshop:** higher-fidelity clickable prototype (e.g. Figma-fidelity); usability tests against the mapped journey.
- For non-digital types (campaign, offering, process change, brand & comms, service, physical product): Journey Flow / prototype actions are **not offered**. Show the type-appropriate alternative (largely existing guidance) and extend each with a short explanation of how to achieve it outside WorkshopPilot.
- Handle classification edge cases: low confidence, combined types (`outputTypes` array), and reclassification if the user disagrees with the detected type.

### C. Prototype prompt builder (modify existing)

- Add a **fidelity switch**: low fidelity (this milestone) / high fidelity (visible but disabled or clearly "coming later" stub).
- Low-fi prompt: consumes Journey Flow node data (not the old mapper state); includes a mandatory low-fi preamble enforcing wireframe style — grayscale, boxy, no branding, placeholder-quality polish, only elements needed to test the idea.
- **Agent-agnostic handoff:** the prompt must be self-contained plain text that works in any AI coding agent — no v0 API assumptions, no tool-specific syntax. UI shows the generated prompt with a prominent copy button and next-step instructions: "Paste this into your preferred AI coding agent (e.g. v0, Claude, Codex, Replit)" with a help link to a short guide explaining how to do that and what to expect.
- Remove the v0-specific "Create on v0" one-click action and `create-v0-chat` dependency from the new flow (the old API can remain parked with the old mapper; no need to delete it this milestone).
- Refactor journey-understanding logic (flow parsing, screen descriptions, navigation derivation) into shared functions usable by both fidelity levels, so the hi-fi path can be added without rework.
- Single-feature mode produces a prompt scoped to the mini-flow only.

### D. Parking the old mapper

- Old route remains functional but de-linked from primary navigation/guidance (guidance points to Journey Flow). Add a notice/banner on the old mapper that it's being replaced. No data migration required in this milestone.

## Out of scope

- Visual wireframe drawing/sketching of any kind.
- Two-sided / dual-journey archetype (marketplaces, provider + consumer platforms). When the AI detects a two-sided idea, it must not half-build both sides — fall back to mapping the riskier side's journey only, and say so in the generated baseline. Full dual-journey support is a future milestone.
- The high-fidelity prototype pathway beyond the switch + shared-function scaffold.
- Deleting the old UX Journey Mapper code.
- Changes to Steps 0–9.

## Suggested phase breakdown

1. **Journey Flow editor core** — route, data model, store/persistence, nodes + edges + (+) interaction.
2. **AI baseline generation** — test-scope choice UI, archetype detection, baseline flow generation (journey + mini-flow modes), regenerate.
3. **Validation guidance wiring** — digital routing with links + gating, non-digital alternatives with off-platform explanations, classification edge cases.
4. **Low-fi prototype prompt** — fidelity switch, low-fi template/preamble, shared journey-understanding refactor, hi-fi stub, agent-agnostic copy/paste handoff with help guide.
5. **Park old mapper + polish** — de-link, banner, end-to-end UAT of digital and non-digital paths.

## Success criteria

- A digital-output workshop can go: Validate step → guidance card → Journey Flow (AI baseline appears, user edits) → mark complete → low-fi prototype prompt → copy, paste into any coding agent (v0, Claude, Codex, Replit), get a working wireframe-style prototype.
- A campaign/brand/process workshop sees appropriate alternatives and no Journey Flow or prototype links.
- Single-feature mode produces a mini-flow and a prototype prompt covering only that feature.
- The old journey mapper still loads at its route, untouched.
