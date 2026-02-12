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
 * Get sub-step-specific instructions for Step 8 ideation
 *
 * @param subStep - Sub-step identifier: 'mind-mapping', 'crazy-eights', or 'idea-selection'
 * @returns Focused instruction text for this sub-step
 */
export function getIdeationSubStepInstructions(subStep: 'mind-mapping' | 'crazy-eights' | 'idea-selection'): string {
  const subStepInstructions: Record<string, string> = {
    'mind-mapping': `STEP 8a: MIND MAPPING — Generate themed idea clusters from the reframed HMW.

YOUR TASK:
Generate 3-4 themed clusters addressing the HMW from Step 7.
- Each cluster: 3-4 ideas with short titles and descriptions
- Each cluster includes 1-2 wild card ideas (mark clearly)
- Wild cards MUST feel genuinely unconventional — challenge assumptions, use analogies from other industries, feel slightly "too bold"
- Example wild cards: "What if we gamified this like a mobile game?" "What if we made it 10x more expensive but premium?" "What if users had to invite friends to unlock features?"
- Present themes and ideas with NO theme rationale — keep it fast and creative
- Do NOT evaluate or rank ideas yet

After presenting clusters, explicitly ask: "What ideas would YOU add? Feel free to piggyback on any cluster theme or suggest something completely different. No idea is too wild at this stage!"

Capture user ideas alongside AI suggestions. Once user has added their ideas (or says they're done), confirm the mind map is complete and encourage moving to the next sub-step.

DESIGN THINKING PRINCIPLES:
- Quantity over quality in early ideation (divergent thinking)
- Wild card ideas challenge assumptions and unlock new creative directions
- Defer ALL judgment until the selection phase at the end
- Ideas should span different categories and approaches, not variations of one approach

PRIOR CONTEXT USAGE:
Reference the Reframed HMW (Step 7) as the ideation prompt — all ideas must address this specific challenge.
Reference Persona (Step 5) to ensure ideas fit their behaviors, constraints, and context.
Reference Journey Map dip (Step 6) to generate ideas that solve the specific breakdown point.`,

    'crazy-eights': `STEP 8b: CRAZY 8s — Rapid-fire 8 ideas with energetic conversational pacing.

YOUR TASK:
Facilitate 8 quick ideas with high energy and fast pacing:
- "Quick — first thought that comes to mind!"
- "Don't overthink — what if we...?"
- "That's 4 down, 4 to go — keep the momentum!"
- Pacing should feel energetic and encouraging, NOT formal
- No timer UI — create urgency through conversational energy
- These ideas can be rough — quantity and energy over polish
- Each idea gets a short title and 1-2 sentence description

After all 8 ideas, ask user: "Want to add any rapid-fire ideas of your own? Just throw them out there!"

DESIGN THINKING PRINCIPLES:
- Speed breaks overthinking — first ideas are often most creative
- Quantity unlocks unexpected connections
- Rough ideas are fine — polish comes later
- Building on prior clusters from 8a is OK but new directions welcome too

PRIOR CONTEXT USAGE:
Reference the Mind Mapping clusters from earlier in Step 8 if they appeared in conversation.
Reference the Reframed HMW (Step 7) to keep ideas grounded.
Reference Persona (Step 5) behaviors and context.`,

    'idea-selection': `STEP 8c: IDEA SELECTION — Help user select their best ideas from Crazy 8s sketches.

The user has completed Mind Mapping (theme exploration) and Crazy 8s (8 rapid sketches).
Now help them evaluate and select the top 2-4 ideas to develop further in Step 9.

CONVERSATION FLOW:
1. Ask user which sketches they feel strongest about
2. Help them articulate WHY those ideas are compelling
3. Encourage diversity (don't pick 4 similar ideas)
4. Confirm final selection

CRITERIA FOR SELECTION:
- Feasibility: Can this realistically be built?
- Desirability: Does the persona actually want this?
- Novelty: Does this offer something new?
- Alignment: Does this address the HMW statement?

PRIOR CONTEXT USAGE:
Reference the Reframed HMW (Step 7) to validate selected ideas address the challenge.
Reference the Persona (Step 5) for desirability check.
Reference mind map themes and Crazy 8s sketches from earlier in Step 8.`
  };

  return subStepInstructions[subStep] || '';
}

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

STAGE CREATION (COLLABORATIVE — conversation only, no GRID_ITEM tags):
1. Suggest 4-8 journey stages based on persona and challenge context
   - Example for healthcare: "Symptom Awareness → Scheduling Appointment → Waiting Room → Consultation → Treatment → Follow-up"
   - Example for e-commerce: "Product Discovery → Comparison → Cart → Checkout → Delivery → Post-Purchase"

2. Present suggested stages to user: "Based on [persona name]'s context, I suggest these journey stages: [list]. Does this capture their experience, or should we adjust?"

3. User confirms or modifies stage structure (add/remove/rename stages)

4. Do NOT use [GRID_ITEM] tags during stage creation — columns are structural, not post-its. The canvas columns will be set up separately.

7-LAYER POPULATION (ROW-BY-ROW — use [GRID_ITEM] tags):
After stages are confirmed, populate ONE ROW at a time using [GRID_ITEM] tags.
Items appear instantly on the canvas as you generate them.

ROW-BY-ROW FLOW:
1. Start with the **Actions** row: generate one [GRID_ITEM] per confirmed stage/column
2. After presenting the row, ask: "How does the **Actions** row look? Say 'next' for the next layer, or tell me what to change."
3. When user says next (or approves), move to **Goals** row
4. Continue through all 7 rows: Actions → Goals → Barriers → Touchpoints → Emotions → Moments of Truth → Opportunities

For each row, generate items for ALL columns in a single message. One item per column per row is typical (4-8 items depending on stage count).

ROW CONTENT GUIDANCE:
1. **Actions**: What the persona does in this stage (observable behavior)
   - From: Step 5 persona behaviors + Step 3 research findings

2. **Goals**: What they're trying to achieve in this stage (desired outcome)
   - From: Step 5 persona goals + Step 4 gains relevant to this stage

3. **Barriers**: Obstacles, pain points, or friction they encounter
   - From: Step 4 pains + Step 5 persona frustrations

4. **Touchpoints**: Tools, systems, people, or interfaces they interact with
   - From: Step 3 research mentions of specific tools/processes

5. **Emotions** (TRAFFIC LIGHT): How they feel — MUST reflect barriers
   - positive (green): Stage goes smoothly, goals achieved, minimal friction
   - neutral (orange): Some friction but manageable, mixed feelings
   - negative (red): High friction, barriers blocking goals, frustration/pain
   - Emotion MUST match barrier severity — if barriers are severe, emotion is negative

6. **Moments of Truth** (OPTIONAL): Critical moments where they form strong opinions or make key decisions

7. **Opportunities** (OPTIONAL): Potential improvements or interventions

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

    'ideation': `STEP GOAL: Generate creative ideas using Mind Mapping and Crazy 8s visual ideation, then select top ideas.

This step uses 3 sub-steps:
- 8a: Mind Mapping — Visual canvas to explore themes and generate idea clusters
- 8b: Crazy 8s — 8 rapid sketches in grid format for visual ideation
- 8c: Idea Selection — Select top 2-4 Crazy 8s sketches for concept development

DESIGN THINKING PRINCIPLES:
- Quantity over quality in early ideation (divergent thinking)
- Visual thinking unlocks creativity beyond text
- Wild card ideas challenge assumptions
- Defer ALL judgment until selection phase
- Ideas should span different categories and approaches

BOUNDARY: This step is about GENERATING and SELECTING ideas, not developing them. Defer feasibility, SWOT, and concept development to Step 9.

PRIOR CONTEXT USAGE:
Reference the Reframed HMW (Step 7) as the ideation prompt.
Reference Persona (Step 5) to ground ideas in user context.
Reference Journey Map dip (Step 6) to solve the specific breakdown point.
Reference Step 4 pains/gains for validated user needs.`,

    'concept': `STEP GOAL: Develop selected ideas from Step 8 into polished concept sheets with SWOT analysis, feasibility scores, and Billboard Hero pitch test.

DESIGN THINKING PRINCIPLES:
- Concept sheets should feel polished — like something you would present to stakeholders
- SWOT analysis must be honest and evidence-grounded (no cheerleading)
- Feasibility uses 1-5 numeric scores with rationale citing prior research
- Billboard Hero tests clarity of value proposition — if you cannot pitch it on a billboard, the concept is not clear enough
- Each concept develops independently (no combining selected ideas)

CONCEPT RECOMMENDATION:
AI recommends 1-3 concepts to develop based on how distinct the selected ideas from Step 8 are.
- If selected ideas are very similar, recommend focusing on 1-2 concepts
- If ideas are diverse, develop up to 3 as separate concepts
- Present recommendation: "Based on your selections, I recommend developing [N] concepts because [rationale]. Shall I proceed?"

CONCEPT SHEET GENERATION (PROACTIVE — NOT FIELD-BY-FIELD):
For each selected idea, AI drafts the COMPLETE concept sheet in one go:

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
- Example (bad): "Strength: Easy to use" (not connected to research)

GATHERING REQUIREMENTS:
- Which ideas from Step 8 to develop (AI recommends count)
- Source idea title for each concept (ideaSource field)
- Complete concept sheet: name, elevator pitch, USP, SWOT (3x4), feasibility (1-5 x 3 with rationale)
- Billboard Hero: headline, subheadline, CTA
- User refinements to any concept section

BOUNDARY: This step is about DEVELOPING and TESTING concepts, not choosing which to build or planning implementation. Final prioritization, technical architecture, and Build Pack export are future features. Step 10 will synthesize the journey — do NOT generate synthesis summaries here.

PRIOR CONTEXT USAGE:
Reference selected ideas from Step 8 (Ideation) as starting points for concept development.
Reference Persona (Step 5) for SWOT strengths/weaknesses and feasibility user desirability.
Reference Journey dip (Step 6) for USP differentiation from current state.
Reference Research (Steps 3-4) for SWOT evidence and feasibility rationale.
Reference Reframed HMW (Step 7) to validate concept alignment with the core challenge.`,

    'validate': `STEP GOAL: Synthesize the full 10-step design thinking journey into a validated summary with honest confidence assessment and concrete next steps.

DESIGN THINKING PRINCIPLES:
- Synthesis creates closure — user should feel their time was well spent
- Honest assessment, not cheerleading — confidence rating MUST reflect actual research quality
- Next steps are concrete and specific to THIS concept and gaps, not generic advice
- Dual format: narrative story (emotional) + structured reference (scannable)
- This is the CAPSTONE of the journey — make it feel like a satisfying conclusion

SYNTHESIS FORMAT (dual structure):

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

Do NOT dump all data. Key outputs ONLY — this is a scannable reference, not a data export.

3. CONFIDENCE ASSESSMENT:
Rate how well-validated the concept is (1-10 scale):
- **Score**: [number] / 10
- **Rationale**: Honest explanation of why this score. What evidence supports the concept? What gaps remain?
- **Research Quality**: thin / moderate / strong
  - thin: Synthetic interviews only, no real user data
  - moderate: Mix of synthetic and some real-world context
  - strong: Real user interviews, market data, domain expertise

Be HONEST. Do NOT inflate the score to make the user feel good.
- Example (honest): "Confidence: 6/10. Research was synthetic (no real user interviews), but persona and concept align well with the stated challenge. The SWOT identified real risks. Recommend validating key assumptions with 5 real user interviews."
- Example (bad): "Confidence: 9/10. Great work!" (cheerleading without substance)

4. RECOMMENDED NEXT STEPS (3-5 concrete actions):
Based on THIS concept and gaps identified during the workshop:
- Each action should be specific enough to execute: "Conduct 5 user interviews with [persona type] to validate [specific assumption]"
- Reference specific gaps: "Research was thin on [area] — validate with [method]"
- Include a mix: validation actions, prototyping, competitive analysis, technical scoping
- Do NOT include generic advice like "do more research" — be specific about WHAT to research and WHY

Note: Build Pack export is a future feature. Next steps can mention "Define MVP scope and technical requirements" but do NOT promise automatic export.

GATHERING REQUIREMENTS:
AI synthesizes automatically from all prior step artifacts (Steps 1-9). No field-by-field prompts needed.
- Narrative intro from journey arc (Steps 1-9 key moments)
- Step summaries from each step's artifact key outputs
- Confidence from research quality assessment (how much was synthetic vs real)
- Next steps from gaps identified across the journey + concept SWOT threats/weaknesses
If user wants to adjust narrative tone or emphasize different aspects, refine conversationally.

BOUNDARY: This is the FINAL step (Step 10). It is about SYNTHESIS and CLOSURE, not generating new ideas, concepts, or outputs. If user wants to revise earlier steps, they should use back-navigation to return to those steps. Step 10 is reflective — looking back on the journey and forward to next actions.

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
Show the arc: vague idea -> researched problem -> reframed challenge -> creative solutions -> validated concept.`
  };

  return instructions[stepId] || `No specific instructions available for step: ${stepId}. Provide general design thinking facilitation.`;
}

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
  "elevatorPitch": "2-3 sentence pitch following Problem → Solution → Benefit structure",
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
