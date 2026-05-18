'use client';

import * as React from 'react';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';
import type { StepCanvasSettingsData } from '@/lib/canvas/step-canvas-settings-types';
import { JourneyTemplatePoll } from './journey-template-poll';

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
  const isJourneyMapping = stepMeta?.id === 'journey-mapping';
  const isMultiplayer = workshopType === 'multiplayer';

  return (
    <div className="flex h-full flex-col relative overflow-hidden">
      {/* Step-6 journey template poll — multiplayer-only overlay above the
          canvas. The component returns null when there's no open poll or when
          a template is already locked. Gated on isMultiplayer so we don't
          mount useBroadcastEvent outside a RoomProvider. */}
      {isJourneyMapping && isMultiplayer && (
        <div className="shrink-0 px-4 pt-4">
          <JourneyTemplatePoll />
        </div>
      )}

      {/* Canvas section - full height */}
      <div className="min-h-0 flex-1 overflow-hidden">
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
