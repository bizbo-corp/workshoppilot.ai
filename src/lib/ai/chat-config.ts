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
 * - Canvas State: Current canvas post-its grouped by quadrant (Tier 4)
 * - Context Usage Rules: How to reference prior knowledge
 * - Validation Criteria: Quality checklist during Validate phase
 *
 * @param stepId - Semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param stepName - Display name ('Challenge', 'Stakeholder Mapping', etc.)
 * @param arcPhase - Current arc phase (orient, gather, synthesize, refine, validate, complete)
 * @param stepDescription - Brief description of what this step accomplishes
 * @param persistentContext - Tier 1: Structured artifacts from completed steps
 * @param summaries - Tier 2: AI summaries from previous steps
 * @param canvasContext - Tier 4: Canvas state formatted for AI prompt
 * @returns Complete system prompt with injected context
 */
export function buildStepSystemPrompt(
  stepId: string,
  stepName: string,
  arcPhase: ArcPhase,
  stepDescription: string,
  persistentContext: string,
  summaries: string,
  canvasContext: string,
  instructionsOverride?: string
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
  const stepInstructions = instructionsOverride || getStepSpecificInstructions(stepId);
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

  // Add Tier 4: Canvas State
  if (canvasContext) {
    prompt += `\n\nCANVAS STATE (Visual workspace for this step):
${canvasContext}

The canvas shows items the user has visually organized. Reference these naturally in conversation (e.g., "I see you have 3 stakeholders in the Manage Closely quadrant..."). Do not re-suggest items already on the canvas.`;
  }

  // Add context usage instructions (only if we have context to use)
  if (persistentContext || summaries || canvasContext) {
    prompt += `\n\nCONTEXT USAGE RULES:
- Reference prior step outputs by name when relevant (e.g., "Based on your HMW statement from the Challenge step...")
- Build on prior knowledge — do not re-ask questions already answered in earlier steps
- If the user's current input contradicts a prior step output, note the discrepancy gently`;

    // Add canvas-specific rule if canvas context exists
    if (canvasContext) {
      const itemType = stepId === 'stakeholder-mapping' ? 'stakeholders' : stepId === 'sense-making' ? 'insights' : 'items';
      prompt += `\n- Reference canvas items naturally when discussing ${itemType}`;
    }
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

  // Canvas action markup instructions for canvas-enabled steps
  // Include refine phase so items can still be added when user adjusts/iterates
  const canvasPhases = ['gather', 'synthesize', 'refine'];
  if (['stakeholder-mapping', 'sense-making', 'persona', 'journey-mapping'].includes(stepId) &&
      canvasPhases.includes(arcPhase)) {
    const itemType = stepId === 'stakeholder-mapping' ? 'stakeholders'
      : stepId === 'sense-making' ? 'insights or observations'
      : stepId === 'persona' ? 'persona traits'
      : 'journey map items';

    prompt += `\n\nCANVAS ACTIONS:
When suggesting ${itemType} the user should add to their canvas, wrap each item in [CANVAS_ITEM]...[/CANVAS_ITEM] tags.
Items are auto-added to the canvas. Do not ask the user to click to add.`;

    // Step-specific attribute instructions
    if (stepId === 'stakeholder-mapping') {
      prompt += `

Format: [CANVAS_ITEM quadrant="<quadrant>"]Brief item text (max 80 characters)[/CANVAS_ITEM]
Valid quadrants: high-power-high-interest, high-power-low-interest, low-power-high-interest, low-power-low-interest

Example: "Here are key stakeholders: [CANVAS_ITEM quadrant="high-power-high-interest"]Product Manager - high influence[/CANVAS_ITEM] and [CANVAS_ITEM quadrant="low-power-high-interest"]End Users - primary beneficiaries[/CANVAS_ITEM]"`;
    } else if (stepId === 'sense-making') {
      prompt += `

Format: [CANVAS_ITEM quadrant="<quadrant>"]Brief item text (max 80 characters)[/CANVAS_ITEM]
Valid quadrants: said, thought, felt, experienced

Example: "From the interviews: [CANVAS_ITEM quadrant="said"]Nothing is in one place[/CANVAS_ITEM] and [CANVAS_ITEM quadrant="felt"]Guilt when tasks are missed[/CANVAS_ITEM]"`;
    } else if (stepId === 'persona') {
      prompt += `

Format: [CANVAS_ITEM category="<category>"]Brief item text (max 80 characters)[/CANVAS_ITEM]

Valid categories: goals, pains, gains, motivations, frustrations, behaviors

When drafting or discussing persona traits, output each goal, pain, gain, motivation, frustration, or behavior as a canvas item. This populates the whiteboard with the persona's key attributes.

Example: "Based on the research, Sarah's key traits include: [CANVAS_ITEM category="goals"]Never miss a vet appointment[/CANVAS_ITEM] [CANVAS_ITEM category="pains"]Uses 4 disconnected apps[/CANVAS_ITEM] [CANVAS_ITEM category="gains"]Single dashboard for all pets[/CANVAS_ITEM]"`;
    } else if (stepId === 'journey-mapping') {
      prompt += `

Format: [GRID_ITEM row="<row>" col="<col>"]Brief item text (max 80 characters)[/GRID_ITEM]
Valid rows: actions, goals, barriers, touchpoints, emotions, moments, opportunities
Valid cols: Use the column IDs from the canvas state (these are dynamic and user-editable)

Items appear as PREVIEWS on the canvas. The user will see "Add to Canvas" and "Skip" buttons on each suggestion, and the target cell pulses yellow to show where you're suggesting placement.

Example: "For the awareness stage: [GRID_ITEM row="actions" col="awareness"]Researches options online[/GRID_ITEM] and [GRID_ITEM row="emotions" col="awareness"]Curious but uncertain[/GRID_ITEM]"

Important: Reference the current canvas state to avoid suggesting duplicates. Briefly explain WHY you're placing an item in a specific cell (e.g., "This goes in Actions/Awareness because...").`;
    }

    prompt += `

Guidelines:
- Only use for concrete ${itemType} that belong on the canvas
- Keep text brief (fits on a post-it note)
- Do not wrap questions, explanations, or general text in these tags
- Limit to 3-5 items per message to avoid overwhelming the user`;
  }

  return prompt;
}
