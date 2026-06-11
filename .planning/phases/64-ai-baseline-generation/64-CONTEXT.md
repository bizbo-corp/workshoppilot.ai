# Phase 64: AI Baseline Generation - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning
**Source:** PRD Express Path (`.planning/milestones/v2.1-BRIEF.md`)

<domain>
## Phase Boundary

Add AI baseline generation to the Journey Flow editor shipped in Phase 63: an explicit test-scope choice on first entry (whole journey vs single feature with concept picker), AI-determined flow archetypes that shape the generated baseline, generation of full-journey or mini-flow graphs into the Phase 63 store, a regenerate option, and a riskier-side-only fallback for two-sided ideas.

In scope: GEN-01 through GEN-05. Out of scope for this phase: validation guidance card wiring (Phase 65), prototype prompt (Phase 66), old-mapper parking (Phase 67).

</domain>

<decisions>
## Implementation Decisions

### Test scope choice (locked by brief)
- Asked up front, explicitly, when the user enters Journey Flow: test the **end-to-end journey** or test a **single feature/concept** from the workshop. **No AI inference of this choice.**
- Journey mode → AI generates the full baseline flow.
- Single-feature mode → concept picker (concepts from the workshop), then AI generates a **mini-flow** of just that feature's screens (entry → action → result); same editor, smaller graph.

### Flow archetypes (locked by brief)
AI picks the baseline shape from workshop outputs:
- **Linear sequence** — long step-by-step processes (experience design, onboarding-like apps)
- **Hub-and-spoke** — dashboard + detail screens
- **Single-page sections / simple site structure** — brochure-style outputs
- **Funnel / landing-page test** — deliberately short conversion flow (landing → sign-up → confirmation) for desirability/fake-door tests; downstream prompt emphasizes strong CTA + thank-you screen
- **Branching flow** — mostly linear with decision forks (eligibility, triage, approve/reject, choose-your-path); editor's free-form edges already support forks
- **Single-screen tool** — input → result utility (calculator, generator, checker); natural fit for single-feature mode; maps to the existing `tool` prompt template
- **Loop / engagement cycle** — log → feedback → return flows where the journey cycles back to its start

The user can rearrange afterwards; the archetype only shapes the generated baseline.

**MUST reconcile archetypes with the existing `strategicIntent` enum** (marketing-site / admin-portal / dashboard / tool / web-app) into a single concept — do not maintain two parallel taxonomies. The reconciled concept must still serve the Phase 66 prompt templates keyed by intent.

### Generation pipeline (locked by brief)
- Adapt/simplify the existing AI baseline pipeline: `src/lib/journey-mapper/heuristic-mapper.ts` + `intent-detection.ts` (generates intent, feature nodes, edges, groups from Step 5–10 artifacts) — target the leaner Phase 63 `JourneyFlowNode` model. Reuse, don't rebuild.
- Regenerate option replaces current nodes/edges with a fresh baseline.
- Two-sided idea detected → generate ONLY the riskier side's journey and say so in the generated baseline (e.g., a note visible on the canvas). Never half-build both sides.

### Claude's Discretion
- Whether generation is heuristic-only (like the old mapper), LLM-backed (Gemini structured output via existing Zod patterns), or hybrid — pick what best satisfies "AI determines archetype" within the existing stack
- Scope-chooser UI shape (modal vs full-screen entry state replacing Phase 63's empty state)
- Where the archetype/scope metadata is stored in the Journey Flow state shape (extend the store/persisted shape as needed; keep autosave intact)
- Regenerate confirmation UX (warn before clobbering user edits)
- How the two-sided note appears on canvas (annotation node vs toolbar notice)

</decisions>

<specifics>
## Specific Ideas

- The Phase 63 empty state ("Add your first screen") becomes secondary once the scope chooser exists — manual-add should remain possible (e.g., "start from scratch" escape hatch), but the primary first-entry experience is the explicit scope choice.
- Concepts for the single-feature picker come from workshop artifacts (Step 9 concept cards / selected ideas).
- Workshop artifacts for generation context: Steps 5–10 (persona, journey map, HMW, ideation winners, concepts, validate classification) — the old heuristic-mapper already knows how to read these.
- Follow existing structured-AI-output conventions: Zod schemas in `src/lib/schemas/` / `src/lib/ai/prompts/`, Gemini via Vercel AI SDK.

</specifics>

<deferred>
## Deferred Ideas

- Validation guidance card linking into Journey Flow — Phase 65
- Prototype prompt consuming archetype/flow data — Phase 66 (but keep archetype data accessible for it)
- Full dual-journey support for two-sided products — future milestone
- Hi-fi pathway — future milestone

</deferred>

---

*Phase: 64-ai-baseline-generation*
*Context gathered: 2026-06-11 via PRD Express Path*
