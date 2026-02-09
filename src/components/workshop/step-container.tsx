'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { UIMessage } from 'ai';
import { ChatPanel } from './chat-panel';
import { OutputPanel } from './output-panel';
import { ArtifactConfirmation } from './artifact-confirmation';
import { StepNavigation } from './step-navigation';
import { ResetStepDialog } from '@/components/dialogs/reset-step-dialog';
import { IdeationSubStepContainer } from './ideation-sub-step-container';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reviseStep, resetStep } from '@/actions/workshop-actions';
import { getStepByOrder } from '@/lib/workshop/step-metadata';

interface StepContainerProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  initialArtifact?: Record<string, unknown> | null;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
}

export function StepContainer({
  stepOrder,
  sessionId,
  workshopId,
  initialMessages,
  initialArtifact,
  stepStatus,
}: StepContainerProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = React.useState(false);

  // Extraction state
  // Pre-populate artifact if viewing completed/needs_regeneration step
  const [artifact, setArtifact] = React.useState<Record<string, unknown> | null>(
    initialArtifact || null
  );
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(null);

  // Artifact confirmation state
  // For complete steps: pre-set confirmed (artifact was already confirmed)
  // For needs_regeneration: not confirmed (needs re-confirmation after revision)
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(
    stepStatus === 'complete' && initialArtifact !== null
  );

  // Live message count for "Extract Output" button visibility
  const [liveMessageCount, setLiveMessageCount] = React.useState(initialMessages?.length || 0);
  const hasEnoughMessages = liveMessageCount >= 4; // At least 2 exchanges

  // Reset dialog state
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

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

  // Handle revision (cascade invalidation)
  const handleRevise = React.useCallback(async () => {
    try {
      // Get current step ID from step-metadata
      const { getStepByOrder } = await import('@/lib/workshop/step-metadata');
      const step = getStepByOrder(stepOrder);

      if (!step) {
        console.error('Step not found for revision');
        return;
      }

      // Trigger cascade invalidation server action
      await reviseStep(workshopId, step.id, sessionId);

      // Refresh the page to reload with updated status
      router.refresh();
    } catch (error) {
      console.error('Failed to revise step:', error);
    }
  }, [workshopId, stepOrder, sessionId, router]);

  // Handle reset (clear data and cascade invalidation)
  const handleReset = React.useCallback(async () => {
    try {
      setIsResetting(true);
      const step = getStepByOrder(stepOrder);
      if (!step) {
        console.error('Step not found for reset');
        return;
      }
      await resetStep(workshopId, step.id, sessionId);
      setShowResetDialog(false);
      // Reset local state
      setArtifact(null);
      setArtifactConfirmed(false);
      setExtractionError(null);
      // Refresh page to reload with cleared state
      router.refresh();
    } catch (error) {
      console.error('Failed to reset step:', error);
    } finally {
      setIsResetting(false);
    }
  }, [workshopId, stepOrder, sessionId, router]);

  // Step 8 uses specialized sub-step container
  if (stepOrder === 8) {
    return (
      <>
        <IdeationSubStepContainer
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={initialMessages}
          initialArtifact={initialArtifact}
          stepStatus={stepStatus}
          onRevise={handleRevise}
          onReset={() => setShowResetDialog(true)}
        />
        <ResetStepDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          onConfirm={handleReset}
          isResetting={isResetting}
          stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
        />
      </>
    );
  }

  // Render content section
  const renderContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <ChatPanel
          stepOrder={stepOrder}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={initialMessages}
          onMessageCountChange={setLiveMessageCount}
        />
      </div>
      {hasEnoughMessages && !artifact && !isExtracting && (
        <div className="flex shrink-0 justify-center border-t bg-background p-4">
          <Button
            onClick={extractArtifact}
            variant="outline"
            size="sm"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Extract Output
          </Button>
        </div>
      )}
    </div>
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
        <div className="min-h-0 flex-1 border-b">{renderContent()}</div>
        <div className="min-h-0 flex-1">{renderOutput()}</div>
        <StepNavigation
          sessionId={sessionId}
          workshopId={workshopId}
          currentStepOrder={stepOrder}
          artifactConfirmed={artifactConfirmed}
          stepStatus={stepStatus}
          onRevise={handleRevise}
          onReset={() => setShowResetDialog(true)}
        />
        <ResetStepDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          onConfirm={handleReset}
          isResetting={isResetting}
          stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
        />
      </div>
    );
  }

  // Desktop: resizable panels
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
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
      </div>
      <StepNavigation
        sessionId={sessionId}
        workshopId={workshopId}
        currentStepOrder={stepOrder}
        artifactConfirmed={artifactConfirmed}
        stepStatus={stepStatus}
        onRevise={handleRevise}
        onReset={() => setShowResetDialog(true)}
      />
      <ResetStepDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleReset}
        isResetting={isResetting}
        stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
      />
    </div>
  );
}
