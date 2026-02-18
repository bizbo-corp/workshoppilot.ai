'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import type { UIMessage } from 'ai';
import { ChatPanel } from './chat-panel';
import { RightPanel } from './right-panel';
import { MobileTabBar } from './mobile-tab-bar';
import { StepNavigation } from './step-navigation';
import { ResetStepDialog } from '@/components/dialogs/reset-step-dialog';
import { IdeationSubStepContainer } from './ideation-sub-step-container';
import { MessageSquare, LayoutGrid, PanelLeftClose, PanelRightClose, GripVertical } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { resetStep } from '@/actions/workshop-actions';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';
import { ConceptCanvasOverlay } from './concept-canvas-overlay';
import { usePanelLayout } from '@/hooks/use-panel-layout';

const CANVAS_ENABLED_STEPS = ['challenge', 'stakeholder-mapping', 'user-research', 'sense-making', 'persona', 'journey-mapping', 'reframe', 'concept'];
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
  isAdmin?: boolean;
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
  isAdmin,
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
  const hmwCards = useCanvasStore((s) => s.hmwCards);
  const setPostIts = useCanvasStore((s) => s.setPostIts);
  const setDrawingNodes = useCanvasStore((s) => s.setDrawingNodes);
  const setCrazy8sSlots = useCanvasStore((s) => s.setCrazy8sSlots);
  const setMindMapState = useCanvasStore((s) => s.setMindMapState);
  const setConceptCards = useCanvasStore((s) => s.setConceptCards);
  const setGridColumns = useCanvasStore((s) => s.setGridColumns);
  // HMW card counts as "content" only when all 4 fields are filled (card is 'filled')
  const hmwCardComplete = hmwCards.some((c) => c.cardState === 'filled');
  const canvasHasContent = postIts.length > 0 || conceptCards.length > 0 || hmwCardComplete;

  // For canvas steps, activity is "confirmed" when post-its exist (no extraction needed)
  const effectiveConfirmed = isCanvasStep ? canvasHasContent : artifactConfirmed;

  // Local messages state — allows clearing before ChatPanel re-mounts on reset
  const [localMessages, setLocalMessages] = React.useState(initialMessages);

  // Sync from server when navigating between steps
  React.useEffect(() => {
    setLocalMessages(initialMessages);
  }, [stepOrder]);

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

  // Handle reset (clear data and full forward wipe)
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
      setLocalMessages([]);
      // Clear canvas/whiteboard state
      setPostIts([]);
      setDrawingNodes([]);
      setCrazy8sSlots([]);
      setMindMapState([], []);
      setConceptCards([]);
      setGridColumns([]);
      // Force re-mount of ChatPanel/IdeationSubStepContainer to clear useChat state
      setResetKey(prev => prev + 1);
      // Refresh page to reload with cleared server state
      router.refresh();
    } catch (error) {
      console.error('Failed to reset step:', error);
    } finally {
      setIsResetting(false);
    }
  }, [workshopId, stepOrder, sessionId, router, setPostIts, setDrawingNodes, setCrazy8sSlots, setMindMapState, setConceptCards, setGridColumns]);

  // Step 8 uses specialized sub-step container
  if (stepOrder === 8) {
    return (
      <>
        <IdeationSubStepContainer
          key={resetKey}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={localMessages}
          initialArtifact={initialArtifact}
          stepStatus={stepStatus}
          isAdmin={isAdmin}
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
          initialMessages={localMessages}
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
          isAdmin={isAdmin}
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
          {/* Chat collapsed strip */}
          {chatCollapsed && (
            <div className="flex w-10 flex-col items-center border-r bg-muted/30 py-4">
              <button
                onClick={() => setChatCollapsed(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Expand chat"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Resizable panel group (chat + canvas) */}
          {!chatCollapsed && !canvasCollapsed && (
            <PanelGroup orientation="horizontal" className="flex-1">
              <Panel defaultSize={480} minSize={280} maxSize="60%">
                {renderContent()}
              </Panel>
              <PanelResizeHandle className="group relative flex w-2 items-center justify-center bg-border/40 transition-colors hover:bg-border data-[active]:bg-primary/20">
                <div className="z-10 flex h-8 w-3.5 items-center justify-center rounded-sm border bg-border">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
              </PanelResizeHandle>
              <Panel minSize="30%">
                {step && CANVAS_ONLY_STEPS.includes(step.id) ? (
                  <div className="h-full relative">
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
              </Panel>
            </PanelGroup>
          )}

          {/* Chat takes full width when canvas is collapsed */}
          {!chatCollapsed && canvasCollapsed && (
            <div className="flex-1">{renderContent()}</div>
          )}

          {/* Canvas takes full width when chat is collapsed */}
          {chatCollapsed && !canvasCollapsed && (
            <div className="flex-1">
              {step && CANVAS_ONLY_STEPS.includes(step.id) ? (
                <div className="h-full relative">
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
        isAdmin={isAdmin}
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
