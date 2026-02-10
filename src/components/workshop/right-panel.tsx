'use client';

import * as React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
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
}: RightPanelProps) {
  const [isAccordionExpanded, setIsAccordionExpanded] = React.useState(true);
  const stepMeta = getStepByOrder(stepOrder);

  // Show output accordion when artifact exists or extraction in progress
  const showOutput = artifact !== null || isExtracting || extractionError !== null;

  // When accordion is collapsed or hidden, show full-height canvas
  if (!showOutput || !isAccordionExpanded) {
    return (
      <div className="flex h-full flex-col">
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
    <div className="h-full">
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
