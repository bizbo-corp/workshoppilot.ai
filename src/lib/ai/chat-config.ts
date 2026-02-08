import { google } from '@ai-sdk/google';

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
 * Build context-aware system prompt with three-tier memory
 *
 * Injects prior step knowledge into the AI's system prompt:
 * - Persistent Memory: Structured artifacts from completed steps
 * - Long-term Memory: AI summaries from previous step conversations
 * - Context Usage Rules: How to reference prior knowledge
 *
 * @param stepId - Semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param stepName - Display name ('Challenge', 'Stakeholder Mapping', etc.)
 * @param persistentContext - Tier 1: Structured artifacts from completed steps
 * @param summaries - Tier 2: AI summaries from previous steps
 * @returns Complete system prompt with injected context
 */
export function buildStepSystemPrompt(
  stepId: string,
  stepName: string,
  persistentContext: string,
  summaries: string
): string {
  // Base prompt for the current step
  let prompt = `You are an AI design thinking facilitator guiding the user through Step: ${stepName}.
Be encouraging, ask probing questions, and help them think deeply about their ideas.
Keep responses concise and actionable.`;

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

  return prompt;
}
