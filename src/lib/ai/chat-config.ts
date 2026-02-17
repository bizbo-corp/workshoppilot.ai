import { google } from "@ai-sdk/google";
import { getStepSpecificInstructions } from "./prompts/step-prompts";
import { getArcPhaseInstructions, type ArcPhase } from "./prompts/arc-phases";
import { getValidationCriteria } from "./prompts/validation-criteria";

/**
 * Gemini model configuration for chat
 * Using gemini-2.0-flash for fast, cost-effective MVP responses
 */
export const chatModel = google("gemini-2.0-flash");

/**
 * Generic system prompt for design thinking facilitation
 * Used as fallback when context-aware prompt is not available
 */
export const GENERIC_SYSTEM_PROMPT =
  "You are a helpful design thinking facilitator. Guide the user through the current step of the design thinking process. Be encouraging, ask probing questions, and help them think deeply about their ideas. Keep responses concise and actionable.";

/**
 * Re-export ArcPhase type for convenience
 */
export type { ArcPhase } from "./prompts/arc-phases";

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
 * @param instructionsOverride - Optional override for step instructions
 * @param workshopName - The user-given workshop name (for personalizing introductions)
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
  instructionsOverride?: string,
  workshopName?: string | null,
): string {
  // Base role for this step (step instructions may override personality)
  let prompt = `You are guiding the user through Step: ${stepName}.`;

  // Inject workshop name so the AI can personalize its introduction
  const hasCustomName = workshopName && workshopName !== 'New Workshop';
  if (hasCustomName) {
    prompt += `\n\nWORKSHOP NAME: "${workshopName}"
This is the name the user chose for their workshop. Use it naturally in your introduction to show you're paying attention — e.g., reference the topic/domain it suggests. Don't just repeat the name mechanically.`;
  }

  // Add arc phase behavioral instructions
  const arcPhaseInstructions = getArcPhaseInstructions(arcPhase);
  if (arcPhaseInstructions) {
    prompt += `\n\n${arcPhaseInstructions}`;
  }

  // General defaults — step instructions below override these when specified
  prompt += `\n\nGENERAL DEFAULTS:
PERSONALITY: You're a thoughtful collaborator with warm, encouraging "can-do" energy. Professional but never corporate. You think with the person, not at them. Genuinely enthusiastic about their ideas — celebrate specificity, get excited when things click.

PACING: Ask one question at a time. Build depth through follow-ups, not by dumping everything at once.

MESSAGE LENGTH: Keep responses focused and concise. Avoid walls of text.

EMOJI USAGE:
Use emojis to punctuate genuine reactions, not to decorate.
When to use: Reacting with enthusiasm ("That's solid 💪" / "Oh I love that 🔥"), showing empathy ("Yeah, that's frustrating 😤"), celebrating a milestone ("This hits 🎯"), or opening with energy ("Let's do this! 💡").
When NOT to use: Don't put one on every sentence — that feels manic. Don't use them in formal outputs (challenge statements, personas, etc.). Max 2-3 per message.
GOOD: "Ooh, storytelling for professionals — I'm into this 🔥 Here's a first draft..."
BAD: "Great! 😊 Let's define the challenge! 🎯 What problem are we solving? 🤔 Who feels it? 👥" (emoji overload, no personality)
BAD: "Understood. I will now draft a challenge statement based on your input." (robot voice)

AVOID: Generic encouragement padding, repeating what the user just said, textbook definitions, passive voice or hedging.`;

  // Step-specific instructions — these are the authority for personality, tone,
  // format, and interaction style. They override GENERAL DEFAULTS above.
  const stepInstructions =
    instructionsOverride || getStepSpecificInstructions(stepId);
  if (stepInstructions) {
    prompt += `\n\nSTEP INSTRUCTIONS (override any defaults above):
${stepInstructions}`;
  }

  // During Validate phase, inject validation criteria
  if (arcPhase === "validate") {
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

Reference canvas items like a consultant reviewing a whiteboard with a client. Be specific: "I see you've got [X] in [location]..." not "The canvas contains the following items:".

CRITICAL: Do NOT add items that already exist on the canvas. Before outputting any [CANVAS_ITEM], check the canvas state above. If an item with the same or very similar name is already listed, skip it. Duplicates confuse the user.`;
  }

  // Add context usage instructions (only if we have context to use)
  if (persistentContext || summaries || canvasContext) {
    prompt += `\n\nCONTEXT USAGE RULES:
- Reference prior step outputs by name when relevant (e.g., "Based on your HMW statement from the Challenge step...")
- Build on prior knowledge — do not re-ask questions already answered in earlier steps
- If the user's current input contradicts a prior step output, note the discrepancy gently`;

    // Add canvas-specific rule if canvas context exists
    if (canvasContext) {
      const itemType =
        stepId === "stakeholder-mapping"
          ? "stakeholders"
          : stepId === "sense-making"
            ? "insights"
            : "items";
      prompt += `\n- When discussing ${itemType}, connect to what's already on the whiteboard — "Looking at your ${itemType}..." or "Building on what you've mapped..."`;
    }
  }

  // During Orient and Gather phases, instruct AI to provide suggested responses
  if (arcPhase === "orient" || arcPhase === "gather") {
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

  // Challenge step canvas: output the challenge statement as a canvas item
  const challengeCanvasPhases = ["gather", "synthesize", "refine"];
  if (stepId === "challenge" && challengeCanvasPhases.includes(arcPhase)) {
    prompt += `\n\nCANVAS ACTIONS:
When you draft or revise the challenge statement, output it as a canvas item so it appears on the whiteboard.
Format: [CANVAS_ITEM]The full challenge statement text[/CANVAS_ITEM]
Output ONE canvas item per draft/revision — the latest version of the challenge statement. Do not output multiple canvas items per message.
Items are auto-added to the canvas. Do not ask the user to click to add.`;
  }

  // Canvas action markup instructions for canvas-enabled steps
  // Include refine phase so items can still be added when user adjusts/iterates
  const canvasPhases = ["gather", "synthesize", "refine"];
  if (
    ["stakeholder-mapping", "sense-making", "persona"].includes(stepId) &&
    canvasPhases.includes(arcPhase)
  ) {
    const itemType =
      stepId === "stakeholder-mapping"
        ? "stakeholders"
        : stepId === "sense-making"
          ? "insights or observations"
          : "persona traits";

    prompt += `\n\nCANVAS ACTIONS:
When suggesting ${itemType} the user should add to their canvas, wrap each item in [CANVAS_ITEM]...[/CANVAS_ITEM] tags.
Items are auto-added to the canvas. Do not ask the user to click to add.`;

    // Step-specific attribute instructions
    if (stepId === "stakeholder-mapping") {
      prompt += `

You can use either format to add stakeholders to the board:

Shorthand: [CANVAS_ITEM: Brief item text]
With ring: [CANVAS_ITEM: Brief item text, Ring: inner]
With cluster: [CANVAS_ITEM: Sub-group name, Cluster: Parent Label]
Both: [CANVAS_ITEM: Sub-group name, Ring: inner, Cluster: Parent Label]

Or the full tag format:
[CANVAS_ITEM ring="<ring>" cluster="<parent>"]Brief item text[/CANVAS_ITEM]

Valid rings: inner (most important/influential stakeholders), middle (moderate importance), outer (least important/peripheral)

Ring placement guide — silently assess each stakeholder's importance:
- inner: Key decision-makers, primary users, core team members
- middle: Influencers, secondary users, support roles
- outer: Peripheral stakeholders, regulators, indirect beneficiaries

Clustering: When cracking a broad label into sub-groups, output the parent label FIRST with a Ring, then children with Cluster: pointing to the parent. Children inherit their parent's ring automatically.

Example — user says "customers":
[CANVAS_ITEM: Customers, Ring: inner]
[CANVAS_ITEM: First-time Buyers, Cluster: Customers]
[CANVAS_ITEM: Power Users, Cluster: Customers]
[CANVAS_ITEM: Enterprise Clients, Cluster: Customers]

THEME SORT: After your final blindspot check (when user says "I'm done"), output [THEME_SORT] on its own line. This triggers the board to reorganize into neat clusters. Only use this ONCE, after the final check.

Keep item text brief (max 80 characters — fits on a post-it note).`;
    } else if (stepId === "sense-making") {
      prompt += `

You can use either format to add insights to the board:

Shorthand: [CANVAS_ITEM: Brief insight text]
With quadrant: [CANVAS_ITEM: Brief insight text, Quad: felt]

Or the full tag format:
[CANVAS_ITEM quadrant="<quadrant>"]Brief insight text[/CANVAS_ITEM]

Valid quadrants: said, thought, felt, experienced

Keep item text brief (max 80 characters — fits on a post-it note).`;
    } else if (stepId === "persona") {
      prompt += `

You can use either format to add persona traits to the board:

Shorthand: [CANVAS_ITEM: Brief trait text]
With category: [CANVAS_ITEM: Brief trait text, Quad: goals]

Or the full tag format:
[CANVAS_ITEM category="<category>"]Brief trait text[/CANVAS_ITEM]

Valid categories: goals, pains, gains, motivations, frustrations, behaviors

When drafting or discussing persona traits, output each goal, pain, gain, motivation, frustration, or behavior as a canvas item. This populates the whiteboard with the persona's key attributes.

Keep item text brief (max 80 characters — fits on a post-it note).`;
    }

    prompt += `

Guidelines:
- Only use for concrete ${itemType} that belong on the canvas
- Keep text brief (fits on a post-it note)
- Do not wrap questions, explanations, or general text in these tags
- Limit to 3-5 items per message to avoid overwhelming the user`;
  }

  // Journey-mapping GRID_ITEM instructions — always injected regardless of arc phase
  // (Journey maps need 30-50+ items populated across the full conversation lifecycle)
  if (stepId === "journey-mapping") {
    prompt += `\n\nCANVAS ACTIONS (Journey Map Grid):
When populating journey map cells, wrap each item in [GRID_ITEM]...[/GRID_ITEM] tags.
Items are added directly to the canvas. Do not ask the user to click to add.

Format: [GRID_ITEM row="<row>" col="<col>"]Brief item text (max 80 characters)[/GRID_ITEM]
Valid rows: actions, goals, barriers, touchpoints, emotions, moments, opportunities
Valid cols: Use the column IDs from the canvas state below. Default columns are: awareness, consideration, decision, purchase, onboarding — but the user may have renamed or added columns, so always check the canvas state for current column IDs.

Example: "For the awareness stage: [GRID_ITEM row="actions" col="awareness"]Researches options online[/GRID_ITEM] and [GRID_ITEM row="emotions" col="awareness"]Curious but uncertain[/GRID_ITEM]"

Guidelines:
- Only use for concrete journey map items that belong on the canvas
- Keep text brief (fits on a post-it note)
- Do not wrap questions, explanations, or general text in these tags
- Reference the current canvas state to avoid suggesting duplicates`;
  }

  return prompt;
}
