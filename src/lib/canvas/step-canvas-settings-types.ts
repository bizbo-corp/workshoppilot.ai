/**
 * Shared types for step canvas viewport settings.
 */

export type ViewportMode = 'absolute' | 'center-offset';

export interface StepCanvasSettingsData {
  id: string;
  stepId: string;
  defaultZoom: number;
  defaultX: number;
  defaultY: number;
  viewportMode: ViewportMode;
}
