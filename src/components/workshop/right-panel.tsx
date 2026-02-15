'use client';

import { PanelRightClose } from 'lucide-react';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';
import { getStepByOrder } from '@/lib/workshop/step-metadata';

interface RightPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  onCollapse?: () => void;
}

export function RightPanel({
  stepOrder,
  sessionId,
  workshopId,
  onCollapse,
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
        />
      </div>
    </div>
  );
}
