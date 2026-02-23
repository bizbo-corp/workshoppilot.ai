import type { PostItColor } from '@/stores/canvas-store';

/**
 * Template Post-It Definition
 * Defines a pre-placed post-it card with placeholder text that the AI can target by key.
 */
export type TemplatePostItDefinition = {
  key: string;              // AI targeting key (e.g., 'idea', 'problem')
  label: string;            // Persistent header label (e.g., 'The Idea')
  placeholderText: string;  // Placeholder shown when text is empty
  color: PostItColor;       // Post-it color
  position: { x: number; y: number };
  width: number;
  height: number;
};

/**
 * Step-keyed template post-it configurations.
 * To add template post-its to a new step, add an entry here + corresponding AI prompt instructions.
 */
const STEP_TEMPLATE_POSTITS: Record<string, TemplatePostItDefinition[]> = {
  challenge: [
    {
      key: 'idea',
      label: 'The Idea',
      placeholderText: "What's the idea or opportunity you want to explore?",
      color: 'yellow',
      position: { x: 0, y: 0 },
      width: 220,
      height: 160,
    },
    {
      key: 'problem',
      label: 'The Problem',
      placeholderText: 'What underlying problem or tension exists?',
      color: 'pink',
      position: { x: 260, y: 0 },
      width: 220,
      height: 160,
    },
    {
      key: 'audience',
      label: 'The Audience',
      placeholderText: 'Who experiences this problem most acutely?',
      color: 'blue',
      position: { x: 0, y: 200 },
      width: 220,
      height: 160,
    },
    {
      key: 'challenge-statement',
      label: 'Challenge Statement',
      placeholderText: 'How might we...?',
      color: 'green',
      position: { x: 260, y: 200 },
      width: 220,
      height: 160,
    },
  ],
};

/**
 * Get template post-it definitions for a given step.
 * Returns empty array for steps without template configurations.
 */
export function getStepTemplatePostIts(stepId: string): TemplatePostItDefinition[] {
  return STEP_TEMPLATE_POSTITS[stepId] || [];
}
