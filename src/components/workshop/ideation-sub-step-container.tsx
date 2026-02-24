'use client';

import * as React from 'react';

import type { UIMessage } from 'ai';
import { ChatPanel } from './chat-panel';
import { StepNavigation } from './step-navigation';
import { MindMapCanvas } from './mind-map-canvas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/lib/utils/confetti';
import { MessageSquare, LayoutGrid, PanelLeftClose, PanelRightClose, GripVertical } from 'lucide-react';
import { Panel as ResizablePanel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { usePanelLayout } from '@/hooks/use-panel-layout';
import { saveCanvasState } from '@/actions/canvas-actions';
import { createEmptyMatrix } from '@/lib/canvas/brain-rewriting-types';
import { EMPTY_CRAZY_8S_SLOTS } from '@/lib/canvas/crazy-8s-types';

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

  // Loading state for AI enhancement during mind map → crazy 8s transition
  const [isEnhancingIdeas, setIsEnhancingIdeas] = React.useState(false);

  // Transition to crazy 8s phase — pre-fill slots with AI-enhanced titles + descriptions
  const handleStartCrazy8s = React.useCallback(async () => {
    const state = canvasStoreApi.getState();
    const starredLabels = state.mindMapNodes
      .filter((n) => n.isStarred && !n.isRoot && n.label.trim())
      .map((n) => n.label.trim())
      .slice(0, 8);

    if (starredLabels.length > 0) {
      // Try AI enhancement
      setIsEnhancingIdeas(true);
      try {
        const response = await fetch('/api/ai/enhance-sketch-ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workshopId, ideas: starredLabels }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiSlots = data.slots as { title: string; description: string }[];
          const slots = EMPTY_CRAZY_8S_SLOTS.map((slot, i) => ({
            ...slot,
            title: aiSlots[i]?.title || starredLabels[i] || '',
            description: aiSlots[i]?.description || '',
          }));
          state.setCrazy8sSlots(slots);
        } else {
          // Fallback: raw labels as titles
          const slots = EMPTY_CRAZY_8S_SLOTS.map((slot, i) => ({
            ...slot,
            title: starredLabels[i] || '',
          }));
          state.setCrazy8sSlots(slots);
        }
      } catch {
        // Fallback: raw labels as titles
        const slots = EMPTY_CRAZY_8S_SLOTS.map((slot, i) => ({
          ...slot,
          title: starredLabels[i] || '',
        }));
        state.setCrazy8sSlots(slots);
      } finally {
        setIsEnhancingIdeas(false);
      }
      state.markDirty();
    }

    setShowCrazy8s(true);
    setCurrentPhase('crazy-eights');
  }, [canvasStoreApi, workshopId]);

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

  // Save Crazy 8s: flush canvas state → transition to idea selection (inline on canvas)
  const handleSaveCrazy8s = React.useCallback(async () => {
    await flushCanvasState();
    setArtifactConfirmed(false);
    setCurrentPhase('idea-selection');
  }, [flushCanvasState]);

  // Back to drawing mode from idea selection
  const handleBackToDrawing = React.useCallback(() => {
    setCurrentPhase('crazy-eights');
  }, []);

  // Confirm selection from inline Crazy 8s node → brain rewriting (or skip)
  const handleConfirmSelection = React.useCallback(async (skip: boolean) => {
    if (!stepId) return;
    const state = canvasStoreApi.getState();

    // Persist selected slot IDs to store
    state.setSelectedSlotIds(localSelectedSlotIds);

    if (skip) {
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
          stepConfirmLabel={isEnhancingIdeas ? 'Enhancing ideas...' : 'Confirm Mind Map'}
          stepConfirmIsTransition
          stepConfirmDisabled={isEnhancingIdeas}
        />
      </div>
    </div>
  );

  // Render the canvas area — always MindMapCanvas, with phase-appropriate props
  const renderCanvas = () => {
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
            // Selection mode (shown inline on crazy 8s node)
            selectionMode={currentPhase === 'idea-selection'}
            selectedSlotIds={localSelectedSlotIds}
            onSelectionChange={setLocalSelectedSlotIds}
            onConfirmSelection={handleConfirmSelection}
            onBackToDrawing={handleBackToDrawing}
            // Brain rewriting (shown as side-by-side nodes)
            brainRewritingMatrices={currentPhase === 'brain-rewriting' ? brainRewritingMatrices : undefined}
            onBrainRewritingCellUpdate={handleBrainRewritingCellUpdate}
            onBrainRewritingDone={handleSaveBrainRewriting}
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
