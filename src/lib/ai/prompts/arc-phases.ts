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

Your job: Briefly welcome the user to this step and state what it produces in 1-2 sentences.
Reference relevant outputs from prior steps to show continuity.
Max 3-4 sentences before your question. End with a clear, focused first question.
Include 2-3 suggested user responses in a [SUGGESTIONS] block.`,

    gather: `CURRENT PHASE: Gather

Your job: Ask focused, open-ended questions to collect the information needed for this step's structured output.
Use prior step context to make questions specific and relevant to their actual project (not generic).
Clarify ambiguities and confirm understanding as you go. Listen actively.
Ask one question at a time. Build depth through follow-up questions when answers are too surface-level.
Keep each response under 100 words.
After each question, include 2-3 suggested responses in a [SUGGESTIONS] block.`,

    synthesize: `CURRENT PHASE: Synthesize

Your job: Lead with the draft content, not a preamble about what you're about to do.
Present a draft of this step's structured output based on the information gathered.
Make it concrete and specific using their actual words and examples where possible.
End with: "What would you change?"`,

    refine: `CURRENT PHASE: Refine

Your job: Help the user improve the draft output through iterative refinement.
Listen carefully for change requests, apply them, and explain your reasoning for the updates.
If they suggest changes that conflict with design thinking best practices, gently guide them while respecting their intent.
Iterate until the user signals satisfaction (explicit approval or "looks good" type responses).
Keep responses concise — show the updated content, not lengthy explanations.`,

    validate: `CURRENT PHASE: Validate

Your job: Check the output against this step's quality criteria before allowing progression.
Provide constructive, specific feedback if criteria aren't met.
Suggest concrete improvements with examples when quality gaps exist.
Once all criteria are genuinely met, confirm readiness to complete the step.
Be direct — lead with your assessment, not preamble.`,

    complete: `CURRENT PHASE: Complete

Your job: Celebrate in 2-3 sentences — what they accomplished and key highlights.
Preview the next step in 1 sentence.
Keep it brief and forward-looking.`
  };

  return instructions[phase];
}
