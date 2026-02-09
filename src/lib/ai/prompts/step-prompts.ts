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

    'persona': `STEP GOAL: Create a research-grounded user persona with complete profile including motivations, frustrations, and day-in-the-life context.

DESIGN THINKING PRINCIPLES:
- Personas MUST be grounded in research from Step 4 (pains/gains)
- Every persona trait should trace back to research evidence
- Avoid "Frankenstein Personas" — don't combine conflicting traits from different user types
- Make them specific enough to be interesting but realistic enough to be valid
- Include: Name, Age, Role, Location, Bio, Quote, Goals, Pains, Gains, Motivations, Frustrations, Day-in-the-life, and Behaviors

EVIDENCE TRACEABILITY (CRITICAL):
For pains and gains:
- MUST trace directly to Step 4 themes, pains, and gains with specific evidence
- Example: "Pain: Manual data entry causes errors [From Step 4: 'Manual data entry causes errors and delays']"

For demographics and lifestyle details (name, age, role, location, bio, quote, behaviors):
- Can be inferred based on Step 2 stakeholder types and Step 3 research context
- Does NOT need explicit Step 4 citation — reasonable inference is OK
- Example: If Step 2 identifies "healthcare providers" and Step 3 interviews mention "clinic workflow", you can infer "Sarah, 34, Nurse Practitioner, Chicago" without explicit research stating those exact details

Be transparent: "I'm inferring [demographic details] based on the stakeholder type from Step 2. The pains and gains come directly from your Step 4 research."

PROACTIVE DRAFTING:
AI drafts ALL persona fields proactively based on research:
1. Draft complete persona with name, age, role, demographics, bio, quote — everything
2. Present draft to user: "Based on your research, here's a persona I've drafted: [full persona]. What would you like to adjust?"
3. User reviews and refines (not builds from scratch)

This is NOT a Q&A session where you ask the user to provide each field. YOU draft it, THEY review it.

MULTI-PERSONA GUIDANCE:
- Support 1-3 personas depending on research diversity
- Start with PRIMARY persona (most critical user type from Step 2)
- After completing first persona, ask: "Your research suggests [other stakeholder type] might have different needs. Should we create a second persona to represent them?"
- If research clearly shows distinct user types with conflicting needs, suggest additional personas
- If research is homogeneous (one clear user type), one persona is sufficient

Present one persona at a time. Don't ask "how many personas do you want?" upfront — let the research guide the count.

GATHERING REQUIREMENTS (ALL FIELDS):
- Name: Realistic first name or full name (YOU draft this based on context)
- Age: Typical age for their role/context (optional, infer if relevant)
- Role: Job title, occupation, or primary role (from Step 2 stakeholder types)
- Location: Geographic context if relevant to challenge (optional, infer if relevant)
- Bio: Brief background story capturing context, situation, experiences (draft from research themes)
- Quote: Representative quote capturing their perspective (pull from Step 3 research quotes or draft realistic quote)
- Goals: 1-5 primary goals or objectives (from Step 4 gains + research context)
- Pains: 1-5 key pain points or frustrations (DIRECTLY from Step 4 pains with evidence)
- Gains: 1-5 desired outcomes or improvements (DIRECTLY from Step 4 gains with evidence)
- Motivations: What drives them to seek a solution (optional, infer from goals/gains)
- Frustrations: Daily annoyances beyond major pains (optional, infer from Step 4 context)
- Day-in-the-life: Brief scenario showing how problem manifests in routine (optional, draft from Step 3 research examples)
- Behaviors: Behavior patterns, habits, technology usage (from Step 3 research findings)

BOUNDARY: This step is about SYNTHESIZING research into a persona, not jumping to solutions. Do not suggest features or ideas yet — that is Steps 8-9. If ideation starts, redirect: "Let's finish developing the persona first. Solutions come after we map their journey in Step 6."

PRIOR CONTEXT USAGE:
Reference Step 4 HEAVILY — pains and gains MUST trace directly to Step 4 evidence with source attribution.
Reference Step 3 for behaviors, quotes, and day-in-the-life scenarios (specific research findings and stakeholder interviews).
Reference Step 2 for stakeholder type (which user group this persona represents — core/direct/indirect).`,

    'journey-mapping': `STEP GOAL: Map the current user experience across 4-8 stages with 7 layers per stage, and identify the critical dip.

DESIGN THINKING PRINCIPLES:
- Journey maps have 4-8 stages representing the CURRENT state (not ideal future)
- Each stage has 7 LAYERS: Action, Goals, Barriers, Touchpoints, Emotions, Moments of Truth, Opportunities
- The "dip" is the stage with the most acute pain — this is where the opportunity lives
- Emotions use traffic light system: positive (green/good), neutral (orange/ok), negative (red/pain)
- Emotions should vary across stages and MUST reflect the barriers in each stage

STAGE CREATION (COLLABORATIVE):
1. Suggest 4-8 journey stages based on persona and challenge context
   - Example for healthcare: "Symptom Awareness → Scheduling Appointment → Waiting Room → Consultation → Treatment → Follow-up"
   - Example for e-commerce: "Product Discovery → Comparison → Cart → Checkout → Delivery → Post-Purchase"

2. Present suggested stages to user: "Based on [persona name]'s context, I suggest these journey stages: [list]. Does this capture their experience, or should we adjust?"

3. User confirms or modifies stage structure (add/remove/rename stages)

4. Once stages are confirmed, populate all 7 layers for each stage (don't ask user to populate — YOU populate based on research)

7-LAYER POPULATION (AI-DRIVEN):
For EACH stage, populate all 7 layers based on prior research:

1. **Action**: What the persona does in this stage (observable behavior)
   - From: Step 5 persona behaviors + Step 3 research findings
   - Example: "Searches multiple insurance websites to compare prices"

2. **Goals**: What they're trying to achieve in this stage (desired outcome)
   - From: Step 5 persona goals + Step 4 gains relevant to this stage
   - Example: "Find the best coverage at lowest cost"

3. **Barriers**: Obstacles, pain points, or friction they encounter
   - From: Step 4 pains + Step 5 persona frustrations
   - Example: "Confusing terminology, inconsistent pricing displays, can't compare apples-to-apples"

4. **Touchpoints**: Tools, systems, people, or interfaces they interact with
   - From: Step 3 research mentions of specific tools/processes
   - Example: "Company websites, comparison sites, PDF policy documents, customer service chat"

5. **Emotions** (TRAFFIC LIGHT): How they feel — MUST reflect barriers
   - positive (green): Stage goes smoothly, goals achieved, minimal friction
   - neutral (orange): Some friction but manageable, mixed feelings
   - negative (red): High friction, barriers blocking goals, frustration/pain
   - Emotion MUST match barrier severity — if barriers are severe, emotion is negative
   - From: Step 5 persona quote + Step 4 pain intensity

6. **Moments of Truth** (OPTIONAL): Critical moments where they form strong opinions or make key decisions
   - From: Step 3 research quotes mentioning decision points
   - Example: "Decides whether to continue or give up" or "Realizes current solution won't work"

7. **Opportunities** (OPTIONAL): Potential improvements or interventions
   - From: Step 4 gains + inference about what could help
   - Example: "Standardized comparison tool" or "Guided terminology explainer"

Present populated journey to user: "Here's the journey map I've created based on your research. The 7 layers show [persona name]'s actions, goals, barriers, touchpoints, emotions, moments of truth, and opportunities at each stage. What needs adjustment?"

DIP IDENTIFICATION (AI SUGGESTS, USER CONFIRMS):
1. AI identifies the stage with the most severe barriers and negative emotion as the dip

2. Provide RATIONALE: "I've identified [stage name] as the critical dip because [specific barriers from that stage], which creates [negative emotion]. This is where [persona name] experiences the most acute breakdown."

3. Ask user to confirm or select different stage: "Does this feel like the most critical pain point, or is there another stage that's worse?"

4. User confirms or picks different dip stage

5. Capture dipRationale in the artifact explaining why this stage is the dip

CONTEXT REFERENCING:
Use GENERIC references, not persona name, when describing journey stages:
- GOOD: "The user searches multiple websites" / "They feel frustrated by confusing terminology"
- BAD: "Sarah searches multiple websites" / "Sarah feels frustrated by confusing terminology"

This keeps the journey map reusable and professional. Persona name appears ONLY in the personaName field at the top of the artifact.

GATHERING REQUIREMENTS:
- What are the stages from awareness to current resolution? (AI suggests, user confirms)
- At each stage: What does the user do, want to achieve, encounter as barriers, interact with, and feel? (AI populates from research)
- Where does the experience break down most severely (the dip)? (AI identifies with rationale, user confirms)
- What opportunities exist at each stage? (AI infers from gains)

BOUNDARY: This step is about MAPPING the current experience, not designing the future solution. Do not suggest features or improvements yet — that is Steps 8-9. Opportunities layer identifies WHERE to intervene, not HOW. If ideation starts, redirect: "Let's finish mapping the current journey first. Once we identify the dip, we'll reframe the challenge in Step 7 before ideating solutions."

PRIOR CONTEXT USAGE:
Reference Persona (Step 5) behaviors and context heavily — use their pains to populate barriers, their goals to populate stage goals.
Reference Step 4 pains to identify barriers at each stage (which pains manifest where in the journey).
Reference Step 3 research for touchpoints (specific tools/processes mentioned) and moments of truth (decision points in interviews).
Reference Step 1 challenge to keep journey focused on the problem area (don't map unrelated parts of their life).`,

    'reframe': `STEP GOAL: Draft a fresh How Might We statement from scratch using the 4-part builder, grounded in persona pain points and journey dip.

DESIGN THINKING PRINCIPLES:
- This is a FRESH REWRITE, not an evolution of Step 1 — draft new HMW from scratch using all accumulated research
- Ground the reframe in the Journey Map dip (Step 6) — that's where the opportunity is
- Make it specific to the Persona (Step 5) — focus on their pain points and desired gains
- Use 4-part HMW template: "Given that [context], how might we help [persona] do/be/feel/achieve [immediate goal] so they can [deeper goal]?"
- Multiple HMW statements allowed — user can create variations and select which to carry into ideation

4-PART HMW BUILDER (MAD-LIBS FLOW):
AI suggests 2-3 options per field with source context, user selects or modifies:

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

3. AI assembles complete HMW statement: "Given that [field 1], how might we help [field 2] [field 3] so they can [field 4]?"

4. Present full statement for review: "Here's the complete reframed HMW: [full statement]. Does this capture the opportunity?"

5. User can refine any field or accept

6. Option to create MULTIPLE HMW STATEMENTS: "Would you like to create alternative HMW statements focusing on different aspects of the dip, or is this one sufficient?"

MULTIPLE HMW STATEMENTS:
- User can create 1+ HMW statements (not limited to one)
- Each statement uses the 4-part builder
- After creating multiple, ask: "Which HMW statement(s) should we carry into Step 8 ideation? You can select one or ideate on multiple."
- Capture selectedForIdeation indices in artifact

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

Present both traceability and quality assessment to user before finalizing.

GATHERING REQUIREMENTS (4-PART BUILDER):
- Original HMW: The original How Might We statement from Step 1 (for reference/comparison)
- Given that: What specific context or barrier from the journey dip? (from Step 6 dip barriers)
- Persona: Which user type or persona characteristic? (from Step 5)
- Immediate goal: What should they accomplish at that moment? (from Step 6 stage goals + Step 5 persona goals)
- Deeper goal: What's the broader emotional or life outcome? (from Step 4 gains + Step 5 persona motivations)
- Insights applied: List the key insights from research (Steps 3-6) that informed this reframe
- Evolution (optional): Explain how and why the HMW evolved from original to reframed

BOUNDARY: This step is about REFRAMING the problem with research clarity, not solving it. Do not suggest solutions, features, or ideas yet — that is Step 8. The HMW opens up the solution space without prescribing a specific approach. If ideation starts, redirect: "Let's finalize the reframed challenge first. In Step 8, we'll generate many ideas to address this HMW."

PRIOR CONTEXT USAGE:
Reference Journey Map dip (Step 6) HEAVILY — "Given that" and immediate goal come from dip stage barriers and goals.
Reference Persona (Step 5) for persona field and to ensure HMW addresses their specific pain points (use persona pains to validate relevance).
Reference Step 4 gains for deeper goal field (what broader outcome do they seek beyond the immediate task).
Compare to Step 1 original HMW to show evolution: "The original HMW was [Step 1]. Research revealed [key insights]. The reframed HMW is now [new HMW], which focuses specifically on [dip pain]."`,

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
