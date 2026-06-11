# Phase 13: Ideation & Validation Steps (8-10) - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Steps 8-10 complete the design thinking journey: generating ideas from the reframed HMW (Step 8), developing selected ideas into full concepts (Step 9), and synthesizing the entire 10-step journey into a validated summary (Step 10). Text-based throughout. Billboard Hero exercise included in Step 9. No visual canvas, no Build Pack export — those are future phases.

</domain>

<decisions>
## Implementation Decisions

### Step 8: Ideation — Mind Mapping & Brain Writing

- AI generates 3-4 themed clusters from the HMW statement, each with 3-4 ideas
- Each cluster includes 1-2 wild card ideas (deliberately provocative/unconventional) marked as wild cards
- No theme rationale — just present themes and ideas, keep it fast and creative
- After initial clusters, AI does a prompted round explicitly asking user "What ideas would you add?"
- User picks 5-8 favorite ideas from clusters for brain writing
- Brain writing runs 3 rounds — AI builds on user-selected favorites using "Yes, and..." technique
- Separate Crazy 8s round after brain writing — AI helps rapid-fire 8 quick ideas, no timer UI, just AI pacing with encouraging prompts ("quick, don't overthink")
- Idea selection happens at end of Step 8 (not start of Step 9) — user tells AI which ideas they like in chat
- Hard limit of max 3-4 ideas selected for concept development — AI enforces this
- Each selected idea becomes a separate concept (no combining)
- Step 8 artifact saves ALL generated ideas with selected ones flagged — preserves creative history
- No rejection tags on unselected ideas — just marked selected vs not

### Step 9: Concept Development — Concept Sheet, Billboard Hero, SWOT

- AI recommends 1-3 concepts based on how distinct the selected ideas are
- AI drafts complete concept sheet proactively in one go (name, elevator pitch, USP, SWOT, feasibility) — user reviews and refines
- SWOT analysis: 3 bullets per quadrant (strengths, weaknesses, opportunities, threats)
- Feasibility scores use 1-5 numeric scale (not qualitative)
- Billboard Hero exercise included in Step 9 — tests the concept pitch as a billboard tagline

### Step 10: Validate — Synthesis Summary

- Format: narrative intro paragraph + structured step-by-step summary below (both)
- Structured summary uses key output only: 2-3 bullet points per step of the most important outputs
- Includes confidence assessment with rationale (AI rates how well-validated the concept is based on research quality)
- Includes 3-5 concrete recommended next actions based on concept and gaps identified
- Note that Build Pack export is a future feature — next steps point toward it

### Claude's Discretion
- Final idea list presentation format after brain writing (evolved clusters vs flat ranked list)
- Billboard Hero exercise format within Step 9
- Concept comparison layout when multiple concepts exist
- Narrative intro paragraph length and storytelling style for Step 10

</decisions>

<specifics>
## Specific Ideas

- Wild card ideas should feel genuinely unconventional, not just slight variations — push creative boundaries
- Crazy 8s pacing should feel energetic: "Quick — first thought that comes to mind!" not formal
- Concept sheets should feel polished — like something you'd present to stakeholders
- The confidence assessment should be honest, not cheerleading — if research was thin, say so
- Step 10 should feel like a satisfying conclusion to the journey — user should feel their time was well spent

</specifics>

<deferred>
## Deferred Ideas

- Timer function for Crazy 8s — MMP feature
- Visual mind map canvas — MMP feature
- Build Pack export from Step 10 — future milestone
- Concept comparison side-by-side view — MMP feature
- Dot voting UI for idea selection — MMP feature (text-based selection works for v1.0)

</deferred>

---

*Phase: 13-ideation-validation-steps-8-10*
*Context gathered: 2026-02-09*
