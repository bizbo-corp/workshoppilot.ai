'use client';

import * as React from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OutputPanel } from './output-panel';
import { ArtifactConfirmation } from './artifact-confirmation';

interface OutputAccordionProps {
  stepOrder: number;
  artifact: Record<string, unknown>;
  isExtracting: boolean;
  extractionError: string | null;
  onRetry?: () => void;
  artifactConfirmed: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}

export function OutputAccordion({
  stepOrder,
  artifact,
  isExtracting,
  extractionError,
  onRetry,
  artifactConfirmed,
  onConfirm,
  onEdit,
  onExpandedChange,
}: OutputAccordionProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandedChange?.(newExpanded);
  };

  // Collapsed state: clickable bar at bottom
  if (!isExpanded) {
    return (
      <div
        onClick={handleToggle}
        className="flex cursor-pointer items-center justify-between border-t bg-muted/50 px-4 py-2 transition-colors hover:bg-muted/70"
      >
        <span className="text-sm font-medium">Output</span>
        <ChevronUp className="h-4 w-4 rotate-180 transition-transform" />
      </div>
    );
  }

  // Expanded state: full content with OutputPanel and ArtifactConfirmation
  return (
    <div className="flex h-full flex-col border-t">
      {/* Header bar (clickable to collapse) */}
      <div
        onClick={handleToggle}
        className="flex cursor-pointer items-center justify-between border-b bg-muted/50 px-4 py-2 transition-colors hover:bg-muted/70"
      >
        <span className="text-sm font-medium">Output</span>
        <ChevronUp className="h-4 w-4 transition-transform" />
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <OutputPanel
          stepOrder={stepOrder}
          artifact={artifact}
          isExtracting={isExtracting}
          extractionError={extractionError}
          onRetry={onRetry}
        />
      </div>

      {/* Confirmation UI (shown when artifact exists) */}
      {artifact && (
        <div className="border-t bg-background p-4">
          <ArtifactConfirmation
            onConfirm={onConfirm}
            onEdit={onEdit}
            isConfirming={false}
            isConfirmed={artifactConfirmed}
          />
        </div>
      )}
    </div>
  );
}
