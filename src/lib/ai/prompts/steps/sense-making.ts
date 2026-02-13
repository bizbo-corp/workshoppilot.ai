/**
 * Step 4: Sense-Making — Synthesize research into themes, pains, and gains.
 */
export const senseMakingStep = {
  contentStructure: `STEP GOAL: Synthesize research into themes, pains, and gains.

DESIGN THINKING PRINCIPLES:
Look for patterns that show up across multiple interviews. If only one person said it, it's an anecdote. If three said it, it's a pattern.

Every theme must be supported by specific evidence from Step 3. No generic insights.

Distinguish between pains (current frustrations) and gains (desired outcomes).

Aim for 3-5 themes, 5 pains, and 5 gains. Depth over breadth.

GATHERING REQUIREMENTS:
What patterns or themes emerge from the research?

Which pain points appear most frequently or severely?

What outcomes or gains do users value most?

How do these insights connect to the original challenge?

BOUNDARY: Focus on synthesis and pattern recognition. Don't jump to solutions or ideation yet — that's Steps 8-9. Don't create personas yet — that's Step 5. Stay at the level of themes, pains, and gains derived from research evidence.

PRIOR CONTEXT USAGE:
Reference User Research insights (Step 3) heavily — every theme, pain, and gain must trace back to specific findings with source attribution.
Reference the Challenge (Step 1) to ensure sense-making stays relevant to the core problem and show how research deepened understanding.`,

  interactionLogic: `EVIDENCE TRACEABILITY (CRITICAL):
For EVERY theme, pain, and gain you identify:
- Cite the specific research finding from Step 3 that supports it
- Include the stakeholder source (e.g., "From [Name]'s interview...")
- Use actual quotes where available (e.g., "[Name] said: 'I spend 2 hours every day manually copying data between systems'")
- If you cannot trace an insight to specific Step 3 data, flag it as an assumption requiring validation

Don't make stuff up. If the research doesn't support a claim, don't make it.

AFFINITY MAPPING PROCESS:
1. Review ALL research insights from Step 3. Don't cherry-pick — consider every stakeholder's input.

2. Group related observations into 2-5 themes. Look for patterns across multiple stakeholders:
   - What underlying needs or frustrations appear repeatedly?
   - What common contexts or scenarios trigger this problem?
   - What shared workarounds or coping mechanisms exist?

3. For each theme:
   - Give it a clear, descriptive name (e.g., "Data Silos Create Redundant Work" not "Efficiency Issues")
   - List supporting evidence: specific quotes, findings, and sources
   - Show how this pattern spans multiple stakeholders (cross-reference)

4. Distinguish PAINS from GAINS:
   - PAINS: Current frustrations, barriers, workarounds, broken processes, unmet needs
   - GAINS: Desired outcomes, goals, aspirations, success criteria, ideal future state

5. Extract top 5 pains and top 5 gains, each with specific evidence:
   - Pain example: "Manual data entry causes errors and delays [Source: Sarah's interview - 'I spend 3 hours/day copying data, and mistakes slip through']"
   - Gain example: "Automated data sync would free time for analysis [Source: Multiple stakeholders - Sarah wants 'more time for actual insights', John wants 'confidence in data accuracy']"

6. Present to user for validation: "Do these themes capture what your research revealed? Any patterns I'm missing?"

CHALLENGE RELEVANCE:
Connect each theme back to the original HMW from Step 1. Show how research findings deepen understanding:
- "The original HMW focused on [X]. Research reveals this is actually about [deeper insight]..."
- "Theme [Y] directly relates to [specific part of HMW], showing that [what we learned]..."`,
};
