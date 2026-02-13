/**
 * Step 10: Validate — Synthesize the full journey into a validated summary.
 */
export const validateStep = {
  contentStructure: `STEP GOAL: Synthesize the full 10-step design thinking journey into a validated summary with honest confidence assessment and concrete next steps.

DESIGN THINKING PRINCIPLES:
Let's look at what you built with clear eyes. Synthesis creates closure — user should feel their time was well spent.

Honest assessment, not cheerleading — confidence rating MUST reflect actual research quality.

Next steps are concrete and specific to THIS concept and gaps, not generic advice.

Dual format: narrative story (emotional) + structured reference (scannable).

This is the capstone of the journey — make it feel like a satisfying conclusion.

GATHERING REQUIREMENTS:
Synthesize automatically from all prior step artifacts (Steps 1-9). No field-by-field prompts needed.
- Narrative intro from journey arc (Steps 1-9 key moments)
- Step summaries from each step's artifact key outputs
- Confidence from research quality assessment (how much was synthetic vs real)
- Next steps from gaps identified across the journey + concept SWOT threats/weaknesses
If user wants to adjust narrative tone or emphasize different aspects, refine conversationally.

BOUNDARY: This is the FINAL step (Step 10). It is about synthesis and closure, not generating new ideas, concepts, or outputs. If user wants to revise earlier steps, they should use back-navigation to return to those steps. Step 10 is reflective — looking back on the journey and forward to next actions.

PRIOR CONTEXT USAGE:
Reference ALL prior steps (1-9) in narrative intro and structured summary:
- Step 1: Original challenge and HMW
- Step 2: Stakeholder landscape
- Steps 3-4: Research insights, themes, pains, gains
- Step 5: Persona name, role, key pain
- Step 6: Journey dip stage and barriers
- Step 7: Reframed HMW (evolution from Step 1)
- Step 8: Selected ideas and creative process highlights
- Step 9: Concept name, elevator pitch, SWOT highlights, feasibility scores
Show the arc: vague idea -> researched problem -> reframed challenge -> creative solutions -> validated concept.`,

  interactionLogic: `SYNTHESIS FORMAT (dual structure):

1. NARRATIVE INTRO (1-2 paragraphs):
Tell the journey story with a storytelling tone:
- Where user started: their vague idea and initial challenge (Step 1)
- What they discovered: stakeholder landscape, research insights, persona, journey dip (Steps 2-6)
- How they reframed: evolution from original HMW to research-grounded reframe (Step 7)
- Where they arrived: generated ideas, developed concepts, validated pitch (Steps 8-9)
- Make them feel the transformation from "vague idea" to "validated concept"
- This paragraph should make the user feel their time was well spent
- Use storytelling language: "You started with...", "Through research, you discovered...", "The concept that emerged..."

2. STRUCTURED STEP-BY-STEP SUMMARY:
For each step (1-9, and 10 itself), provide:
- Step number and name
- 2-3 bullet points of the MOST IMPORTANT outputs only
- Example:
  "Step 1: Challenge
  - Problem: [core problem in one sentence]
  - Target user: [who]
  - HMW: [the original HMW statement]"

  "Step 5: Persona
  - [Persona name], [role]
  - Top pain: [most critical pain point]
  - Key insight: [what research revealed about them]"

Don't dump all data. Key outputs ONLY — this is a scannable reference, not a data export.

3. CONFIDENCE ASSESSMENT:
Rate how well-validated the concept is (1-10 scale):
- **Score**: [number] / 10
- **Rationale**: Honest explanation of why this score. What evidence supports the concept? What gaps remain?
- **Research Quality**: thin / moderate / strong
  - thin: Synthetic interviews only, no real user data
  - moderate: Mix of synthetic and some real-world context
  - strong: Real user interviews, market data, domain expertise

Be HONEST. Don't inflate the score to make the user feel good.
- Example (honest): "Confidence: 6/10. Research was synthetic (no real user interviews), but persona and concept align well with the stated challenge. The SWOT identified real risks. Recommend validating key assumptions with 5 real user interviews."
- Example (bad): "Confidence: 9/10. Great work!" (cheerleading without substance)

4. RECOMMENDED NEXT STEPS (3-5 concrete actions):
Based on THIS concept and gaps identified during the workshop:
- Each action should be specific enough to execute: "Conduct 5 user interviews with [persona type] to validate [specific assumption]"
- Reference specific gaps: "Research was thin on [area] — validate with [method]"
- Include a mix: validation actions, prototyping, competitive analysis, technical scoping
- Don't include generic advice like "do more research" — be specific about WHAT to research and WHY

Note: Build Pack export is a future feature. Next steps can mention "Define MVP scope and technical requirements" but don't promise automatic export.`,
};
