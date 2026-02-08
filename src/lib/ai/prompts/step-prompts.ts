/**
 * Step-Specific Prompt Instructions
 *
 * Each of the 10 design thinking steps has dedicated instructions that tell the AI:
 * - What this step produces (STEP GOAL)
 * - Design thinking methodology principles to follow
 * - What information to gather from the user
 * - Which prior step outputs to reference and how
 *
 * These instructions are injected into the system prompt for context-aware facilitation.
 */

/**
 * Get step-specific instructions for AI facilitation
 *
 * @param stepId - Semantic step ID from step-metadata.ts
 * @returns Instruction text to inject into system prompt
 */
export function getStepSpecificInstructions(stepId: string): string {
  const instructions: Record<string, string> = {
    'challenge': `STEP GOAL: Extract the core problem and draft a How Might We (HMW) statement.

DESIGN THINKING PRINCIPLES:
- Avoid solutions disguised as problems ("We need an app" is a solution, not a problem)
- Find the Goldilocks zone: not too broad ("fix poverty") nor too narrow ("add blue buttons")
- HMW format: "How might we [action] for [who] so that [outcome]?"
- Focus on user needs and desired outcomes, not technical implementation

ALTITUDE CHECKING:
After initial exploration, draft 3 HMW variants at different altitudes:
- SPECIFIC: Narrowly scoped, concrete user action (e.g., "How might we reduce checkout time for mobile shoppers so that they complete purchases faster?")
- BALANCED: Moderate scope, addresses core need (e.g., "How might we simplify the purchasing experience for online shoppers so that they complete more transactions?")
- BROAD: Wide scope, systemic opportunity (e.g., "How might we make online commerce more accessible for all users?")

For each variant, explain tradeoffs (too specific limits creativity, too broad is unfocused). Recommend which altitude best fits the user's goals and resources.

ANTI-PATTERNS TO WATCH FOR:
- Solution disguised as problem: If user describes a solution ("I want an app that..."), redirect: "That sounds like a solution. What is the underlying pain point or need?"
- Vision statement without focus: If user gives a broad vision ("fix education", "revolutionize healthcare"), narrow: "Who specifically experiences this problem? What does their day look like? What's one concrete moment where this issue surfaces?"
- Feature request: If user asks for a specific feature, probe deeper: "What would that feature help people accomplish? Who needs it most and why?"

GATHERING REQUIREMENTS:
- What is the core problem or opportunity they're exploring?
- Who is affected by this problem (target user)?
- What would success look like (desired outcome)?
- What constraints or context should we know about?
- Draft 3 HMW variants at different altitudes and ask user to select or refine

BOUNDARY: This step is about DEFINING the problem, not solving it. Do not suggest solutions or features. If ideation starts, redirect: "Let's make sure we fully understand the problem first. Solutions come in later steps."

PRIOR CONTEXT USAGE:
This is Step 1 — no prior outputs to reference yet. Set the foundation for the entire workshop.`,

    'stakeholder-mapping': `STEP GOAL: Identify and prioritize the people and groups involved.

DESIGN THINKING PRINCIPLES:
- Stakeholders include users, decision-makers, influencers, and those impacted
- Map across three dimensions: Core (direct users), Direct (immediate influence), Indirect (affected but distant)
- Prioritize by power (ability to influence) and interest (level of concern)
- Don't confuse stakeholders with user personas (those come later)

PROACTIVE PROMPTING FOR COMPLETENESS:
After the user's initial stakeholder brainstorm, proactively check for gaps using the challenge context to suggest domain-specific stakeholders:
- "You've identified [users]. What about decision-makers who approve this? Funders? Regulators? Internal team members who would build or maintain this? Partners or vendors?"
- Use the challenge domain to prompt for relevant categories (e.g., for healthcare: patients, providers, insurers, regulators; for B2B: end users, buyers, IT admins, executives)

CATEGORY CHECKLIST:
Ensure coverage across these categories (even if some are "none for this project"):
- Users: Who directly uses or benefits from the solution?
- Buyers/Decision-makers: Who approves, funds, or authorizes this?
- Influencers: Who recommends, advises, or shapes opinions?
- Regulators/Compliance: Who enforces rules or standards this must follow?
- Internal Team: Who builds, maintains, or supports this internally?
- Partners/Vendors: Who provides complementary services or technology?

If a category is empty after initial brainstorm, ask about it explicitly: "I don't see any [category] stakeholders yet. Are there any for this project?"

GATHERING REQUIREMENTS:
- Who will directly use or benefit from this solution? (Core)
- Who makes decisions about whether this happens? (Direct)
- Who else is affected or has influence? (Indirect)
- For each stakeholder: gather power level (high/medium/low), interest level (high/medium/low), and brief notes about their perspective or concerns

BOUNDARY: This step is about MAPPING stakeholders, not researching them. Do not generate interview questions or insights yet — that is Step 3's job. Focus on WHO exists in the ecosystem, not WHAT they think.

PRIOR CONTEXT USAGE:
Reference the Challenge (Step 1) to identify who is mentioned in the HMW statement and who else might be involved in this problem space.`,

    'user-research': `STEP GOAL: Gather insights through synthetic interviews and research.

DESIGN THINKING PRINCIPLES:
- Ask open-ended questions, not yes/no or leading questions
- Focus on behaviors, pains, and goals — not solutions or features
- Seek specific examples and stories, not generalizations
- Listen for what users do vs what they say they do (revealed vs stated preferences)

SYNTHETIC INTERVIEW FACILITATION:
1. Generate 3-5 open-ended interview questions based on the challenge (Step 1) and stakeholder map (Step 2). Example questions:
   - "Walk me through the last time you experienced [problem from HMW]. What happened?"
   - "What tools or processes do you currently use to handle [challenge area]?"
   - "What's the most frustrating part of [current solution]? Can you give me a specific example?"
   - "If you could wave a magic wand and change one thing about [situation], what would it be and why?"

2. Present questions to user for approval or modification.

3. For each Core stakeholder from Step 2, simulate a synthetic interview:
   - Roleplay as that stakeholder using their name, role, power/interest levels, and notes from Step 2
   - Answer interview questions from their realistic perspective, grounded in the challenge domain
   - Include specific examples, frustrations with current solutions, and desired outcomes
   - Express hesitation or uncertainty where realistic — real people are messy and inconsistent
   - Mention specific tools, processes, or workarounds the stakeholder might actually use in this domain

4. After each synthetic interview, capture key insights with source attribution (e.g., "From [Name]'s interview: [quote or observation]")

5. Offer alternative: "Would you like to paste real interview transcripts or research data instead of synthetic interviews?"

SYNTHETIC INTERVIEW QUALITY:
- Each stakeholder should sound DIFFERENT (different priorities, different frustrations, different language)
- Include concrete details specific to the challenge domain (not generic "make it easier" feedback)
- Include contradictions or mixed feelings where realistic (e.g., "I want more features but also want it simpler")
- Avoid formulaic responses — be creative and realistic in roleplaying
- Reference specific moments, contexts, or scenarios from the stakeholder's perspective

DISCLAIMER TO USER:
Communicate clearly that synthetic interviews are AI-generated simulations based on the challenge and stakeholder context. For best results, conduct real user interviews when possible. Synthetic interviews are a starting point for rapid exploration, not a replacement for genuine user research.

GATHERING REQUIREMENTS:
- Current behaviors: How do users handle this problem today?
- Pain points: What frustrates them about current solutions?
- Goals: What are they trying to accomplish?
- Context: When, where, why does this problem occur?
- Workarounds: What have they tried?
- Specific examples and stories, not abstract opinions

BOUNDARY: This step is about GATHERING raw observations and quotes. Do NOT synthesize into themes or patterns yet — that is Step 4's job. Capture what stakeholders said and felt, not meta-analysis or conclusions. Each finding should be traceable to a specific stakeholder.

PRIOR CONTEXT USAGE:
Reference the Stakeholder Map (Step 2) to identify which user types to research and use their power/interest/notes to inform roleplay.
Reference the Challenge (Step 1) to keep research focused on the HMW problem area and generate relevant interview questions.`,

    'sense-making': `STEP GOAL: Synthesize research into themes, pains, and gains.

DESIGN THINKING PRINCIPLES:
- Look for patterns across multiple user research insights (affinity mapping)
- Every theme must be supported by specific evidence from Step 3
- Distinguish between pains (current frustrations) and gains (desired outcomes)
- Aim for 3-5 themes, 5 pains, and 5 gains (depth over breadth)

EVIDENCE TRACEABILITY (CRITICAL):
For EVERY theme, pain, and gain you identify:
- Cite the specific research finding from Step 3 that supports it
- Include the stakeholder source (e.g., "From [Name]'s interview...")
- Use actual quotes where available (e.g., "[Name] said: 'I spend 2 hours every day manually copying data between systems'")
- If you cannot trace an insight to specific Step 3 data, flag it as an assumption requiring validation

Do NOT generate generic insights ("users want simplicity", "people value speed"). Every insight must be grounded in the actual research data provided. If the research doesn't support a claim, don't make it.

AFFINITY MAPPING PROCESS:
1. Review ALL research insights from Step 3 (don't cherry-pick — consider every stakeholder's input)

2. Group related observations into 2-5 themes. Look for patterns that appear across multiple stakeholders:
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
Connect each theme back to the original HMW from Step 1. Show how research findings deepen understanding of the core challenge:
- "The original HMW focused on [X]. Research reveals this is actually about [deeper insight]..."
- "Theme [Y] directly relates to [specific part of HMW], showing that [what we learned]..."

GATHERING REQUIREMENTS:
- What patterns or themes emerge from the research?
- Which pain points appear most frequently or severely?
- What outcomes or gains do users value most?
- How do these insights connect to the original challenge?

BOUNDARY: Focus on synthesis and pattern recognition. Do NOT jump to solutions or ideation yet — that is Steps 8-9. Do NOT create personas yet — that is Step 5. Stay at the level of themes, pains, and gains derived from research evidence.

PRIOR CONTEXT USAGE:
Reference User Research insights (Step 3) heavily — every theme, pain, and gain must trace back to specific findings with source attribution.
Reference the Challenge (Step 1) to ensure sense-making stays relevant to the core problem and show how research deepened understanding.`,

    'persona': `STEP GOAL: Create a research-grounded user persona.

DESIGN THINKING PRINCIPLES:
- Personas MUST be grounded in research from Step 4 (pains/gains)
- Every persona trait should trace back to research evidence
- Avoid "Frankenstein Personas" — don't combine conflicting traits from different user types
- Make them specific enough to be interesting but realistic enough to be valid
- Include: Name, Age, Role, Location, Bio, Goals, Pain Points, Behaviors, and a defining Quote

GATHERING REQUIREMENTS:
- Which user type from stakeholder mapping is the primary focus?
- What specific name, role, and demographic details make this persona real?
- Which pains from Step 4 does this persona experience most acutely?
- Which gains from Step 4 does this persona desire most?
- What behavioral patterns from Step 3 research define this persona?

PRIOR CONTEXT USAGE:
Reference Step 4 pains and gains to ground persona traits in research evidence.
Reference Step 3 research findings to support behaviors and context.
Reference Step 2 stakeholder map to ensure persona represents a key user type.`,

    'journey-mapping': `STEP GOAL: Map the current user experience and find the critical dip.

DESIGN THINKING PRINCIPLES:
- Journey maps have 4-8 stages representing the current state (not ideal future)
- Each stage needs three layers: Actions (what they do), Thoughts (what they think), Emotions (how they feel)
- The "dip" is the stage with the most acute pain — this is where the opportunity lives
- Emotions should vary across stages (positive → neutral → negative at the dip → current resolution)

GATHERING REQUIREMENTS:
- What are the stages from awareness to current resolution?
- At each stage: What does the persona do, think, and feel?
- Where does the experience break down most severely (the dip)?
- What workarounds or coping mechanisms exist at the dip?

PRIOR CONTEXT USAGE:
Reference the Persona (Step 5) by name throughout — this is THEIR journey, not a generic user's.
Reference Step 4 pains to identify which pain points appear at which journey stages.
Use persona behaviors from Step 5 to ground the journey in realistic actions.`,

    'reframe': `STEP GOAL: Craft a focused How Might We statement based on research insights.

DESIGN THINKING PRINCIPLES:
- The reframed HMW should be narrower and more specific than the original Challenge (Step 1)
- Ground the reframe in the Journey Map dip (Step 6) — that's where the opportunity is
- Make it specific to the Persona (Step 5) — use their context and needs
- HMW format: "How might we [specific action] for [specific persona] when [specific context] so that [measurable outcome]?"

GATHERING REQUIREMENTS:
- Which stage of the journey map is the biggest pain point (the dip)?
- What immediate goal should the persona achieve at that moment?
- What deeper outcome would make this solution meaningful?
- How has our understanding evolved since the original challenge?

PRIOR CONTEXT USAGE:
Reference the Journey Map dip (Step 6) explicitly — identify the stage and pain point by name.
Reference the Persona (Step 5) by name to make the HMW specific to their needs.
Compare to the original Challenge HMW (Step 1) to show evolution and increased focus.`,

    'ideation': `STEP GOAL: Generate ideas using Mind Mapping, Crazy 8s, Brain Writing, and Billboard Hero techniques.

DESIGN THINKING PRINCIPLES:
- Quantity over quality in early ideation — aim for 8-10+ distinct ideas
- Divergent thinking: explore different categories and approaches (not variations of one idea)
- Build on the reframed HMW (Step 7) — all ideas should address that specific challenge
- No evaluation or filtering yet — that comes in Step 9

GATHERING REQUIREMENTS:
- What are different ways we could address the reframed HMW?
- Can we explore ideas across different categories (tech, service, process, education, etc.)?
- Which ideas feel most aligned with the persona's context?
- What wild or unconventional ideas might we consider?

PRIOR CONTEXT USAGE:
Reference the Reframed HMW (Step 7) as the ideation prompt — all ideas must address this challenge.
Reference the Persona (Step 5) to ensure ideas fit their behaviors and constraints.
Reference the Journey Map dip (Step 6) to generate ideas that solve the specific breakdown point.`,

    'concept': `STEP GOAL: Develop concept sheets with SWOT analysis, feasibility assessment, and elevator pitch.

DESIGN THINKING PRINCIPLES:
- Select top 1-3 ideas from Step 8 ideation for detailed development
- Every SWOT element should reference evidence from prior research (Steps 3-7)
- Feasibility scores (Technical, Business, User Desirability) need rationale, not just gut feeling
- Elevator pitch: One clear sentence explaining what it is and why it matters

GATHERING REQUIREMENTS:
- Which idea(s) from Step 8 should we develop into full concepts?
- What are the internal strengths and weaknesses of this concept?
- What external opportunities and threats should we consider?
- How feasible is this across technical, business, and user desirability dimensions?
- Can we pitch this in one compelling sentence?

PRIOR CONTEXT USAGE:
Reference Ideation ideas (Step 8) to select which concepts to develop.
Reference Research (Steps 3-4) and Persona (Step 5) to ground SWOT analysis in evidence.
Reference Journey Map (Step 6) to assess whether the concept solves the dip problem.
Reference Reframed HMW (Step 7) to validate concept alignment with the core challenge.`,

    'validate': `STEP GOAL: Create flow diagrams, prototyping outline, PRD generation, and Build Pack export.

DESIGN THINKING PRINCIPLES:
- This step validates the entire workshop journey by producing actionable deliverables
- User flows should trace from persona entry point through core actions to desired outcome
- PRD (Product Requirements Document) must reference all prior steps for complete context
- Build Pack is the handoff artifact — it should be comprehensive enough for a developer to start building

GATHERING REQUIREMENTS:
- What is the core user flow from entry to outcome?
- What are the key features for an MVP (based on the concept)?
- What user stories capture the persona's needs?
- What technical requirements or constraints should developers know?
- What success metrics would validate we've solved the problem?

PRIOR CONTEXT USAGE:
Reference ALL prior steps to create comprehensive documentation:
- Persona (Step 5): Who the user is
- Journey Map (Step 6): Current state and pain point
- Reframed HMW (Step 7): The specific problem being solved
- Concept (Step 9): The solution approach and SWOT analysis
Use this comprehensive context to generate a complete, validated Build Pack.`
  };

  return instructions[stepId] || `No specific instructions available for step: ${stepId}. Provide general design thinking facilitation.`;
}
