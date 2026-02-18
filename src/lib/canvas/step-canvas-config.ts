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
  // Step 1: Challenge - Simple freeform canvas for the challenge statement
  'challenge': {
    hasQuadrants: false,
  },

  // Step 2: Stakeholder Mapping - Concentric rings by importance
  'stakeholder-mapping': {
    hasQuadrants: false,
    hasRings: true,
    ringConfig: {
      rings: [
        { id: 'inner', label: 'Most Important', radius: 480, color: '#6b7f4e' }, // sage-dark
        { id: 'middle', radius: 780, color: '#8a9a5b' }, // olive
        { id: 'outer', radius: 1080, color: '#a3b18a' }, // sage-light
      ],
      center: { x: 0, y: 0 },
    },
  },

  // Step 3: User Research - Freeform canvas for synthetic interview insights
  'user-research': {
    hasQuadrants: false,
  },

  // Step 4: Sense Making - 6-zone empathy map (sage palette)
  'sense-making': {
    hasQuadrants: false,
    hasEmpathyZones: true,
    empathyZoneConfig: {
      zones: {
        // Top row: 2x2 quadrant grid
        says: {
          bounds: { x: -560, y: -860, width: 520, height: 420 },
          label: 'Says',
          color: '#8a9a5b', // olive
        },
        thinks: {
          bounds: { x: -20, y: -860, width: 520, height: 420 },
          label: 'Thinks',
          color: '#a3b18a', // sage-light
        },
        // Bottom row: 2x2 quadrant grid
        feels: {
          bounds: { x: -560, y: -420, width: 520, height: 420 },
          label: 'Feels',
          color: '#6b7f4e', // sage-dark
        },
        does: {
          bounds: { x: -20, y: -420, width: 520, height: 420 },
          label: 'Does',
          color: '#95a873', // medium sage
        },
        // Right-side vertical strips: pains and gains
        pains: {
          bounds: { x: 520, y: -860, width: 340, height: 420 },
          label: 'Pains',
          color: '#c4856b', // warm terracotta-sage
        },
        gains: {
          bounds: { x: 520, y: -420, width: 340, height: 420 },
          label: 'Gains',
          color: '#6b9a7a', // cool sage-teal
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
        { id: 'actions', label: 'Actions', height: 170 },
        { id: 'goals', label: 'Goals', height: 170 },
        { id: 'barriers', label: 'Barriers', height: 170 },
        { id: 'touchpoints', label: 'Touchpoints', height: 170 },
        { id: 'emotions', label: 'Emotions', height: 140 },
        { id: 'moments', label: 'Moments of Truth', height: 170 },
        { id: 'opportunities', label: 'Opportunities', height: 170 },
      ],
      columns: [
        { id: 'stage-1', label: 'Stage 1', width: 240 },
        { id: 'stage-2', label: 'Stage 2', width: 240 },
        { id: 'stage-3', label: 'Stage 3', width: 240 },
        { id: 'stage-4', label: 'Stage 4', width: 240 },
        { id: 'stage-5', label: 'Stage 5', width: 240 },
      ],
      origin: { x: 160, y: 60 }, // 160px for row labels, 60px for column headers
      cellPadding: 12,
    },
  },

  // Step 7: Reframe — HMW card canvas (no grid/quadrant/ring overlays)
  'reframe': {
    hasQuadrants: false,
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
