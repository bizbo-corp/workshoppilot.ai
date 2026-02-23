/**
 * Canvas Guide Configuration — DEFAULT / FALLBACK / SEED source
 *
 * These hardcoded guides serve as:
 * 1. Fallback when DB returns empty (no guides seeded yet)
 * 2. Seed data source for the seed-canvas-guides script
 *
 * The canonical runtime source is the canvas_guides DB table.
 */

import type { CanvasGuideData } from './canvas-guide-types';

// Legacy type re-exports for backwards compatibility
export type { CanvasGuideData as CanvasGuideDefinition } from './canvas-guide-types';

/**
 * Step-keyed guide definitions
 * Keys MUST match step IDs from src/lib/workshop/step-metadata.ts
 */
export const STEP_CANVAS_GUIDES: Record<string, Omit<CanvasGuideData, 'stepId'>[]> = {
  'stakeholder-mapping': [
    {
      id: 'stakeholder-hint',
      body: 'Double-click directly on the board to add a Sticky note or by using the Add Sticky note button.',
      variant: 'hint',
      dismissBehavior: 'hover-x',
      placementMode: 'pinned',
      pinnedPosition: 'bottom-center',
      layer: 'foreground',
      showOnlyWhenEmpty: false,
      sortOrder: 0,
    },
    {
      id: 'stakeholder-rings',
      title: "Who's most important?",
      body: 'Center ring = most important stakeholders\nMiddle ring = secondary stakeholders\nOuter ring = tertiary influences',
      variant: 'sticker',
      dismissBehavior: 'hover-x',
      placementMode: 'pinned',
      pinnedPosition: 'top-left',
      layer: 'foreground',
      showOnlyWhenEmpty: false,
      sortOrder: 1,
    },
  ],

  'user-research': [
    {
      id: 'user-research-hint',
      body: 'Double-click on the board to add a sticky note',
      variant: 'hint',
      dismissBehavior: 'auto-dismiss',
      placementMode: 'pinned',
      pinnedPosition: 'center',
      layer: 'foreground',
      showOnlyWhenEmpty: true,
      sortOrder: 0,
    },
    {
      id: 'user-research-activity',
      title: 'Research Insights',
      body: 'Capture key quotes, observations, and surprises from your user interviews.',
      variant: 'sticker',
      dismissBehavior: 'hover-x',
      placementMode: 'pinned',
      pinnedPosition: 'top-left',
      layer: 'foreground',
      showOnlyWhenEmpty: false,
      sortOrder: 1,
    },
  ],

  'sense-making': [
    {
      id: 'sense-making-hint',
      body: 'Double-click on the board to add a sticky note',
      variant: 'hint',
      dismissBehavior: 'auto-dismiss',
      placementMode: 'pinned',
      pinnedPosition: 'center',
      layer: 'foreground',
      showOnlyWhenEmpty: true,
      sortOrder: 0,
    },
    {
      id: 'sense-making-activity',
      title: 'Empathy Map',
      body: 'Sort your research findings into what users Say, Think, Feel, Do — plus their Pains & Gains.',
      variant: 'sticker',
      dismissBehavior: 'hover-x',
      placementMode: 'pinned',
      pinnedPosition: 'top-left',
      layer: 'foreground',
      showOnlyWhenEmpty: false,
      sortOrder: 1,
    },
  ],

  'journey-mapping': [
    {
      id: 'journey-activity',
      title: 'Journey Map',
      body: 'Map the user experience across stages — actions, goals, barriers, touchpoints, emotions, and opportunities.',
      variant: 'sticker',
      dismissBehavior: 'hover-x',
      placementMode: 'pinned',
      pinnedPosition: 'top-left',
      layer: 'foreground',
      showOnlyWhenEmpty: false,
      sortOrder: 0,
    },
  ],

  'reframe': [
    {
      id: 'reframe-hint',
      body: 'HMW cards will appear here as you brainstorm "How Might We" questions',
      variant: 'hint',
      dismissBehavior: 'auto-dismiss',
      placementMode: 'pinned',
      pinnedPosition: 'center',
      layer: 'foreground',
      showOnlyWhenEmpty: true,
      sortOrder: 0,
    },
  ],

  'ideation': [
    {
      id: 'ideation-hint',
      body: 'Double-click on the board to add a sticky note',
      variant: 'hint',
      dismissBehavior: 'auto-dismiss',
      placementMode: 'pinned',
      pinnedPosition: 'center',
      layer: 'foreground',
      showOnlyWhenEmpty: true,
      sortOrder: 0,
    },
  ],

  'concept': [
    {
      id: 'concept-hint',
      body: 'Concept cards will appear here as you develop your ideas',
      variant: 'hint',
      dismissBehavior: 'auto-dismiss',
      placementMode: 'pinned',
      pinnedPosition: 'center',
      layer: 'foreground',
      showOnlyWhenEmpty: true,
      sortOrder: 0,
    },
  ],
};

/**
 * Get default canvas guide definitions for a specific step (fallback when DB empty).
 * @param stepId - The step ID (must match step-metadata.ts IDs)
 * @returns Array of guide data (empty if none configured)
 */
export function getDefaultStepCanvasGuides(stepId: string): CanvasGuideData[] {
  const guides = STEP_CANVAS_GUIDES[stepId] || [];
  return guides.map((g) => ({ ...g, stepId }));
}
