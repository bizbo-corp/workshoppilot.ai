'use client';

import * as React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { UIMessage } from 'ai';
import { ChatPanel } from './chat-panel';
import { OutputPanel } from './output-panel';
import { ArtifactConfirmation } from './artifact-confirmation';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepContainerProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
}

export function StepContainer({
  stepOrder,
  sessionId,
  workshopId,
  initialMessages,
}: StepContainerProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  // Extraction state
  const [artifact, setArtifact] = React.useState<Record<string, unknown> | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(null);
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(false);

  // Messages count for "Extract Output" button visibility
  const messageCount = initialMessages?.length || 0;
  const hasEnoughMessages = messageCount >= 4; // At least 2 exchanges

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Extract artifact from conversation
  const extractArtifact = React.useCallback(async () => {
    setIsExtracting(true);
    setExtractionError(null);

    try {
      // Get current step ID from step-metadata
      const { getStepByOrder } = await import('@/lib/workshop/step-metadata');
      const step = getStepByOrder(stepOrder);

      if (!step) {
        setExtractionError('Step not found');
        return;
      }

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          stepId: step.id,
          sessionId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setArtifact(data.artifact);
        setExtractionError(null);
      } else if (response.status === 422) {
        // Extraction failed (validation error)
        setExtractionError(data.message || 'Failed to extract artifact');
      } else if (response.status === 400) {
        // Insufficient conversation
        setExtractionError(data.message || 'Not enough conversation to extract');
      } else if (response.status === 404) {
        // Session/workshop not found
        setExtractionError('Session not found');
      } else {
        // Unknown error
        setExtractionError('An unexpected error occurred');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionError('Network error - please try again');
    } finally {
      setIsExtracting(false);
    }
  }, [workshopId, sessionId, stepOrder]);

  // Handle confirmation
  const handleConfirm = React.useCallback(() => {
    setArtifactConfirmed(true);
  }, []);

  // Handle edit (clear artifact and confirmation)
  const handleEdit = React.useCallback(() => {
    setArtifactConfirmed(false);
    setArtifact(null);
  }, []);

  // Render content section
  const renderContent = () => (
    <>
      <ChatPanel
        stepOrder={stepOrder}
        sessionId={sessionId}
        initialMessages={initialMessages}
      />
      <div className="flex flex-col gap-4 p-4">
        {/* Extract Output button (shown when enough messages AND no artifact AND not extracting) */}
        {hasEnoughMessages && !artifact && !isExtracting && (
          <Button
            onClick={extractArtifact}
            variant="outline"
            size="sm"
            className="self-center"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Extract Output
          </Button>
        )}
      </div>
    </>
  );

  const renderOutput = () => (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <OutputPanel
          stepOrder={stepOrder}
          artifact={artifact}
          isExtracting={isExtracting}
          extractionError={extractionError}
          onRetry={extractArtifact}
        />
      </div>
      {/* Confirmation UI (shown when artifact exists) */}
      {artifact && (
        <div className="border-t bg-background p-4">
          <ArtifactConfirmation
            onConfirm={handleConfirm}
            onEdit={handleEdit}
            isConfirming={false}
            isConfirmed={artifactConfirmed}
          />
        </div>
      )}
    </div>
  );

  // Mobile: stacked layout
  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 border-b">{renderContent()}</div>
        <div className="flex-1">{renderOutput()}</div>
      </div>
    );
  }

  // Desktop: resizable panels
  return (
    <Group orientation="horizontal" className="h-full">
      <Panel defaultSize={50} minSize={30}>
        {renderContent()}
      </Panel>

      <Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
        {/* Invisible touch-friendly hit area */}
        <div className="absolute inset-y-0 -left-3 -right-3" />
        {/* Visual indicator on hover */}
        <div className="absolute inset-y-0 left-0 w-px bg-ring opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100" />
      </Separator>

      <Panel defaultSize={50} minSize={25}>
        {renderOutput()}
      </Panel>
    </Group>
  );
}
