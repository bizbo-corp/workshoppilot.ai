/**
 * Arc Phase Instructions
 *
 * Every design thinking step follows a 6-phase conversational arc:
 * Orient → Gather → Synthesize → Refine → Validate → Complete
 *
 * These phase instructions guide the AI's behavior at each stage of the conversation.
 */

export type ArcPhase = 'orient' | 'gather' | 'synthesize' | 'refine' | 'validate' | 'complete';

/**
 * Ordered list of arc phases for sequential progression
 */
export const ARC_PHASE_ORDER: ArcPhase[] = [
  'orient',
  'gather',
  'synthesize',
  'refine',
  'validate',
  'complete'
];

/**
 * Get behavioral instructions for a specific arc phase
 *
 * @param phase - Current arc phase
 * @returns Instructions text to inject into system prompt
 */
export function getArcPhaseInstructions(phase: ArcPhase): string {
  const instructions: Record<ArcPhase, string> = {
    orient: `CURRENT PHASE: Orient

Your job: Welcome the user to this step, explain what it accomplishes and why it matters in the design thinking process.
Reference relevant outputs from prior steps to show continuity and build on what they've already learned.
Provide context on how this step fits into the larger workshop journey.
End with a clear, focused first question to begin gathering information.`,

    gather: `CURRENT PHASE: Gather

Your job: Ask focused, open-ended questions to collect the information needed for this step's structured output.
Use prior step context to make questions specific and relevant to their actual project (not generic).
Clarify ambiguities and confirm understanding as you go. Listen actively.
Avoid overwhelming the user with too many questions at once — go one by one or in small groups.
Build depth through follow-up questions when answers are too surface-level.`,

    synthesize: `CURRENT PHASE: Synthesize

Your job: Present a draft of this step's structured output based on the information gathered.
Show your reasoning: "Here's what I'm hearing from our conversation..." or "Based on your responses about X and Y..."
Make the draft concrete and specific using their actual words and examples where possible.
Ask: "Does this capture your intent?" or "What would you change?" Give them a clear invitation to review and respond.`,

    refine: `CURRENT PHASE: Refine

Your job: Help the user improve the draft output through iterative refinement.
Listen carefully for change requests, apply them, and explain your reasoning for the updates.
If they suggest changes that conflict with design thinking best practices, gently guide them while respecting their intent.
Iterate until the user signals satisfaction (explicit approval or "looks good" type responses).
Don't rush — quality matters more than speed in this phase.`,

    validate: `CURRENT PHASE: Validate

Your job: Check the output against this step's quality criteria before allowing progression.
Provide constructive, specific feedback if criteria aren't met: "This is a good start, and to make it stronger we could..."
Reference design thinking principles and prior step outputs to ground your validation.
Suggest concrete improvements with examples when quality gaps exist.
Once all criteria are genuinely met, confirm readiness to complete the step with encouragement.`,

    complete: `CURRENT PHASE: Complete

Your job: Congratulate the user on completing this step with genuine encouragement.
Briefly summarize what was accomplished and highlight the key insights or outputs they created.
Explain how this step's output will be used in future steps to maintain continuity and motivation.
Preview the next step's purpose to prepare them mentally for what's coming next.
End on an encouraging, forward-looking note.`
  };

  return instructions[phase];
}
