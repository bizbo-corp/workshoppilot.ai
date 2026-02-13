/**
 * Step 7: Reframe — Draft a fresh HMW statement using the 4-part builder.
 */
export const reframeStep = {
  contentStructure: `STEP GOAL: Draft a fresh How Might We statement from scratch using the 4-part builder, grounded in persona pain points and journey dip.

DESIGN THINKING PRINCIPLES:
Time to take everything we've learned and rewrite the question. This is a FRESH REWRITE, not an evolution of Step 1 — draft new HMW from scratch using all accumulated research.

Ground the reframe in the Journey Map dip (Step 6) — that's where the opportunity is.

Make it specific to the Persona (Step 5) — focus on their pain points and desired gains.

Use 4-part HMW template: "Given that [context], how might we help [persona] do/be/feel/achieve [immediate goal] so they can [deeper goal]?"

Multiple HMW statements allowed — user can create variations and select which to carry into ideation.

GATHERING REQUIREMENTS (4-PART BUILDER):
- Original HMW: The original How Might We statement from Step 1 (for reference/comparison)
- Given that: What specific context or barrier from the journey dip? (from Step 6 dip barriers)
- Persona: Which user type or persona characteristic? (from Step 5)
- Immediate goal: What should they accomplish at that moment? (from Step 6 stage goals + Step 5 persona goals)
- Deeper goal: What's the broader emotional or life outcome? (from Step 4 gains + Step 5 persona motivations)
- Insights applied: List the key insights from research (Steps 3-6) that informed this reframe
- Evolution (optional): Explain how and why the HMW evolved from original to reframed

BOUNDARY: This step is about reframing the problem with research clarity, not solving it. Don't suggest solutions, features, or ideas yet — that's Step 8. The HMW opens up the solution space without prescribing a specific approach. If ideation starts, redirect: "Let's finalize the reframed challenge first. In Step 8, we'll generate many ideas to address this HMW."

PRIOR CONTEXT USAGE:
Reference Journey Map dip (Step 6) HEAVILY — "Given that" and immediate goal come from dip stage barriers and goals.
Reference Persona (Step 5) for persona field and to ensure HMW addresses their specific pain points (use persona pains to validate relevance).
Reference Step 4 gains for deeper goal field (what broader outcome do they seek beyond the immediate task).
Compare to Step 1 original HMW to show evolution: "The original HMW was [Step 1]. Research revealed [key insights]. The reframed HMW is now [new HMW], which focuses specifically on [dip pain]."`,

  interactionLogic: `4-PART HMW BUILDER (MAD-LIBS FLOW):
Suggest 2-3 options per field with source context, user selects or modifies:

1. **Given that** [context/situation]
   - Source: Journey dip barriers + persona frustrations
   - Describe the specific situation or context from the dip stage
   - Example options: "Given that users struggle to compare insurance plans due to inconsistent terminology" / "Given that price comparison requires visiting multiple websites with different formats" / "Given that users lack confidence in understanding policy differences"

2. **How might we help** [persona/user type]
   - Source: Persona name or user type from Step 5
   - Be specific about WHO (use persona characteristics, not just name)
   - Example options: "budget-conscious shoppers" / "first-time insurance buyers" / "people comparing healthcare plans"

3. **do/be/feel/achieve** [immediate goal]
   - Source: Journey stage goals + persona goals at the dip
   - What should they accomplish in that moment?
   - Example options: "quickly compare options side-by-side" / "confidently understand their choices" / "make an informed decision without confusion"

4. **So they can** [deeper, broader emotional goal]
   - Source: Persona gains from Step 4 + deeper emotional outcome
   - What's the bigger outcome beyond the immediate task?
   - Example options: "so they can feel confident they're getting the best value" / "so they can protect their family without overpaying" / "so they can make financial decisions with clarity"

BUILDER PROCESS:
1. Present 2-3 options for EACH field in chat, showing source context:
   - "For 'Given that', I see three possible contexts from your journey dip: [option 1 - source], [option 2 - source], [option 3 - source]. Which resonates, or should I suggest others?"

2. User selects option or provides their own for each field

3. Assemble complete HMW statement: "Given that [field 1], how might we help [field 2] [field 3] so they can [field 4]?"

4. Present full statement for review: "Here's the complete reframed HMW: [full statement]. Does this capture the opportunity?"

5. User can refine any field or accept

6. Option to create MULTIPLE HMW STATEMENTS: "Would you like to create alternative HMW statements focusing on different aspects of the dip, or is this one sufficient?"

MULTIPLE HMW STATEMENTS:
User can create 1+ HMW statements (not limited to one). Each statement uses the 4-part builder.

After creating multiple, ask: "Which HMW statement(s) should we carry into Step 8 ideation? You can select one or ideate on multiple."

Capture selectedForIdeation indices in artifact.

VALIDATION (EXPLICIT TRACEABILITY + QUALITY CHECK):
Before finalizing each HMW, validate:

**Traceability:**
- "Given that" traces to specific barriers from journey dip (Step 6)
- "Persona" matches persona from Step 5
- "Immediate goal" traces to journey stage goals or persona goals
- "Deeper goal" traces to persona gains (Step 4)

Show user the traceability: "This HMW is grounded in [dip stage name] where [persona name] experiences [specific barrier], with the goal of [gain from Step 4]."

**Quality checks:**
- Is it more focused than Step 1 original HMW? (Should be narrower, more specific)
- Does it focus on the persona's pain point, not a solution? (HMW, not "build an app")
- Is the immediate goal achievable and specific? (Not vague like "be happier")
- Is the deeper goal meaningful and emotional? (Not just task completion)

Present both traceability and quality assessment to user before finalizing.`,
};
