'use client';

import * as React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { PanelRightClose } from 'lucide-react';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';
import { OutputAccordion } from './output-accordion';
import { getStepByOrder } from '@/lib/workshop/step-metadata';

interface RightPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  artifact: Record<string, unknown> | null;
  isExtracting: boolean;
  extractionError: string | null;
  onRetry?: () => void;
  artifactConfirmed: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onCollapse?: () => void;
}

export function RightPanel({
  stepOrder,
  sessionId,
  workshopId,
  artifact,
  isExtracting,
  extractionError,
  onRetry,
  artifactConfirmed,
  onConfirm,
  onEdit,
  onCollapse,
}: RightPanelProps) {
  const [isAccordionExpanded, setIsAccordionExpanded] = React.useState(true);
  const stepMeta = getStepByOrder(stepOrder);

  // Show output accordion when artifact exists or extraction in progress
  const showOutput = artifact !== null || isExtracting || extractionError !== null;

  // When accordion is collapsed or hidden, show full-height canvas
  if (!showOutput || !isAccordionExpanded) {
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

        {/* Collapsed accordion bar (if output exists) */}
        {showOutput && (
          <OutputAccordion
            stepOrder={stepOrder}
            artifact={artifact!}
            isExtracting={isExtracting}
            extractionError={extractionError}
            onRetry={onRetry}
            artifactConfirmed={artifactConfirmed}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onExpandedChange={setIsAccordionExpanded}
          />
        )}
      </div>
    );
  }

  // When accordion is expanded, split vertically 50/50
  return (
    <div className="h-full relative">
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
      <Group orientation="vertical">
        {/* Canvas panel - top 50% */}
        <Panel defaultSize={50} minSize={30}>
          <CanvasWrapper
            sessionId={sessionId}
            stepId={stepMeta?.id || ''}
            workshopId={workshopId}
          />
        </Panel>

        {/* Horizontal separator */}
        <Separator className="h-px bg-border hover:bg-ring" />

        {/* Output accordion panel - bottom 50% */}
        <Panel defaultSize={50} minSize={20}>
          <OutputAccordion
            stepOrder={stepOrder}
            artifact={artifact!}
            isExtracting={isExtracting}
            extractionError={extractionError}
            onRetry={onRetry}
            artifactConfirmed={artifactConfirmed}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onExpandedChange={setIsAccordionExpanded}
          />
        </Panel>
      </Group>
    </div>
  );
}
