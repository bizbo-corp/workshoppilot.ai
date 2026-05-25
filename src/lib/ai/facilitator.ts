/**
 * Canonical identity for the AI workshop facilitator.
 *
 * Mirrors the greeting persona defined in the step 1 prompt
 * (`src/lib/ai/prompts/steps/01_challenge.ts`) so the chat header/avatar
 * stays in sync with how the facilitator introduces itself.
 *
 * NOTE: the greeting prompt is regression-critical (see DEFENSIVE_PATTERNS.md).
 * If you change the name/emoji here, update the prompt example to match —
 * don't rewire the greeting flow.
 */
export const FACILITATOR = {
  name: 'Wanda',
  emoji: '🦸‍♀️',
} as const;
