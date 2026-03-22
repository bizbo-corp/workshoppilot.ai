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
  workshopType?: 'solo' | 'multiplayer';
  canvasGuides?: CanvasGuideData[];
  defaultViewportSettings?: StepCanvasSettingsData | null;
  isAdmin?: boolean;
  isAdminEditing?: boolean;
  onEditGuide?: (guide: CanvasGuideData, position: { x: number; y: number }) => void;
  onAddGuide?: (position: { x: number; y: number }) => void;
  onGuidePositionUpdate?: (guideId: string, x: number, y: number) => void;
  onGuideSizeUpdate?: (guideId: string, width: number, height: number, x: number, y: number) => void;
  onTemplateStickyPositionSync?: (templateKey: string, x: number, y: number) => void;
  onTemplateStickyDelete?: (templateKey: string) => void;
  canvasRef?: React.Ref<{ getViewport: () => { x: number; y: number; zoom: number }; screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number } }>;
  conceptOwners?: Array<{ ownerId: string; ownerName: string; ownerColor: string }>;
}

export function CanvasWrapper({ sessionId, stepId, workshopId, workshopType, canvasGuides, defaultViewportSettings, isAdmin, isAdminEditing, onEditGuide, onAddGuide, onGuidePositionUpdate, onGuideSizeUpdate, onTemplateStickyPositionSync, onTemplateStickyDelete, canvasRef, conceptOwners }: CanvasWrapperProps) {
  return (
    <ReactFlowCanvas
      sessionId={sessionId}
      stepId={stepId}
      workshopId={workshopId}
      workshopType={workshopType}
      canvasGuides={canvasGuides}
      defaultViewportSettings={defaultViewportSettings}
      isAdmin={isAdmin}
      isAdminEditing={isAdminEditing}
      onEditGuide={onEditGuide}
      onAddGuide={onAddGuide}
      onGuidePositionUpdate={onGuidePositionUpdate}
      onGuideSizeUpdate={onGuideSizeUpdate}
      onTemplateStickyPositionSync={onTemplateStickyPositionSync}
      onTemplateStickyDelete={onTemplateStickyDelete}
      canvasRef={canvasRef}
      conceptOwners={conceptOwners}
    />
  );
}
