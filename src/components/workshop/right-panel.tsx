'use client';

import { PanelRightClose } from 'lucide-react';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';

interface RightPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  onCollapse?: () => void;
  canvasGuides?: CanvasGuideData[];
  isAdmin?: boolean;
  isAdminEditing?: boolean;
  onEditGuide?: (guide: CanvasGuideData, position: { x: number; y: number }) => void;
  onAddGuide?: (position: { x: number; y: number }) => void;
  onGuidePositionUpdate?: (guideId: string, x: number, y: number) => void;
  onGuideSizeUpdate?: (guideId: string, width: number, height: number, x: number, y: number) => void;
}

export function RightPanel({
  stepOrder,
  sessionId,
  workshopId,
  onCollapse,
  canvasGuides,
  isAdmin,
  isAdminEditing,
  onEditGuide,
  onAddGuide,
  onGuidePositionUpdate,
  onGuideSizeUpdate,
}: RightPanelProps) {
  const stepMeta = getStepByOrder(stepOrder);

  return (
    <div className="flex h-full flex-col relative">
      {/* Collapse button */}
      {onCollapse && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={onCollapse}
            className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
            title="Collapse canvas"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Canvas section - full height */}
      <div className="min-h-0 flex-1">
        <CanvasWrapper
          sessionId={sessionId}
          stepId={stepMeta?.id || ''}
          workshopId={workshopId}
          canvasGuides={canvasGuides}
          isAdmin={isAdmin}
          isAdminEditing={isAdminEditing}
          onEditGuide={onEditGuide}
          onAddGuide={onAddGuide}
          onGuidePositionUpdate={onGuidePositionUpdate}
          onGuideSizeUpdate={onGuideSizeUpdate}
        />
      </div>
    </div>
  );
}
