'use client';

import dynamic from 'next/dynamic';
import { CanvasLoadingSkeleton } from './canvas-loading-skeleton';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';
import type { StepCanvasSettingsData } from '@/lib/canvas/step-canvas-settings-types';

const ReactFlowCanvas = dynamic(
  () => import('./react-flow-canvas').then((mod) => mod.ReactFlowCanvas),
  { ssr: false, loading: () => <CanvasLoadingSkeleton /> }
);

export interface CanvasWrapperProps {
  sessionId: string;
  stepId: string;
  workshopId: string;
  canvasGuides?: CanvasGuideData[];
  defaultViewportSettings?: StepCanvasSettingsData | null;
  isAdmin?: boolean;
  isAdminEditing?: boolean;
  onEditGuide?: (guide: CanvasGuideData, position: { x: number; y: number }) => void;
  onAddGuide?: (position: { x: number; y: number }) => void;
  onGuidePositionUpdate?: (guideId: string, x: number, y: number) => void;
  onGuideSizeUpdate?: (guideId: string, width: number, height: number, x: number, y: number) => void;
  canvasRef?: React.Ref<{ getViewport: () => { x: number; y: number; zoom: number } }>;
}

export function CanvasWrapper({ sessionId, stepId, workshopId, canvasGuides, defaultViewportSettings, isAdmin, isAdminEditing, onEditGuide, onAddGuide, onGuidePositionUpdate, onGuideSizeUpdate, canvasRef }: CanvasWrapperProps) {
  return (
    <ReactFlowCanvas
      sessionId={sessionId}
      stepId={stepId}
      workshopId={workshopId}
      canvasGuides={canvasGuides}
      defaultViewportSettings={defaultViewportSettings}
      isAdmin={isAdmin}
      isAdminEditing={isAdminEditing}
      onEditGuide={onEditGuide}
      onAddGuide={onAddGuide}
      onGuidePositionUpdate={onGuidePositionUpdate}
      onGuideSizeUpdate={onGuideSizeUpdate}
      canvasRef={canvasRef}
    />
  );
}
