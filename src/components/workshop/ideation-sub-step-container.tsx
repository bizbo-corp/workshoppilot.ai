'use client';

import * as React from 'react';

import type { UIMessage } from 'ai';
import { ChatPanel } from './chat-panel';
import { StepNavigation } from './step-navigation';
import { MindMapCanvas } from './mind-map-canvas';
import { IdeaSelection } from './idea-selection';
import { BrainRewritingCanvas } from './brain-rewriting-canvas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/lib/utils/confetti';
import { MessageSquare, LayoutGrid, PanelLeftClose, PanelRightClose, GripVertical, CheckCircle2, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { Panel as ResizablePanel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { usePanelLayout } from '@/hooks/use-panel-layout';
import { saveCanvasState } from '@/actions/canvas-actions';
import { createEmptyMatrix } from '@/lib/canvas/brain-rewriting-types';

type IdeationPhase = 'mind-mapping' | 'crazy-eights' | 'idea-selection' | 'brain-rewriting';


interface IdeationSubStepContainerProps {
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  initialArtifact?: Record<string, unknown> | null;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  isAdmin?: boolean;
  onReset?: () => void;
  hmwStatement?: string;
  challengeStatement?: string;
  hmwGoals?: Array<{ label: string; fullStatement: string }>;
}

export function IdeationSubStepContainer({
  sessionId,
  workshopId,
  initialMessages,
  initialArtifact,
  stepStatus,
  isAdmin,
  onReset,
  hmwStatement,
  challengeStatement,
  hmwGoals,
}: IdeationSubStepContainerProps) {
  const { chatCollapsed, canvasCollapsed, setChatCollapsed, setCanvasCollapsed } = usePanelLayout();

  // Phase management: mind-mapping → crazy-eights → idea-selection → brain-rewriting
  const [currentPhase, setCurrentPhase] = React.useState<IdeationPhase>('mind-mapping');
  const [showCrazy8s, setShowCrazy8s] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [artifact, setArtifact] = React.useState<Record<string, unknown> | null>(
    initialArtifact || null
  );
  const [liveMessageCount, setLiveMessageCount] = React.useState(0);
  const [mobileView, setMobileView] = React.useState<'chat' | 'canvas'>('chat');

  // Admin toggle state
  const [isGuideEditing, setIsGuideEditing] = React.useState(false);
  const handleToggleGuideEditor = React.useCallback(() => {
    setIsGuideEditing((prev) => !prev);
  }, []);

  // Idea selection local state
  const [localSelectedSlotIds, setLocalSelectedSlotIds] = React.useState<string[]>([]);

  // Brain rewriting navigation
  const [currentMatrixIndex, setCurrentMatrixIndex] = React.useState(0);

  // Artifact confirmation state
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(
    stepStatus === 'complete' && initialArtifact !== null
  );

  // Fire confetti when user explicitly confirms (not on page load for already-complete steps)
  const prevConfirmed = React.useRef(artifactConfirmed);
  React.useEffect(() => {
    if (artifactConfirmed && !prevConfirmed.current) {
      fireConfetti();
    }
    prevConfirmed.current = artifactConfirmed;
  }, [artifactConfirmed]);

  // Canvas state
  const mindMapNodes = useCanvasStore(state => state.mindMapNodes);
  const crazy8sSlots = useCanvasStore(state => state.crazy8sSlots);
  const selectedSlotIds = useCanvasStore(state => state.selectedSlotIds);
  const brainRewritingMatrices = useCanvasStore(state => state.brainRewritingMatrices);
  const canvasStoreApi = useCanvasStoreApi();

  // Get stepId for canvases
  const [stepId, setStepId] = React.useState<string>('');
  React.useEffect(() => {
    const getStep = async () => {
      const { getStepByOrder } = await import('@/lib/workshop/step-metadata');
      const step = getStepByOrder(8);
      if (step) setStepId(step.id);
    };
    getStep();
  }, []);

  // Mind map has content when there are level-1 theme nodes
  const mindMapHasThemes = React.useMemo(
    () => mindMapNodes.filter(node => node.level === 1).length > 0,
    [mindMapNodes]
  );

  // Auto-resume: check state in priority order on mount
  React.useEffect(() => {
    const state = canvasStoreApi.getState();

    const isComplete = stepStatus === 'complete';

    if (state.brainRewritingMatrices.length > 0) {
      // Resume at brain rewriting
      setShowCrazy8s(true);
      setCurrentPhase('brain-rewriting');
      setLocalSelectedSlotIds(state.selectedSlotIds);
      if (!isComplete) setArtifactConfirmed(false);
    } else if (state.selectedSlotIds.length > 0) {
      // Resume at idea selection
      setShowCrazy8s(true);
      setCurrentPhase('idea-selection');
      setLocalSelectedSlotIds(state.selectedSlotIds);
      if (!isComplete) setArtifactConfirmed(false);
    } else if (state.crazy8sSlots.some(slot => slot.imageUrl)) {
      // Crazy 8s done but no selection yet → go to idea selection
      setShowCrazy8s(true);
      setCurrentPhase('idea-selection');
      if (!isComplete) setArtifactConfirmed(false);
    }
  }, [canvasStoreApi, stepStatus]);

  // Check for mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Transition to crazy 8s phase
  const handleStartCrazy8s = React.useCallback(() => {
    setShowCrazy8s(true);
    setCurrentPhase('crazy-eights');
  }, []);

  // Helper: flush full canvas state to DB
  const flushCanvasState = React.useCallback(async () => {
    if (!stepId) return;
    const state = canvasStoreApi.getState();
    await saveCanvasState(workshopId, stepId, {
      stickyNotes: state.stickyNotes,
      ...(state.gridColumns.length > 0 ? { gridColumns: state.gridColumns } : {}),
      ...(state.drawingNodes.length > 0 ? { drawingNodes: state.drawingNodes } : {}),
      ...(state.mindMapNodes.length > 0 ? { mindMapNodes: state.mindMapNodes } : {}),
      ...(state.mindMapEdges.length > 0 ? { mindMapEdges: state.mindMapEdges } : {}),
      ...(state.crazy8sSlots.length > 0 ? { crazy8sSlots: state.crazy8sSlots } : {}),
      ...(state.conceptCards.length > 0 ? { conceptCards: state.conceptCards } : {}),
      ...(state.personaTemplates.length > 0 ? { personaTemplates: state.personaTemplates } : {}),
      ...(state.hmwCards.length > 0 ? { hmwCards: state.hmwCards } : {}),
      ...(state.selectedSlotIds.length > 0 ? { selectedSlotIds: state.selectedSlotIds } : {}),
      ...(state.brainRewritingMatrices.length > 0 ? { brainRewritingMatrices: state.brainRewritingMatrices } : {}),
    });
    state.markClean();
  }, [workshopId, stepId, canvasStoreApi]);

  // Save Crazy 8s: flush canvas state → transition to idea selection
  const handleSaveCrazy8s = React.useCallback(async () => {
    await flushCanvasState();
    setArtifactConfirmed(false);
    setCurrentPhase('idea-selection');
  }, [flushCanvasState]);

  // Save Idea Selection: persist selection, transition to brain rewriting (or skip)
  const handleSaveIdeaSelection = React.useCallback(async (skipBrainRewriting: boolean) => {
    if (!stepId) return;
    const state = canvasStoreApi.getState();

    // Persist selected slot IDs to store
    state.setSelectedSlotIds(localSelectedSlotIds);

    if (skipBrainRewriting) {
      // Skip brain rewriting — enable Next
      await flushCanvasState();
      setArtifactConfirmed(true);
    } else {
      // Initialize brain rewriting matrices for selected slots
      const matrices = localSelectedSlotIds.map((slotId) => {
        const slot = state.crazy8sSlots.find((s) => s.slotId === slotId);
        return createEmptyMatrix(slotId, slot?.imageUrl);
      });
      state.setBrainRewritingMatrices(matrices);

      // Persist including new matrices
      await flushCanvasState();
      setCurrentMatrixIndex(0);
      setCurrentPhase('brain-rewriting');
    }
  }, [stepId, canvasStoreApi, localSelectedSlotIds, flushCanvasState]);

  // Save Brain Rewriting: flush canvas and activate Next
  const handleSaveBrainRewriting = React.useCallback(async () => {
    await flushCanvasState();
    setArtifactConfirmed(true);
  }, [flushCanvasState]);

  // Handle brain rewriting cell update
  const handleBrainRewritingCellUpdate = React.useCallback(
    (slotId: string, cellId: string, imageUrl: string, drawingId: string) => {
      const state = canvasStoreApi.getState();
      state.updateBrainRewritingCell(slotId, cellId, { imageUrl, drawingId });
    },
    [canvasStoreApi]
  );

  // Show confirm button after AI's first response (auto-start trigger = 1, AI response = 2)
  const hasEnoughMessages = liveMessageCount >= 2;

  // Render chat panel
  const renderChatPanel = () => (
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
          stepOrder={8}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={initialMessages}
          onMessageCountChange={setLiveMessageCount}
          subStep={currentPhase}
          showStepConfirm={currentPhase === 'mind-mapping' && !showCrazy8s && hasEnoughMessages && mindMapHasThemes}
          onStepConfirm={handleStartCrazy8s}
          stepConfirmLabel="Confirm Mind Map"
          stepConfirmIsTransition
        />
      </div>
    </div>
  );

  // Render the canvas area based on current phase
  const renderCanvas = () => {
    // Idea Selection phase
    if (currentPhase === 'idea-selection') {
      const mindMapThemes = mindMapNodes.filter(n => n.level === 1);
      return (
        <div className="relative flex h-full flex-col">
          {/* Collapse button */}
          {!isMobile && (
            <div className="absolute top-2 right-2 z-20">
              <button
                onClick={() => setCanvasCollapsed(true)}
                className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
                title="Collapse canvas"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
            <IdeaSelection
              crazy8sSlots={crazy8sSlots}
              mindMapThemes={mindMapThemes}
              selectedSlotIds={localSelectedSlotIds}
              onSelectionChange={setLocalSelectedSlotIds}
              maxSelection={4}
            />
          </div>

          {/* Footer buttons */}
          <div className="flex shrink-0 items-center justify-between border-t bg-background px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setArtifactConfirmed(true);
                // Skip with current selection (or no selection)
                const state = canvasStoreApi.getState();
                state.setSelectedSlotIds(localSelectedSlotIds);
                flushCanvasState();
              }}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip to Step 9
            </Button>
            <div className="flex items-center gap-3">
              {localSelectedSlotIds.length === 0 && (
                <span className="text-xs text-muted-foreground">Tap sketches to select</span>
              )}
              <Button
                size="sm"
                disabled={localSelectedSlotIds.length === 0}
                onClick={() => handleSaveIdeaSelection(false)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Continue to Brain Rewriting
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Brain Rewriting phase
    if (currentPhase === 'brain-rewriting') {
      const matrices = brainRewritingMatrices;
      const currentMatrix = matrices[currentMatrixIndex];
      const currentSlot = crazy8sSlots.find(s => s.slotId === currentMatrix?.slotId);

      return (
        <div className="relative flex h-full flex-col">
          {/* Collapse button */}
          {!isMobile && (
            <div className="absolute top-2 right-2 z-20">
              <button
                onClick={() => setCanvasCollapsed(true)}
                className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
                title="Collapse canvas"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Header with navigation between concepts */}
          <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentMatrixIndex === 0}
              onClick={() => setCurrentMatrixIndex(i => i - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {currentSlot?.title || `Sketch ${currentMatrix?.slotId.replace('slot-', '')}`}
              {' '}
              <span className="text-muted-foreground">
                ({currentMatrixIndex + 1} of {matrices.length})
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentMatrixIndex >= matrices.length - 1}
              onClick={() => setCurrentMatrixIndex(i => i + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Brain rewriting grid */}
          <div className="flex-1 min-h-0">
            {currentMatrix && stepId && (
              <BrainRewritingCanvas
                matrix={currentMatrix}
                workshopId={workshopId}
                stepId={stepId}
                onCellUpdate={handleBrainRewritingCellUpdate}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t bg-background px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveBrainRewriting}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBrainRewriting}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Done
            </Button>
          </div>
        </div>
      );
    }

    // Default: Mind Map + Crazy 8s
    return (
      <div className="relative h-full">
        {/* Collapse button */}
        {!isMobile && (
          <div className="absolute top-2 right-2 z-20">
            <button
              onClick={() => setCanvasCollapsed(true)}
              className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
              title="Collapse canvas"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
        )}

        {stepId && (
          <MindMapCanvas
            workshopId={workshopId}
            stepId={stepId}
            hmwStatement={hmwStatement || artifact?.reframedHmw as string || ''}
            challengeStatement={challengeStatement}
            hmwGoals={hmwGoals}
            showCrazy8s={showCrazy8s}
            onSaveCrazy8s={handleSaveCrazy8s}
          />
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        {/* Mobile: tab-based layout */}
        <div className="flex border-b px-4">
          <button
            onClick={() => setMobileView('chat')}
            className={cn(
              'px-3 py-2 text-sm font-medium',
              mobileView === 'chat' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setMobileView('canvas')}
            className={cn(
              'px-3 py-2 text-sm font-medium',
              mobileView === 'canvas' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
            )}
          >
            Canvas
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {mobileView === 'chat' ? renderChatPanel() : renderCanvas()}
        </div>

        {/* Step navigation */}
        <StepNavigation
          sessionId={sessionId}
          workshopId={workshopId}
          currentStepOrder={8}
          artifactConfirmed={artifactConfirmed}
          stepExplicitlyConfirmed={artifactConfirmed}
          stepStatus={stepStatus}
          isAdmin={isAdmin}
          onReset={onReset}
          onToggleGuideEditor={handleToggleGuideEditor}
          isGuideEditing={isGuideEditing}
        />
      </div>
    );
  }

  // Desktop: resizable panels matching standard step-container layout
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
              <ResizablePanel defaultSize={480} minSize={280} maxSize="60%">
                {renderChatPanel()}
              </ResizablePanel>
              <PanelResizeHandle className="group relative flex w-2 items-center justify-center bg-border/40 transition-colors hover:bg-border data-[active]:bg-primary/20">
                <div className="z-10 flex h-8 w-3.5 items-center justify-center rounded-sm border bg-border">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
              </PanelResizeHandle>
              <ResizablePanel minSize="30%">
                <div className="h-full relative">
                  {renderCanvas()}
                </div>
              </ResizablePanel>
            </PanelGroup>
          )}

          {/* Chat takes full width when canvas collapsed */}
          {!chatCollapsed && canvasCollapsed && (
            <div className="flex-1">{renderChatPanel()}</div>
          )}

          {/* Canvas takes full width when chat collapsed */}
          {chatCollapsed && !canvasCollapsed && (
            <div className="flex-1 relative">
              {renderCanvas()}
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

      {/* Step navigation */}
      <StepNavigation
        sessionId={sessionId}
        workshopId={workshopId}
        currentStepOrder={8}
        artifactConfirmed={artifactConfirmed}
        stepExplicitlyConfirmed={artifactConfirmed}
        stepStatus={stepStatus}
        isAdmin={isAdmin}
        onReset={onReset}
        onToggleGuideEditor={handleToggleGuideEditor}
        isGuideEditing={isGuideEditing}
      />
    </div>
  );
}
