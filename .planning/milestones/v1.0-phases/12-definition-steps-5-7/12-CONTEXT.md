# Phase 12: Definition Steps (5-7) - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Enrich prompts, validation criteria, and output rendering for Steps 5-7 (Persona Development, Journey Mapping, Reframing Challenge). These steps synthesize Discovery outputs (Steps 1-4) into focused design artifacts. Same pattern as Phase 11: enriched prompts + validation criteria + schema-prompt alignment verification. No canvas/visual tools — text-based with structured output panels.

</domain>

<decisions>
## Implementation Decisions

### Persona Development (Step 5)

- **Format:** Structured card layout with placeholder avatar (initials circle), not narrative prose
- **Fields:** Name, role, bio, quote, pains, gains, motivations, goals + optional fields: frustrations, day-in-the-life scenario (auto-populated from conversation when data exists, skippable)
- **Persona count:** 1-3 personas, AI and user determine together when coverage feels sufficient — not fixed
- **Traceability:** Research-grounded but flexible — pains/gains should trace to Step 4 themes, but AI can infer reasonable demographic/lifestyle attributes not explicitly researched
- **AI initiative:** AI drafts everything proactively (name, age, role, demographics) based on research — user adjusts what doesn't fit
- **Review flow:** AI auto-suggests persona in chat based on prior steps, asks refinement questions, modifies in conversation. Once extracted, user can override/modify text directly on the right panel
- **Multi-persona flow:** Present one at a time, but indicate total count with skeleton placeholder cards (e.g., "1 of 3" with skeleton cards for upcoming personas)

### Journey Mapping (Step 6)

- **Stage creation:** Collaborative — AI suggests 4-8 stages based on persona/context, user can add/remove/reorder, then AI fills layers
- **Layers per stage:** Step (action), Goals, Barriers, Touchpoints, Emotions (traffic light: red=pain, orange=neutral, green=good), Moments of Truth, Opportunities — 7 layers total
- **The dip:** AI identifies the lowest emotion point with rationale, user confirms or picks different stage. Traffic light colors make the dip visually obvious (red stages)
- **Persona scope:** One journey map for primary persona only — multi-persona journeys deferred to FFP
- **Display:** Scrollable grid/table on right panel with card/post-it style cells containing editable text
- **Editing:** Cell-level editing — click any cell to edit that specific entry
- **Structure editing:** Users can add or remove journey stages after initial generation — full structural flexibility
- **Context referencing:** Generic references ("the user experiences..."), not persona name ("Sarah's journey...")

### Reframing Challenge (Step 7)

- **Relationship to Step 1:** Fresh rewrite — not an evolution of the original HMW. AI drafts new HMW from scratch using all accumulated research, persona, and journey insights
- **HMW template (4-part builder):**
  - **Given that** [context/situation]
  - **How might we help** [persona]
  - **do/be/feel/achieve** [immediate goal]
  - **So they can** [deeper, broader emotional goal]
- **Builder flow:** AI suggests 2-3 options per field in chat — user can auto-fill the AI suggestion into a mad-libs style form on the right panel with dropdown options per field, then modify any field
- **Multiple HMWs:** User can create multiple reframed HMW statements (not limited to one)
- **Carry forward:** If multiple HMWs exist, ask user which one(s) to carry into Step 8 ideation — user decides whether to ideate on one or multiple
- **Validation:** Both explicit traceability (AI shows which persona pain and journey dip stage each HMW component traces to) AND quality check questions before finalizing
- **HMW focus:** Should focus on person's pain points and how we might solve this as part of the original challenge

### Prior Context Usage

- **Reference style:** Light referencing — AI weaves research insights naturally without explicit citations or academic-style sourcing
- **Source indicators:** No source badges or "from Step X" tags on output panel — clean artifact display, traceability lives in the AI conversation
- **Revision awareness:** Explicit acknowledgment when prior steps change — AI says "I see your research themes changed, let me update..." — transparent about cascade updates

### Claude's Discretion

- Exact placeholder avatar design (initials circle implementation)
- Typography and spacing within persona card and journey grid
- How to handle edge cases (no research data, incomplete prior steps)
- Traffic light color implementation details
- Skeleton card visual design for upcoming personas

</decisions>

<specifics>
## Specific Ideas

- HMW template uses a specific 4-field mad-libs format: "Given that [context], how might we help [persona] do/be/feel/achieve [goal] so they can [deeper goal]"
- Journey map emotions use traffic light system (red/orange/green) instead of emoji curves — easier to format and make responsive
- Multi-persona flow shows skeleton cards for upcoming personas while working on current one ("1 of 3")
- Persona optional fields (frustrations, day-in-the-life) are auto-populated when conversation data exists but skippable
- HMW builder: AI suggests in chat → user clicks auto-fill → mad-libs form on right panel with dropdown options → user modifies any field

</specifics>

<deferred>
## Deferred Ideas

- Multi-persona journey maps (one journey per persona) — FFP release
- Alternative/extended journey paths — FFP release
- Canvas-based visual journey mapping — MMP release

</deferred>

---

*Phase: 12-definition-steps-5-7*
*Context gathered: 2026-02-09*
