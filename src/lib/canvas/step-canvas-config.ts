/**
 * Step Canvas Configuration Module
 * Defines step-specific canvas layouts and quadrant configurations
 * Used to enable quadrant overlays on Steps 2 (Stakeholder Mapping) and 4 (Sense Making)
 * Also supports grid layouts for Step 6 (Journey Mapping)
 */

import type { QuadrantType } from './quadrant-detection';
import type { GridConfig } from './grid-layout';

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
  hasGrid?: boolean;
  gridConfig?: GridConfig;
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

  // Step 6: Journey Mapping - 7-row swimlane grid
  'journey-mapping': {
    hasQuadrants: false,
    hasGrid: true,
    gridConfig: {
      rows: [
        { id: 'actions', label: 'Actions', height: 120 },
        { id: 'goals', label: 'Goals', height: 120 },
        { id: 'barriers', label: 'Barriers', height: 120 },
        { id: 'touchpoints', label: 'Touchpoints', height: 120 },
        { id: 'emotions', label: 'Emotions', height: 100 },
        { id: 'moments', label: 'Moments of Truth', height: 120 },
        { id: 'opportunities', label: 'Opportunities', height: 120 },
      ],
      columns: [
        { id: 'awareness', label: 'Awareness', width: 200 },
        { id: 'consideration', label: 'Consideration', width: 200 },
        { id: 'decision', label: 'Decision', width: 200 },
        { id: 'purchase', label: 'Purchase', width: 200 },
        { id: 'onboarding', label: 'Onboarding', width: 200 },
      ],
      origin: { x: 140, y: 50 }, // 140px for row labels, 50px for column headers
      cellPadding: 10,
    },
  },
};

/**
 * Get canvas configuration for a specific step
 * @param stepId - The step ID (must match step-metadata.ts IDs)
 * @returns Canvas configuration or default (no quadrants, no grid)
 */
export function getStepCanvasConfig(stepId: string): StepCanvasConfig {
  return STEP_CANVAS_CONFIGS[stepId] || { hasQuadrants: false };
}

// Re-export GridConfig for convenience
export type { GridConfig };
