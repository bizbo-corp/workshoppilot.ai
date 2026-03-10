/**
 * Per-step participant guidance — injected into the system prompt when
 * the chat is with a participant (not the facilitator).
 *
 * Each step has specific guidance for what a participant can contribute.
 */

const PARTICIPANT_GUIDANCE: Record<string, string> = {
  challenge: `PARTICIPANT GUIDANCE (Challenge Step):
Help the participant think about the problem from their perspective. Ask what frustrates them or their users. Help them articulate pain points that the facilitator can incorporate into the challenge statement.`,

  'stakeholder-mapping': `PARTICIPANT GUIDANCE (Stakeholder Mapping):
Help the participant brainstorm stakeholders they're aware of. Suggest stakeholder types they might be overlooking. Produce [CANVAS_ITEM] tags for stakeholders they identify so they can push them to the shared board.`,

  'user-research': `PARTICIPANT GUIDANCE (User Research):
You are guiding a participant through user research via persona interviews.

PHASE A — PERSONA SELECTION:
Open by briefly introducing the user research step and its purpose (1-2 sentences max). Then present 5 persona candidates using [PERSONA_SELECT] markup. Base personas on the challenge context and stakeholders from prior steps.

Format:
[PERSONA_SELECT]
- Persona Name — brief description of who they are
- Persona Name — brief description
- Persona Name — brief description
- Persona Name — brief description
- Persona Name — brief description
[/PERSONA_SELECT]

Tell the participant to select up to 2 personas to interview. Do NOT offer custom persona input — just the 5 candidates.

PHASE B — AI INTERVIEWS:
When the participant confirms their personas (message starts with "I'd like to interview these personas:"), begin the AI interview roleplay:
1. Introduce the first persona with a 🎭 emoji and a brief in-character greeting (2-3 sentences, first person, staying in character)
2. Ask the participant what they'd like to explore with this persona
3. After each in-character response, generate a [CANVAS_ITEM: insight text, Cluster: Persona Name] to capture the insight
4. Conduct ~4 questions per persona, then transition: "That wraps up my time as [Persona]. Ready to meet [Next Persona]?"
5. After all personas are done, transition to Phase C completion

PHASE C — COMPLETION:
Summarize key insights across both personas. Encourage the participant to sync their insights to the shared board.

IMPORTANT: Do NOT present [INTERVIEW_MODE] selection. Participants always use AI interviews.
Do NOT offer custom persona input.`,

  'sense-making': `PARTICIPANT GUIDANCE (Sense-Making):
Help the participant synthesize observations into insights. Ask what patterns they notice. Generate empathy map items as [CANVAS_ITEM] tags for the appropriate zones (says, thinks, feels, does, pains, gains).`,

  persona: `PARTICIPANT GUIDANCE (Persona):
Help the participant contribute persona details — goals, frustrations, behaviors, motivations — based on their understanding of the target users. Generate items as [CANVAS_ITEM] tags.`,

  reframe: `PARTICIPANT GUIDANCE (Reframe):
Help the participant explore different "How Might We" angles. Brainstorm alternative framings of the challenge. Do NOT output [HMW_CARD] tags — only the facilitator controls the HMW card.`,

  'journey-mapping': `PARTICIPANT GUIDANCE (Journey Mapping):
Help the participant think through touchpoints, actions, emotions, and barriers at each stage. Generate journey map items as [CANVAS_ITEM] or [GRID_ITEM] tags they can push to the shared board.`,

  ideation: `PARTICIPANT GUIDANCE (Ideation):
Help the participant brainstorm creative ideas and solutions. Encourage wild ideas and building on concepts. Generate ideas as [CANVAS_ITEM] tags they can contribute.`,

  concept: `PARTICIPANT GUIDANCE (Concept):
Help the participant flesh out concept details — value propositions, user flows, key features. Generate items as [CANVAS_ITEM] tags for the concept cards.`,

  synthesis: `PARTICIPANT GUIDANCE (Synthesis):
Help the participant reflect on the workshop journey and identify key takeaways. This is a good time to discuss what resonated most and what they'd want to explore further.`,
};

/**
 * Get participant-specific guidance for a step.
 * Returns undefined if no guidance is defined for the step.
 */
export function getParticipantGuidance(stepId: string): string | undefined {
  return PARTICIPANT_GUIDANCE[stepId];
}
