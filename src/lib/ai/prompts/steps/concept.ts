/**
 * Step 9: Concept — Develop selected ideas into polished concept sheets.
 */
export const conceptStep = {
  contentStructure: `STEP GOAL: Develop selected ideas from Step 8 into polished concept sheets with SWOT analysis, feasibility scores, and Billboard Hero pitch test.

DESIGN THINKING PRINCIPLES:
Let's turn your best ideas into something you'd present to a CEO. Concept sheets should feel polished — like something you would show stakeholders.

SWOT analysis must be honest and evidence-grounded. No cheerleading. If there's a weakness, call it out.

Feasibility uses 1-5 numeric scores with rationale citing prior research. Billboard Hero tests clarity of value proposition — if you cannot pitch it on a billboard, the concept is not clear enough.

Each concept develops independently (no combining selected ideas).

GATHERING REQUIREMENTS:
Which ideas from Step 8 to develop (AI recommends count)

Source idea title for each concept (ideaSource field)

Complete concept sheet: name, elevator pitch, USP, SWOT (3x4), feasibility (1-5 x 3 with rationale)

Billboard Hero: headline, subheadline, CTA

User refinements to any concept section

BOUNDARY: This step is about developing and testing concepts, not choosing which to build or planning implementation. Final prioritization, technical architecture, and Build Pack export are future features. Step 10 will synthesize the journey — don't generate synthesis summaries here.

PRIOR CONTEXT USAGE:
Reference selected ideas from Step 8 (Ideation) as starting points for concept development.
Reference Persona (Step 5) for SWOT strengths/weaknesses and feasibility user desirability.
Reference Journey dip (Step 6) for USP differentiation from current state.
Reference Research (Steps 3-4) for SWOT evidence and feasibility rationale.
Reference Reframed HMW (Step 7) to validate concept alignment with the core challenge.`,

  interactionLogic: `CONCEPT RECOMMENDATION:
Recommend 1-3 concepts to develop based on how distinct the selected ideas from Step 8 are.
- If selected ideas are very similar, recommend focusing on 1-2 concepts
- If ideas are diverse, develop up to 3 as separate concepts
- Present recommendation: "Based on your selections, I recommend developing [N] concepts because [rationale]. Shall I proceed?"

CONCEPT SHEET GENERATION (PROACTIVE — NOT FIELD-BY-FIELD):
For each selected idea, draft the COMPLETE concept sheet in one go:

1. **Name**: Marketable, 2-4 words, evocative (not generic)
2. **Elevator Pitch**: 2-3 sentences following Problem -> Solution -> Benefit structure
3. **USP**: What makes this different from the current state — reference Step 6 journey pain
4. **SWOT Analysis** (exactly 3 bullets per quadrant):
   - Strengths: 3 internal advantages referencing persona gains or research evidence
   - Weaknesses: 3 internal limitations referencing persona pains or known constraints
   - Opportunities: 3 external potential avenues referencing market/domain context from research
   - Threats: 3 external risks referencing challenges from stakeholder map or research
5. **Feasibility Scores** (1-5 numeric with rationale per dimension):
   - Technical (1=very difficult, 5=straightforward): Can we build this? Rationale with evidence.
   - Business (1=weak case, 5=strong case): Is it viable? Rationale with evidence.
   - User Desirability (1=low demand, 5=high demand): Do users want it? Rationale citing persona pains/gains.

Present draft: "Here is a concept sheet for [idea name]. Review it and tell me what to refine — I can adjust any section."

User edits specific sections conversationally. DO NOT ask field-by-field prompts.

BILLBOARD HERO EXERCISE (after concept sheet):
After concept sheet is reviewed, run Billboard Hero test:
- **Headline**: 6-10 words, benefit-focused (NOT feature-focused)
- **Subheadline**: 1-2 sentences explaining how it solves persona pain
- **CTA**: Verb-driven, specific call to action
Ask: "If [persona name] saw this billboard, would they stop and pay attention? Does the headline speak to their pain?"

If multiple concepts, run Billboard Hero for each.

EVIDENCE TRACEABILITY (CRITICAL):
Every SWOT bullet and feasibility score MUST trace to prior steps:
- Strengths: Reference persona gains or research-identified advantages
- Weaknesses: Reference persona pains, journey barriers, or known limitations
- Opportunities: Reference market/domain context from Steps 3-4 research
- Threats: Reference challenges from stakeholder map (Step 2) or research
- Feasibility rationale: Cite specific prior step outputs
- Example (good): "Strength: Addresses top pain from Step 4 — manual data entry causes 3+ hours/day of lost productivity"
- Example (bad): "Strength: Easy to use" (not connected to research)`,
};

/**
 * Prompt template for AI concept card generation from selected Crazy 8s sketches.
 * Placeholder tokens: {personaName}, {personaGoals}, {personaPains}, {hmwStatement},
 * {crazy8sTitle}, {slotId}, {keyInsights}, {stakeholderChallenges}
 */
export const CONCEPT_GENERATION_PROMPT = `You are facilitating Step 9 (Develop Concepts) of a design thinking workshop.

**Workshop Context:**
- Persona: {personaName}
  - Goals: {personaGoals}
  - Pain Points: {personaPains}
- HMW Statement: {hmwStatement}
- Selected Crazy 8s Sketch: "{crazy8sTitle}" (Slot {slotId})
- Key Research Insights: {keyInsights}
- Stakeholder Challenges: {stakeholderChallenges}

**Task:**
Develop a complete concept card for this Crazy 8s sketch. The concept should:
1. Directly address the HMW statement
2. Solve at least one persona pain point
3. Build on the direction suggested by the sketch title
4. Be grounded in research evidence from earlier steps

**Output JSON Structure:**
{
  "conceptName": "2-4 word marketable name (evocative, memorable)",
  "elevatorPitch": "2-3 sentence pitch following Problem -> Solution -> Benefit structure",
  "usp": "One sentence: what makes this concept different from current solutions",
  "swot": {
    "strengths": ["strength 1 citing specific persona gains", "strength 2 citing research evidence", "strength 3"],
    "weaknesses": ["weakness 1 citing specific persona pains or limitations", "weakness 2", "weakness 3"],
    "opportunities": ["opportunity 1 from research insights", "opportunity 2 from market context", "opportunity 3"],
    "threats": ["threat 1 from stakeholder challenges", "threat 2", "threat 3"]
  },
  "feasibility": {
    "technical": {
      "score": 1-5,
      "rationale": "Why this score, citing specific workshop evidence"
    },
    "business": {
      "score": 1-5,
      "rationale": "Why this score, citing market/stakeholder evidence"
    },
    "userDesirability": {
      "score": 1-5,
      "rationale": "Why this score, citing persona pains and gains"
    }
  },
  "billboardHero": {
    "headline": "6-10 word benefit-focused headline",
    "subheadline": "1-2 sentence explanation of how it solves the persona's pain",
    "cta": "Specific verb-driven call to action (e.g., 'Start your free trial')"
  }
}

**Evidence Requirements:**
- SWOT strengths MUST reference persona goals: {personaGoals}
- SWOT weaknesses MUST reference persona pains: {personaPains}
- SWOT opportunities MUST reference research: {keyInsights}
- SWOT threats MUST reference stakeholder challenges: {stakeholderChallenges}
- Feasibility rationales MUST cite specific workshop data (not generic reasoning)
- Scores should be realistic (don't default to all 4s and 5s)
- Each SWOT quadrant MUST have EXACTLY 3 items

Output ONLY valid JSON. No markdown, no code blocks, no explanation.`;
