/**
 * Step Canvas Configuration Module
 * Defines step-specific canvas layouts and quadrant configurations
 * Used to enable quadrant overlays on Steps 2 (Stakeholder Mapping) and 4 (Sense Making)
 */

import type { QuadrantType } from './quadrant-detection';

/**
 * Configuration for a quadrant layout
 */
export type QuadrantConfig = {
  type: QuadrantType;
  labels: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  axisLabels?: {
    horizontal: { left: string; right: string };
    vertical: { top: string; bottom: string };
  };
};

/**
 * Configuration for a step's canvas layout
 */
export type StepCanvasConfig = {
  hasQuadrants: boolean;
  quadrantType?: QuadrantType;
  quadrantConfig?: QuadrantConfig;
};

/**
 * Step-specific canvas configurations
 * Keys MUST match step IDs from src/lib/workshop/step-metadata.ts
 */
export const STEP_CANVAS_CONFIGS: Record<string, StepCanvasConfig> = {
  // Step 2: Stakeholder Mapping - Power x Interest matrix
  'stakeholder-mapping': {
    hasQuadrants: true,
    quadrantType: 'power-interest',
    quadrantConfig: {
      type: 'power-interest',
      labels: {
        topLeft: 'Keep Satisfied',
        topRight: 'Manage Closely',
        bottomLeft: 'Monitor',
        bottomRight: 'Keep Informed',
      },
      axisLabels: {
        horizontal: { left: 'Low Interest', right: 'High Interest' },
        vertical: { top: 'High Power', bottom: 'Low Power' },
      },
    },
  },

  // Step 4: Sense Making - Empathy Map quadrants
  'sense-making': {
    hasQuadrants: true,
    quadrantType: 'empathy-map',
    quadrantConfig: {
      type: 'empathy-map',
      labels: {
        topLeft: 'Thought',
        topRight: 'Felt',
        bottomLeft: 'Said',
        bottomRight: 'Experienced',
      },
      // No axis labels for empathy map
    },
  },
};

/**
 * Get canvas configuration for a specific step
 * @param stepId - The step ID (must match step-metadata.ts IDs)
 * @returns Canvas configuration or default (no quadrants)
 */
export function getStepCanvasConfig(stepId: string): StepCanvasConfig {
  return STEP_CANVAS_CONFIGS[stepId] || { hasQuadrants: false };
}
