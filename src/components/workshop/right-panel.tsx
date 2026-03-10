'use client';

import * as React from 'react';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';
import type { StepCanvasSettingsData } from '@/lib/canvas/step-canvas-settings-types';

interface RightPanelProps {
  stepOrder: number;
  sessionId: string;
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
}

export function RightPanel({
  stepOrder,
  sessionId,
  workshopId,
  workshopType,
  canvasGuides,
  defaultViewportSettings,
  isAdmin,
  isAdminEditing,
  onEditGuide,
  onAddGuide,
  onGuidePositionUpdate,
  onGuideSizeUpdate,
  onTemplateStickyPositionSync,
  onTemplateStickyDelete,
  canvasRef,
}: RightPanelProps) {
  const stepMeta = getStepByOrder(stepOrder);

  return (
    <div className="flex h-full flex-col relative">
      {/* Canvas section - full height */}
      <div className="min-h-0 flex-1">
        <CanvasWrapper
          sessionId={sessionId}
          stepId={stepMeta?.id || ''}
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
        />
      </div>
    </div>
  );
}
