'use client';

import * as React from 'react';

import type { UIMessage } from 'ai';
import { ChatPanel } from './chat-panel';
import { ArtifactConfirmation } from './artifact-confirmation';
import { StepNavigation } from './step-navigation';
import { MindMapCanvas } from './mind-map-canvas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, LayoutGrid, PanelLeftClose, PanelRightClose, Zap } from 'lucide-react';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { usePanelLayout } from '@/hooks/use-panel-layout';
import { saveCanvasState } from '@/actions/canvas-actions';

type IdeationPhase = 'mind-mapping' | 'crazy-eights';

interface IdeationSubStepContainerProps {
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  initialArtifact?: Record<string, unknown> | null;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  isAdmin?: boolean;
  onReset?: () => void;
  hmwStatement?: string;
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
}: IdeationSubStepContainerProps) {
  const { chatCollapsed, canvasCollapsed, setChatCollapsed, setCanvasCollapsed } = usePanelLayout();

  // Phase management: mind-mapping → crazy-eights
  const [currentPhase, setCurrentPhase] = React.useState<IdeationPhase>('mind-mapping');
  const [showCrazy8s, setShowCrazy8s] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [artifact, setArtifact] = React.useState<Record<string, unknown> | null>(
    initialArtifact || null
  );
  const [liveMessageCount, setLiveMessageCount] = React.useState(0);
  const [mobileView, setMobileView] = React.useState<'chat' | 'canvas'>('chat');

  // Artifact confirmation state
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(
    stepStatus === 'complete' && initialArtifact !== null
  );

  // Canvas state
  const mindMapNodes = useCanvasStore(state => state.mindMapNodes);
  const crazy8sSlots = useCanvasStore(state => state.crazy8sSlots);
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

  // Auto-show crazy 8s if slots already have content (resuming session)
  React.useEffect(() => {
    const slots = canvasStoreApi.getState().crazy8sSlots;
    if (slots.some(slot => slot.imageUrl)) {
      setShowCrazy8s(true);
      setCurrentPhase('crazy-eights');
      setArtifactConfirmed(true);
    }
  }, [canvasStoreApi]);

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

  // ArtifactConfirmation handlers
  const handleConfirm = React.useCallback(() => {
    setArtifactConfirmed(true);
  }, []);

  const handleEdit = React.useCallback(() => {
    setArtifactConfirmed(false);
    setArtifact(null);
  }, []);

  // Save Crazy 8s: flush full canvas state to DB and activate Next button
  const handleSaveCrazy8s = React.useCallback(async () => {
    if (!stepId) return;
    const state = canvasStoreApi.getState();
    await saveCanvasState(workshopId, stepId, {
      postIts: state.postIts,
      ...(state.gridColumns.length > 0 ? { gridColumns: state.gridColumns } : {}),
      ...(state.drawingNodes.length > 0 ? { drawingNodes: state.drawingNodes } : {}),
      ...(state.mindMapNodes.length > 0 ? { mindMapNodes: state.mindMapNodes } : {}),
      ...(state.mindMapEdges.length > 0 ? { mindMapEdges: state.mindMapEdges } : {}),
      ...(state.crazy8sSlots.length > 0 ? { crazy8sSlots: state.crazy8sSlots } : {}),
      ...(state.conceptCards.length > 0 ? { conceptCards: state.conceptCards } : {}),
      ...(state.personaTemplates.length > 0 ? { personaTemplates: state.personaTemplates } : {}),
      ...(state.hmwCards.length > 0 ? { hmwCards: state.hmwCards } : {}),
    });
    state.markClean();
    setArtifactConfirmed(true);
  }, [workshopId, stepId, canvasStoreApi]);

  const hasEnoughMessages = liveMessageCount >= 4;

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
        />
      </div>
      {/* Transition button: Continue to Crazy 8s */}
      {currentPhase === 'mind-mapping' && !showCrazy8s && hasEnoughMessages && mindMapHasThemes && (
        <div className="flex shrink-0 justify-center border-t bg-background p-4">
          <Button onClick={handleStartCrazy8s} size="sm">
            <Zap className="mr-2 h-4 w-4" />
            Continue to Crazy 8s
          </Button>
        </div>
      )}
    </div>
  );

  // Render the combined ReactFlow canvas (mind map + crazy 8s side by side)
  const renderCanvas = () => (
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
          showCrazy8s={showCrazy8s}
          onSaveCrazy8s={handleSaveCrazy8s}
        />
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Step header */}
      <div className="border-b bg-muted/30 px-6 py-3">
        <div className="flex items-center gap-2 text-base">
          <span className="font-medium">Step 8: Ideation</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0">
        {isMobile ? (
          /* Mobile: toggle between chat and canvas */
          <div className="flex h-full flex-col">
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
          </div>
        ) : (
          /* Desktop: chat + canvas side by side */
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

            {/* Chat takes full width when canvas collapsed */}
            {!chatCollapsed && canvasCollapsed && (
              <div className="flex-1">{renderChatPanel()}</div>
            )}

            {/* Both panels visible */}
            {!chatCollapsed && !canvasCollapsed && (
              <>
                <div className="w-[400px] shrink-0 border-r">
                  {renderChatPanel()}
                </div>
                <div className="flex-1 min-w-0 relative">
                  {renderCanvas()}
                </div>
              </>
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
        )}
      </div>

      {/* Step navigation */}
      <StepNavigation
        sessionId={sessionId}
        workshopId={workshopId}
        currentStepOrder={8}
        artifactConfirmed={artifactConfirmed}
        stepStatus={stepStatus}
        isAdmin={isAdmin}
        onReset={onReset}
      />
    </div>
  );
}
