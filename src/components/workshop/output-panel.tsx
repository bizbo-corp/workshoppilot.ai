'use client';

import * as React from 'react';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { cn } from '@/lib/utils';

interface OutputPanelProps {
  stepOrder: number;
}

export function OutputPanel({ stepOrder }: OutputPanelProps) {
  const step = getStepByOrder(stepOrder);

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Step not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{step.mockOutputType}</h3>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Preview
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-generated content will appear here
        </p>
      </div>

      {/* Mock content */}
      <div
        className={cn(
          'flex-1 rounded-lg border bg-card p-4 shadow-xs',
          'prose prose-sm dark:prose-invert max-w-none'
        )}
      >
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
          {step.mockOutputContent}
        </pre>
      </div>
    </div>
  );
}
