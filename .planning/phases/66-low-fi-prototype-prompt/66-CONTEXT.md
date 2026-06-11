# Phase 66: Low-Fi Prototype Prompt - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can generate a self-contained, agent-agnostic low-fidelity prototype prompt from their Journey Flow and copy it into any AI coding agent to get a working wireframe-style prototype. Includes: a fidelity switch (low active, hi-fi visibly stubbed "coming later"), a wireframe-enforcing preamble, one-click copy with next-step instructions and a help link, journey-understanding logic refactored into shared functions reusable by the future hi-fi path, and mini-flow scoping in single-feature mode. The hi-fi prompt itself and any v0-specific integration are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Fidelity switch UI
- Lives in a prototype-prompt card on the step-10 validate page, alongside the Journey Flow deliverable (consistent with Phase 65 guidance cards)
- Segmented control (two-option pill): "Low fidelity" active, "High fidelity" present but non-interactive
- Hi-fi option shows a "Coming later" badge with muted/dimmed styling and not-allowed cursor — always visible, zero interaction
- Prompt is generated on demand via an explicit "Generate prompt" button (no auto-generation on card open)

### Prompt content & preamble
- AI-enriched generation: Gemini turns Journey Flow node data into fleshed-out screen descriptions (matches how other deliverables like PRD are generated); needs a loading state
- Prompt includes: screens + navigation derived from Journey Flow, a short persona/problem paragraph, and the validation goal (what the prototype is meant to test)
- No sample/placeholder-data instruction section
- Wireframe preamble uses hard, non-negotiable rules: grayscale only, system font, boxes/outlines, no branding, no polish, placeholder imagery as labeled boxes, only elements needed to test the idea
- Tech target is neutral and self-contained: "build a clickable prototype in your default stack; single self-contained app, no backend" — stays agent-agnostic

### Copy & next-step experience
- Prompt displayed as collapsed preview (~10 lines) with "Show full prompt" expand; copy button always copies full text
- Copy feedback: button morphs to "Copied ✓" briefly AND a Sonner toast confirms (olive-themed, consistent with app)
- Next-step instructions read "Paste into your preferred AI coding agent — v0, Claude, Codex, Replit"
- Help link opens an in-app dialog with the 3-step how-to (copy → open your agent → paste) and links to v0/Claude/Codex/Replit — no separate docs page
- No post-copy tracking; copying is the end of the app's job

### Regeneration & staleness
- Generated prompt persisted to DB so it survives reloads — user can return and copy again without another AI call
- When Journey Flow changes after generation: card shows a stale notice ("Journey Flow has changed since this prompt was generated") with a Regenerate button — no auto-regeneration
- Regenerate overwrites the previous prompt; no version history
- Single-feature mode: small scope label on the card ("Prompt covers your feature mini-flow")

### Claude's Discretion
- Exact stale-detection mechanism (hash, timestamp, version counter)
- Loading state design during generation
- Preview truncation specifics and expand interaction
- Shared journey-understanding function boundaries (flow parsing, screen descriptions, navigation derivation) — structured so hi-fi can be added without rework per PROMPT-04

</decisions>

<specifics>
## Specific Ideas

- Card placement and zone hierarchy should follow the validate-page patterns established in Phase 65 (plan/act/status zones, guidance cards)
- No v0-specific "Create on v0" button or `create-v0-chat` dependency anywhere in the new flow (PROMPT-03)
- Existing v0 prompt code (`src/lib/ai/prompts/journey-v0-prompt.ts`, `src/components/journey-mapper/v0-prompt-panel.tsx`) belongs to the old mapper flow being parked in Phase 67 — the new flow is built from Journey Flow node data, not old mapper state

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 66-low-fi-prototype-prompt*
*Context gathered: 2026-06-11*
