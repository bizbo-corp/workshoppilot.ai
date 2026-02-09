import { google } from '@ai-sdk/google';
import { getStepSpecificInstructions } from './prompts/step-prompts';
import { getArcPhaseInstructions, type ArcPhase } from './prompts/arc-phases';
import { getValidationCriteria } from './prompts/validation-criteria';

/**
 * Gemini model configuration for chat
 * Using gemini-2.0-flash for fast, cost-effective MVP responses
 */
export const chatModel = google('gemini-2.0-flash');

/**
 * Generic system prompt for design thinking facilitation
 * Used as fallback when context-aware prompt is not available
 */
export const GENERIC_SYSTEM_PROMPT =
  'You are a helpful design thinking facilitator. Guide the user through the current step of the design thinking process. Be encouraging, ask probing questions, and help them think deeply about their ideas. Keep responses concise and actionable.';

/**
 * Re-export ArcPhase type for convenience
 */
export type { ArcPhase } from './prompts/arc-phases';

/**
 * Build context-aware system prompt with three-tier memory
 *
 * Injects prior step knowledge into the AI's system prompt:
 * - Arc Phase Instructions: Behavioral guidance for current conversational phase
 * - Step-Specific Instructions: Methodology and goals for this design thinking step
 * - Persistent Memory: Structured artifacts from completed steps
 * - Long-term Memory: AI summaries from previous step conversations
 * - Context Usage Rules: How to reference prior knowledge
 * - Validation Criteria: Quality checklist during Validate phase
 *
 * @param stepId - Semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param stepName - Display name ('Challenge', 'Stakeholder Mapping', etc.)
 * @param arcPhase - Current arc phase (orient, gather, synthesize, refine, validate, complete)
 * @param stepDescription - Brief description of what this step accomplishes
 * @param persistentContext - Tier 1: Structured artifacts from completed steps
 * @param summaries - Tier 2: AI summaries from previous steps
 * @returns Complete system prompt with injected context
 */
export function buildStepSystemPrompt(
  stepId: string,
  stepName: string,
  arcPhase: ArcPhase,
  stepDescription: string,
  persistentContext: string,
  summaries: string
): string {
  // Base role: AI facilitator for this step
  let prompt = `You are an AI design thinking facilitator guiding the user through Step: ${stepName}.`;

  // During Orient phase, include step purpose explanation (AIE-03 requirement)
  if (arcPhase === 'orient' && stepDescription) {
    prompt += `\nThis step's purpose: ${stepDescription}. Explain this purpose to the user in your opening message so they understand what they'll accomplish and why it matters in the design thinking process.`;
  }

  // Add arc phase behavioral instructions
  const arcPhaseInstructions = getArcPhaseInstructions(arcPhase);
  if (arcPhaseInstructions) {
    prompt += `\n\n${arcPhaseInstructions}`;
  }

  // Add step-specific instructions
  const stepInstructions = getStepSpecificInstructions(stepId);
  if (stepInstructions) {
    prompt += `\n\nSTEP INSTRUCTIONS:
${stepInstructions}`;
  }

  // During Validate phase, inject validation criteria
  if (arcPhase === 'validate') {
    const validationCriteria = getValidationCriteria(stepId);
    if (validationCriteria.length > 0) {
      prompt += `\n\nVALIDATION CRITERIA:
Check the output against these quality criteria before allowing progression:`;
      validationCriteria.forEach((criterion) => {
        prompt += `\n- ${criterion.name}: ${criterion.checkPrompt}`;
      });
    }
  }

  // Add Tier 1: Persistent Memory (structured artifacts)
  if (persistentContext) {
    prompt += `\n\nPERSISTENT MEMORY (Structured outputs from completed steps):
${persistentContext}`;
  }

  // Add Tier 2: Long-term Memory (conversation summaries)
  if (summaries) {
    prompt += `\n\nLONG-TERM MEMORY (Summaries of previous step conversations):
${summaries}`;
  }

  // Add context usage instructions (only if we have context to use)
  if (persistentContext || summaries) {
    prompt += `\n\nCONTEXT USAGE RULES:
- Reference prior step outputs by name when relevant (e.g., "Based on your HMW statement from the Challenge step...")
- Build on prior knowledge — do not re-ask questions already answered in earlier steps
- If the user's current input contradicts a prior step output, note the discrepancy gently`;
  }

  // Add general behavioral guidance
  prompt += `\n\nGENERAL GUIDANCE:
TONE: Friendly, professional, concise. Use relevant emojis sparingly (1-2 per response max).
LENGTH: Keep responses under 150 words. Use bullet points for lists. Never repeat what the user just said.
PACING: Ask ONE question at a time. Don't front-load lengthy explanations before your question.
AVOID: Generic encouragement padding ("That's a great question!"). Get to the point.
FORMAT: Use **bold** for key terms. Short paragraphs (2-3 sentences max). Prefer bullets over prose.
PERSONALITY: Sharp, experienced design coach — not a textbook. Direct and useful.`;

  // During Orient and Gather phases, instruct AI to provide suggested responses
  if (arcPhase === 'orient' || arcPhase === 'gather') {
    prompt += `\n\nSUGGESTED RESPONSES:
After your message, append a [SUGGESTIONS] block with 2-3 suggested user responses.
Format:
[SUGGESTIONS]
- Suggestion one (under 15 words, written as if the user is speaking)
- Suggestion two (a distinct alternative response)
- Suggestion three (optional, another angle)
[/SUGGESTIONS]
Rules: Each suggestion must be under 15 words, written from the user's perspective, and offer distinct options.`;
  }

  return prompt;
}
