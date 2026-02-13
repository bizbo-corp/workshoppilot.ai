/**
 * Step 5: Persona — Create a research-grounded user persona.
 */
export const personaStep = {
  contentStructure: `STEP GOAL: Create a research-grounded user persona with complete profile including motivations, frustrations, and day-in-the-life context.

DESIGN THINKING PRINCIPLES:
Personas MUST be grounded in research from Step 4 (pains/gains). Every persona trait should trace back to research evidence.

Avoid "Frankenstein Personas" — don't combine conflicting traits from different user types. Make them specific enough to be interesting but realistic enough to be valid.

Include: Name, Age, Role, Location, Bio, Quote, Goals, Pains, Gains, Motivations, Frustrations, Day-in-the-life, and Behaviors.

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

BOUNDARY: This step is about synthesizing research into a persona, not jumping to solutions. Don't suggest features or ideas yet — that's Steps 8-9. If ideation starts, redirect: "Let's finish developing the persona first. Solutions come after we map their journey in Step 6."

PRIOR CONTEXT USAGE:
Reference Step 4 HEAVILY — pains and gains MUST trace directly to Step 4 evidence with source attribution.
Reference Step 3 for behaviors, quotes, and day-in-the-life scenarios (specific research findings and stakeholder interviews).
Reference Step 2 for stakeholder type (which user group this persona represents — core/direct/indirect).`,

  interactionLogic: `EVIDENCE TRACEABILITY (CRITICAL):
For pains and gains:
- MUST trace directly to Step 4 themes, pains, and gains with specific evidence
- Example: "Pain: Manual data entry causes errors [From Step 4: 'Manual data entry causes errors and delays']"

For demographics and lifestyle details (name, age, role, location, bio, quote, behaviors):
- Can be inferred based on Step 2 stakeholder types and Step 3 research context
- Does NOT need explicit Step 4 citation — reasonable inference is OK
- Example: If Step 2 identifies "healthcare providers" and Step 3 interviews mention "clinic workflow", you can infer "Sarah, 34, Nurse Practitioner, Chicago" without explicit research stating those exact details

Be transparent: "I'm inferring [demographic details] based on the stakeholder type from Step 2. The pains and gains come directly from your Step 4 research."

PROACTIVE DRAFTING:
Draft ALL persona fields proactively based on research:
1. Draft complete persona with name, age, role, demographics, bio, quote — everything
2. Present draft to user: "Based on your research, here's a persona I've drafted: [full persona]. What would you like to adjust?"
3. User reviews and refines (not builds from scratch)

This is NOT a Q&A session where you ask the user to provide each field. YOU draft it, THEY review it.

MULTI-PERSONA GUIDANCE:
Support 1-3 personas depending on research diversity. Start with PRIMARY persona (most critical user type from Step 2).

After completing first persona, ask: "Your research suggests [other stakeholder type] might have different needs. Should we create a second persona to represent them?"

If research clearly shows distinct user types with conflicting needs, suggest additional personas. If research is homogeneous (one clear user type), one persona is sufficient.

Present one persona at a time. Don't ask "how many personas do you want?" upfront — let the research guide the count.`,
};
