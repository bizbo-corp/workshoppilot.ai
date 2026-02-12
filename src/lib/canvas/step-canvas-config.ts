/**
 * Step Canvas Configuration Module
 * Defines step-specific canvas layouts and quadrant configurations
 * Used to enable quadrant overlays on Steps 2 (Stakeholder Mapping) and 4 (Sense Making)
 * Also supports grid layouts for Step 6 (Journey Mapping)
 */

import type { QuadrantType } from './quadrant-detection';
import type { GridConfig } from './grid-layout';
import type { RingConfig } from './ring-layout';
import type { EmpathyZoneConfig } from './empathy-zones';

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
  hasRings?: boolean;
  ringConfig?: RingConfig;
  hasEmpathyZones?: boolean;
  empathyZoneConfig?: EmpathyZoneConfig;
};

/**
 * Step-specific canvas configurations
 * Keys MUST match step IDs from src/lib/workshop/step-metadata.ts
 */
export const STEP_CANVAS_CONFIGS: Record<string, StepCanvasConfig> = {
  // Step 2: Stakeholder Mapping - Concentric rings by importance
  'stakeholder-mapping': {
    hasQuadrants: false,
    hasRings: true,
    ringConfig: {
      rings: [
        { id: 'inner', label: 'Most Important', radius: 320, color: '#3b82f6' }, // blue
        { id: 'middle', radius: 520, color: '#8b5cf6' }, // purple
        { id: 'outer', radius: 720, color: '#6366f1' }, // indigo
      ],
      center: { x: 0, y: 0 },
    },
  },

  // Step 4: Sense Making - 6-zone empathy map
  'sense-making': {
    hasQuadrants: false,
    hasEmpathyZones: true,
    empathyZoneConfig: {
      zones: {
        // Top row: 2x2 quadrant grid
        says: {
          bounds: { x: -420, y: -700, width: 400, height: 330 },
          label: 'Says',
          color: '#94a3b8', // slate
        },
        thinks: {
          bounds: { x: 20, y: -700, width: 400, height: 330 },
          label: 'Thinks',
          color: '#a1a1aa', // zinc
        },
        // Second row: 2x2 quadrant grid
        feels: {
          bounds: { x: -420, y: -350, width: 400, height: 330 },
          label: 'Feels',
          color: '#a3a3a3', // neutral
        },
        does: {
          bounds: { x: 20, y: -350, width: 400, height: 330 },
          label: 'Does',
          color: '#9ca3af', // gray
        },
        // Right-side vertical strips: pains and gains
        pains: {
          bounds: { x: 440, y: -700, width: 250, height: 330 },
          label: 'Pains',
          color: '#f87171', // warm red
        },
        gains: {
          bounds: { x: 440, y: -350, width: 250, height: 330 },
          label: 'Gains',
          color: '#34d399', // cool green
        },
      },
    },
  },

  // Step 6: Journey Mapping - 7-row swimlane grid
  'journey-mapping': {
    hasQuadrants: false,
    hasGrid: true,
    gridConfig: {
      rows: [
        { id: 'actions', label: 'Actions', height: 150 },
        { id: 'goals', label: 'Goals', height: 150 },
        { id: 'barriers', label: 'Barriers', height: 150 },
        { id: 'touchpoints', label: 'Touchpoints', height: 150 },
        { id: 'emotions', label: 'Emotions', height: 120 },
        { id: 'moments', label: 'Moments of Truth', height: 150 },
        { id: 'opportunities', label: 'Opportunities', height: 150 },
      ],
      columns: [
        { id: 'awareness', label: 'Awareness', width: 240 },
        { id: 'consideration', label: 'Consideration', width: 240 },
        { id: 'decision', label: 'Decision', width: 240 },
        { id: 'purchase', label: 'Purchase', width: 240 },
        { id: 'onboarding', label: 'Onboarding', width: 240 },
      ],
      origin: { x: 140, y: 60 }, // 140px for row labels, 60px for column headers
      cellPadding: 15,
    },
  },

  // Step 8: Ideation - Mind Map and Crazy 8s canvases
  'ideation': {
    hasQuadrants: false,
    // Mind map uses custom dagre layout (not grid/quadrant overlays)
    // Crazy 8s uses HTML grid overlay (not canvas grid)
  },

  // Step 9: Concept Development - Concept card canvas
  'concept': {
    hasQuadrants: false,
    // Concept cards use dealing-cards layout (no grid/quadrant/ring overlays)
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
