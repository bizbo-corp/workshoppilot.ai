'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { UIMessage } from 'ai';
import { ChatPanel } from './chat-panel';
import { RightPanel } from './right-panel';
import { MobileTabBar } from './mobile-tab-bar';
import { StepNavigation } from './step-navigation';
import { ResetStepDialog } from '@/components/dialogs/reset-step-dialog';
import { IdeationSubStepContainer } from './ideation-sub-step-container';
import { MessageSquare, LayoutGrid, PanelLeftClose, PanelRightClose, GripVertical } from 'lucide-react';
import { reviseStep, resetStep } from '@/actions/workshop-actions';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';
import { ConceptCanvasOverlay } from './concept-canvas-overlay';
import { usePanelLayout } from '@/hooks/use-panel-layout';

const CANVAS_ENABLED_STEPS = ['challenge', 'stakeholder-mapping', 'sense-making', 'persona', 'journey-mapping', 'concept'];
const CANVAS_ONLY_STEPS = ['stakeholder-mapping', 'sense-making', 'concept'];

interface StepContainerProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  initialArtifact?: Record<string, unknown> | null;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  hmwStatement?: string;
  step8SelectedSlotIds?: string[];
  step8Crazy8sSlots?: Array<{ slotId: string; title: string; imageUrl?: string }>;
}

export function StepContainer({
  stepOrder,
  sessionId,
  workshopId,
  initialMessages,
  initialArtifact,
  stepStatus,
  hmwStatement,
  step8SelectedSlotIds,
  step8Crazy8sSlots,
}: StepContainerProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<'chat' | 'canvas'>('chat');
  const { chatCollapsed, canvasCollapsed, setChatCollapsed, setCanvasCollapsed } = usePanelLayout();

  // Artifact confirmation state
  // For complete steps: pre-set confirmed (artifact was already confirmed)
  // For needs_regeneration: not confirmed (needs re-confirmation after revision)
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(
    stepStatus === 'complete' && initialArtifact !== null
  );

  // Canvas step detection — canvas steps skip extraction
  const step = getStepByOrder(stepOrder);
  const isCanvasStep = step ? CANVAS_ENABLED_STEPS.includes(step.id) : false;
  const postIts = useCanvasStore((s) => s.postIts);
  const conceptCards = useCanvasStore((s) => s.conceptCards);
  const canvasHasContent = postIts.length > 0 || conceptCards.length > 0;

  // For canvas steps, activity is "confirmed" when post-its exist (no extraction needed)
  const effectiveConfirmed = isCanvasStep ? canvasHasContent : artifactConfirmed;

  // Reset dialog state
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  // Reset key forces ChatPanel/IdeationSubStepContainer to re-mount (clearing useChat state)
  const [resetKey, setResetKey] = React.useState(0);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset mobile tab to 'chat' when navigating between steps
  React.useEffect(() => {
    setMobileTab('chat');
  }, [stepOrder]);

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
      setArtifactConfirmed(false);
      // Force re-mount of ChatPanel/IdeationSubStepContainer to clear useChat state
      setResetKey(prev => prev + 1);
      // Refresh page to reload with cleared server state
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
          key={resetKey}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={initialMessages}
          initialArtifact={initialArtifact}
          stepStatus={stepStatus}
          onRevise={handleRevise}
          onReset={() => setShowResetDialog(true)}
          hmwStatement={hmwStatement}
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
      {!isMobile && (
        <div className="flex justify-end px-2 pt-2">
          <button
            onClick={() => setChatCollapsed(true)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Collapse chat"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ChatPanel
          key={resetKey}
          stepOrder={stepOrder}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );


  // Mobile: tab-based layout
  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        {/* Content area - show one panel at a time */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* Both panels mounted, visibility toggled with CSS for instant switching */}
          <div className={cn('h-full', mobileTab !== 'chat' && 'hidden')}>
            {renderContent()}
          </div>
          <div className={cn('h-full', mobileTab !== 'canvas' && 'hidden')}>
            {step && CANVAS_ONLY_STEPS.includes(step.id) ? (
              <div className="h-full relative">
                <CanvasWrapper
                  sessionId={sessionId}
                  stepId={step.id}
                  workshopId={workshopId}
                />
                {step.id === 'concept' && (
                  <ConceptCanvasOverlay
                    workshopId={workshopId}
                    stepId={step.id}
                    selectedSketchSlotIds={step8SelectedSlotIds}
                    crazy8sSlots={step8Crazy8sSlots}
                  />
                )}
              </div>
            ) : (
              <RightPanel
                stepOrder={stepOrder}
                sessionId={sessionId}
                workshopId={workshopId}
              />
            )}
          </div>
        </div>

        {/* Tab bar - above step navigation */}
        <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} />

        {/* Step navigation - fixed at bottom, full width */}
        <StepNavigation
          sessionId={sessionId}
          workshopId={workshopId}
          currentStepOrder={stepOrder}
          artifactConfirmed={effectiveConfirmed}
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

  // Desktop: resizable panels with collapse/expand
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Chat panel or collapsed strip */}
          {chatCollapsed ? (
            <div className="flex w-10 flex-col items-center border-r bg-muted/30 py-4">
              <button
                onClick={() => setChatCollapsed(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Expand chat"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
          ) : canvasCollapsed ? (
            // Chat takes full width when canvas is collapsed
            <div className="flex-1">{renderContent()}</div>
          ) : (
            // Both panels open: use resizable Group
            <>
              <Group orientation="horizontal" className="flex-1" id="workshop-panels">
                <Panel defaultSize={25} minSize={15}>
                  {renderContent()}
                </Panel>

                <Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
                  <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100 transition-opacity">
                    <div className="flex h-6 w-4 items-center justify-center rounded-sm bg-border">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </Separator>

                <Panel defaultSize={75} minSize={40}>
                  {step && CANVAS_ONLY_STEPS.includes(step.id) ? (
                    <div className="h-full relative">
                      {/* Collapse button */}
                      {!canvasCollapsed && (
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            onClick={() => setCanvasCollapsed(true)}
                            className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
                            title="Collapse canvas"
                          >
                            <PanelRightClose className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <CanvasWrapper
                        sessionId={sessionId}
                        stepId={step.id}
                        workshopId={workshopId}
                      />
                      {step.id === 'concept' && (
                        <ConceptCanvasOverlay
                          workshopId={workshopId}
                          stepId={step.id}
                          selectedSketchSlotIds={step8SelectedSlotIds}
                          crazy8sSlots={step8Crazy8sSlots}
                        />
                      )}
                    </div>
                  ) : (
                    <RightPanel
                      stepOrder={stepOrder}
                      sessionId={sessionId}
                      workshopId={workshopId}
                      onCollapse={() => setCanvasCollapsed(true)}
                    />
                  )}
                </Panel>
              </Group>
            </>
          )}

          {/* Canvas panel or collapsed strip (when chat is collapsed but canvas is not) */}
          {chatCollapsed && !canvasCollapsed && (
            <div className="flex-1">
              {step && CANVAS_ONLY_STEPS.includes(step.id) ? (
                <div className="h-full relative">
                  {/* Collapse button */}
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={() => setCanvasCollapsed(true)}
                      className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
                      title="Collapse canvas"
                    >
                      <PanelRightClose className="h-4 w-4" />
                    </button>
                  </div>
                  <CanvasWrapper
                    sessionId={sessionId}
                    stepId={step.id}
                    workshopId={workshopId}
                  />
                  {step.id === 'concept' && (
                    <ConceptCanvasOverlay
                      workshopId={workshopId}
                      stepId={step.id}
                      selectedSketchSlotIds={step8SelectedSlotIds}
                      crazy8sSlots={step8Crazy8sSlots}
                    />
                  )}
                </div>
              ) : (
                <RightPanel
                  stepOrder={stepOrder}
                  sessionId={sessionId}
                  workshopId={workshopId}
                  onCollapse={() => setCanvasCollapsed(true)}
                />
              )}
            </div>
          )}

          {/* Canvas collapsed strip */}
          {canvasCollapsed && (
            <div className="flex w-10 flex-col items-center border-l bg-muted/30 py-4">
              <button
                onClick={() => setCanvasCollapsed(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Expand canvas"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
      <StepNavigation
        sessionId={sessionId}
        workshopId={workshopId}
        currentStepOrder={stepOrder}
        artifactConfirmed={effectiveConfirmed}
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
