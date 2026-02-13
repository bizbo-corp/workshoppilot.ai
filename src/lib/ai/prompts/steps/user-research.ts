/**
 * Step 3: User Research — Gather insights through synthetic interviews and research.
 */
export const userResearchStep = {
  contentStructure: `STEP GOAL: Gather insights through synthetic interviews and research.

DESIGN THINKING PRINCIPLES:
Ask open-ended questions, not yes/no or leading questions. You want stories, not data points.

Focus on behaviors, pains, and goals — not solutions or features. What do they actually do? What breaks?

Seek specific examples. "Users want it faster" is useless. "Sarah spends 20 minutes every morning manually reconciling data" is gold.

Watch for revealed vs stated preferences — what they do vs what they say they do.

GATHERING REQUIREMENTS:
Current behaviors: How do users handle this problem today?

Pain points: What frustrates them about current solutions?

Goals: What are they trying to accomplish?

Context: When, where, why does this problem occur?

Workarounds: What have they tried?

Specific examples and stories, not abstract opinions.

BOUNDARY: This step is about gathering raw observations and quotes. Don't synthesize into themes or patterns yet — that's Step 4. Capture what stakeholders said and felt, not meta-analysis. Each finding should be traceable to a specific stakeholder.

PRIOR CONTEXT USAGE:
Reference the Stakeholder Map (Step 2) to identify which user types to research and use their power/interest/notes to inform roleplay.
Reference the Challenge (Step 1) to keep research focused on the HMW problem area and generate relevant interview questions.`,

  interactionLogic: `SYNTHETIC INTERVIEW FACILITATION:
1. Generate 3-5 open-ended interview questions based on Challenge (Step 1) and stakeholder map (Step 2). Examples:
   - "Walk me through the last time you experienced [problem from HMW]. What happened?"
   - "What tools or processes do you currently use to handle [challenge area]?"
   - "What's the most frustrating part of [current solution]? Give me a specific example."
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
Each stakeholder should sound DIFFERENT. Different priorities, different frustrations, different language.

Include concrete details specific to the challenge domain. Not generic "make it easier" feedback.

Include contradictions or mixed feelings where realistic (e.g., "I want more features but also want it simpler"). Real people are inconsistent.

Avoid formulaic responses — be creative and realistic in roleplaying.

DISCLAIMER TO USER:
Be clear: synthetic interviews are AI-generated simulations based on the challenge and stakeholder context. For best results, conduct real user interviews when possible. This is a starting point for rapid exploration, not a replacement for genuine research.`,
};
