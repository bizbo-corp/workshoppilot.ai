'use client';

import * as React from 'react';

import type { UIMessage } from 'ai';
import { ChatPanel } from './chat-panel';
import { ArtifactConfirmation } from './artifact-confirmation';
import { StepNavigation } from './step-navigation';
import { MindMapCanvas } from './mind-map-canvas';
import { Crazy8sCanvas } from './crazy-8s-canvas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, MessageSquare, LayoutGrid, PanelLeftClose, PanelRightClose, Zap } from 'lucide-react';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { usePanelLayout } from '@/hooks/use-panel-layout';

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

  // Mind map has content when there are level-1 theme nodes
  const mindMapHasThemes = React.useMemo(
    () => mindMapNodes.filter(node => node.level === 1).length > 0,
    [mindMapNodes]
  );

  // Auto-show crazy 8s if slots already have content (resuming session)
  React.useEffect(() => {
    if (crazy8sSlots.some(slot => slot.imageUrl)) {
      setShowCrazy8s(true);
      setCurrentPhase('crazy-eights');
    }
  }, []);

  // Check for mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Refs for scrolling to crazy 8s section
  const crazy8sRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Transition to crazy 8s phase
  const handleStartCrazy8s = React.useCallback(() => {
    setShowCrazy8s(true);
    setCurrentPhase('crazy-eights');
    // Scroll horizontally to crazy 8s section after render
    setTimeout(() => {
      if (scrollContainerRef.current && crazy8sRef.current) {
        scrollContainerRef.current.scrollTo({
          left: crazy8sRef.current.offsetLeft,
          behavior: 'smooth',
        });
      }
    }, 100);
  }, []);

  // ArtifactConfirmation handlers
  const handleConfirm = React.useCallback(() => {
    setArtifactConfirmed(true);
  }, []);

  const handleEdit = React.useCallback(() => {
    setArtifactConfirmed(false);
    setArtifact(null);
  }, []);

  const hasEnoughMessages = liveMessageCount >= 4;

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

  // Render the canvas area with mind map + crazy 8s side by side horizontally
  const renderCanvas = () => (
    <div className="relative h-full">
      {/* Collapse button — pinned top-right, outside scroll container */}
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

      {/* Horizontal scroll container */}
      <div ref={scrollContainerRef} className="flex h-full overflow-x-auto">
        {/* Mind Map section */}
        <div
          className={cn(
            'h-full shrink-0',
            !showCrazy8s && 'w-full',
          )}
          style={showCrazy8s && !isMobile ? { aspectRatio: '3 / 2' } : undefined}
        >
          {stepId && (
            <MindMapCanvas
              workshopId={workshopId}
              stepId={stepId}
              hmwStatement={hmwStatement || artifact?.reframedHmw as string || ''}
            />
          )}
        </div>

        {/* Crazy 8s section — appears to the right of mind map */}
        {showCrazy8s && (
          <div ref={crazy8sRef} className="flex h-full shrink-0 flex-col border-l" style={{ minWidth: '800px' }}>
            <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Crazy 8s</span>
            </div>
            <div className="min-h-0 flex-1">
              {stepId && (
                <Crazy8sCanvas
                  workshopId={workshopId}
                  stepId={stepId}
                />
              )}
            </div>
          </div>
        )}
      </div>
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
