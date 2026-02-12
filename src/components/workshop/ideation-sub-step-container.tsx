'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { UIMessage } from 'ai';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatPanel } from './chat-panel';
import { OutputPanel } from './output-panel';
import { ArtifactConfirmation } from './artifact-confirmation';
import { StepNavigation } from './step-navigation';
import { IdeaSelection } from './idea-selection';
import { MindMapCanvas } from './mind-map-canvas';
import { Crazy8sCanvas } from './crazy-8s-canvas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Lightbulb, Zap, CheckCircle2, Check, Sparkles, ArrowRight } from 'lucide-react';
import { useCanvasStore } from '@/providers/canvas-store-provider';

type IdeationSubStep = 'mind-mapping' | 'crazy-eights' | 'idea-selection';

const SUB_STEP_ORDER: IdeationSubStep[] = ['mind-mapping', 'crazy-eights', 'idea-selection'];
const SUB_STEP_LABELS: Record<IdeationSubStep, string> = {
  'mind-mapping': 'Mind Mapping',
  'crazy-eights': 'Crazy 8s',
  'idea-selection': 'Idea Selection',
};

function getNextSubStep(current: IdeationSubStep): IdeationSubStep | null {
  const idx = SUB_STEP_ORDER.indexOf(current);
  return idx < SUB_STEP_ORDER.length - 1 ? SUB_STEP_ORDER[idx + 1] : null;
}

interface IdeationSubStepContainerProps {
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  initialArtifact?: Record<string, unknown> | null;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  onRevise?: () => void;
  onReset?: () => void;
  hmwStatement?: string;
}

export function IdeationSubStepContainer({
  sessionId,
  workshopId,
  initialMessages,
  initialArtifact,
  stepStatus,
  onRevise,
  onReset,
  hmwStatement,
}: IdeationSubStepContainerProps) {
  const router = useRouter();

  // State management
  const [currentSubStep, setCurrentSubStep] = React.useState<IdeationSubStep>('mind-mapping');
  const [isMobile, setIsMobile] = React.useState(false);
  const [artifact, setArtifact] = React.useState<Record<string, unknown> | null>(
    initialArtifact || null
  );
  const [liveMessageCount, setLiveMessageCount] = React.useState(0);
  const [mobileView, setMobileView] = React.useState<'chat' | 'canvas'>('chat');

  // Extraction state
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(null);

  // Artifact confirmation state
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(
    stepStatus === 'complete' && initialArtifact !== null
  );

  // Selection state (slot IDs instead of idea titles)
  const [selectedSlotIds, setSelectedSlotIds] = React.useState<string[]>([]);

  // Sub-step progress tracking
  const [mindMappingEngaged, setMindMappingEngaged] = React.useState(false);
  const [crazyEightsEngaged, setCrazyEightsEngaged] = React.useState(false);
  const [ideaSelectionEngaged, setIdeaSelectionEngaged] = React.useState(false);

  // Track engagement when user has enough messages in a sub-step
  React.useEffect(() => {
    if (liveMessageCount > 2) {
      if (currentSubStep === 'mind-mapping') setMindMappingEngaged(true);
      if (currentSubStep === 'crazy-eights') setCrazyEightsEngaged(true);
      if (currentSubStep === 'idea-selection') setIdeaSelectionEngaged(true);
    }
  }, [liveMessageCount, currentSubStep]);

  // Check for mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Extract artifact callback
  const extractArtifact = React.useCallback(async () => {
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const { getStepByOrder } = await import('@/lib/workshop/step-metadata');
      const step = getStepByOrder(8);
      if (!step) {
        setExtractionError('Step not found');
        return;
      }
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId, stepId: step.id, sessionId }),
      });
      const data = await response.json();
      if (response.ok) {
        setArtifact(data.artifact);
        setExtractionError(null);
      } else if (response.status === 422) {
        setExtractionError(data.message || 'Failed to extract artifact');
      } else if (response.status === 400) {
        setExtractionError(data.message || 'Not enough conversation to extract');
      } else if (response.status === 404) {
        setExtractionError('Session not found');
      } else {
        setExtractionError('An unexpected error occurred');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionError('Network error - please try again');
    } finally {
      setIsExtracting(false);
    }
  }, [workshopId, sessionId]);

  // ArtifactConfirmation handlers with selection merge
  const handleConfirm = React.useCallback(() => {
    if (artifact) {
      const updatedArtifact = {
        ...artifact,
        selectedSketchSlotIds: selectedSlotIds,
      };
      setArtifact(updatedArtifact);
    }
    setArtifactConfirmed(true);
  }, [artifact, selectedSlotIds]);

  const handleEdit = React.useCallback(() => {
    setArtifactConfirmed(false);
    setArtifact(null);
  }, []);

  // Complete a sub-step and auto-advance to next
  const handleSubStepComplete = React.useCallback((subStep: IdeationSubStep) => {
    if (subStep === 'mind-mapping') setMindMappingEngaged(true);
    if (subStep === 'crazy-eights') setCrazyEightsEngaged(true);
    if (subStep === 'idea-selection') setIdeaSelectionEngaged(true);

    const next = getNextSubStep(subStep);
    if (next) setCurrentSubStep(next);
  }, []);

  const hasEnoughMessages = liveMessageCount >= 4;

  // Get canvas state for mind map and crazy 8s
  const crazy8sSlots = useCanvasStore(state => state.crazy8sSlots);
  const mindMapNodes = useCanvasStore(state => state.mindMapNodes);

  // Extract mind map themes (level 1 nodes)
  const mindMapThemes = React.useMemo(() => {
    return mindMapNodes.filter(node => node.level === 1);
  }, [mindMapNodes]);

  // Pre-populate selectedSlotIds from artifact
  React.useEffect(() => {
    if (artifact && (artifact.selectedSketchSlotIds as string[])?.length > 0) {
      setSelectedSlotIds((artifact.selectedSketchSlotIds as string[]) || []);
    }
  }, [artifact]);

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

  // Render chat panel with Extract Output button
  const renderChatPanel = (subStep: IdeationSubStep) => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <ChatPanel
          stepOrder={8}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={initialMessages}
          onMessageCountChange={setLiveMessageCount}
          subStep={subStep}
        />
      </div>
      {/* Sub-step action: Continue to next OR Extract Output on last sub-step */}
      {currentSubStep === subStep && hasEnoughMessages && (() => {
        const next = getNextSubStep(subStep);
        if (next) {
          return (
            <div className="flex shrink-0 justify-center border-t bg-background p-4">
              <Button onClick={() => handleSubStepComplete(subStep)} size="sm">
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue to {SUB_STEP_LABELS[next]}
              </Button>
            </div>
          );
        }
        // Last sub-step: show Extract Output
        if (!artifact && !isExtracting) {
          return (
            <div className="flex shrink-0 justify-center border-t bg-background p-4">
              <Button onClick={extractArtifact} variant="outline" size="sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Extract Output
              </Button>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );

  // Render output panel with IdeaSelection and ArtifactConfirmation (for idea-selection tab only)
  const renderOutputPanel = (subStep: IdeationSubStep) => (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* IdeaSelection -- shown in idea-selection tab when artifact exists */}
        {currentSubStep === subStep && subStep === 'idea-selection' && (
          <div className="p-4">
            <IdeaSelection
              crazy8sSlots={crazy8sSlots}
              mindMapThemes={mindMapThemes}
              selectedSlotIds={selectedSlotIds}
              onSelectionChange={setSelectedSlotIds}
              maxSelection={4}
            />
          </div>
        )}
      </div>
      {/* ArtifactConfirmation below */}
      {currentSubStep === subStep && artifact && (
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

  return (
    <div className="flex h-full flex-col">
      {/* Sub-step progress header */}
      <div className="border-b bg-muted/30 px-6 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Step 8: Ideation</span>
          <span className="text-muted-foreground">--</span>
          <span className="text-muted-foreground">
            {currentSubStep === 'mind-mapping' && '8a: Mind Mapping'}
            {currentSubStep === 'crazy-eights' && '8b: Crazy 8s'}
            {currentSubStep === 'idea-selection' && '8c: Idea Selection'}
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <Tabs
        value={currentSubStep}
        onValueChange={(v) => setCurrentSubStep(v as IdeationSubStep)}
        className="flex flex-1 flex-col min-h-0"
      >
        <div className="border-b px-6">
          <TabsList className="h-10">
            <TabsTrigger value="mind-mapping" className="gap-2">
              <Lightbulb className="h-3.5 w-3.5" />
              Mind Mapping
              {mindMappingEngaged && <Check className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="crazy-eights" className="gap-2">
              <Zap className="h-3.5 w-3.5" />
              Crazy 8s
              {crazyEightsEngaged && <Check className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="idea-selection" className="gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Idea Selection
              {ideaSelectionEngaged && <Check className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Mind Mapping tab: chat + canvas layout */}
        <TabsContent
          value="mind-mapping"
          forceMount
          className={cn(
            'flex-1 min-h-0 mt-0',
            currentSubStep !== 'mind-mapping' && 'hidden'
          )}
        >
          {isMobile ? (
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
                  Mind Map
                </button>
              </div>
              <div className="min-h-0 flex-1">
                {mobileView === 'chat' ? (
                  renderChatPanel('mind-mapping')
                ) : (
                  stepId && (
                    <MindMapCanvas
                      workshopId={workshopId}
                      stepId={stepId}
                      hmwStatement={hmwStatement || artifact?.reframedHmw as string || ''}
                    />
                  )
                )}
              </div>
            </div>
          ) : (
            <Group orientation="horizontal" className="h-full">
              <Panel defaultSize={40} minSize={30}>
                {renderChatPanel('mind-mapping')}
              </Panel>
              <Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
                <div className="absolute inset-y-0 -left-3 -right-3" />
                <div className="absolute inset-y-0 left-0 w-px bg-ring opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100" />
              </Separator>
              <Panel defaultSize={60} minSize={30}>
                <div className="h-full">
                  {stepId && (
                    <MindMapCanvas
                      workshopId={workshopId}
                      stepId={stepId}
                      hmwStatement={hmwStatement || artifact?.reframedHmw as string || ''}
                    />
                  )}
                </div>
              </Panel>
            </Group>
          )}
        </TabsContent>

        {/* Crazy 8s tab: chat + canvas layout */}
        <TabsContent
          value="crazy-eights"
          forceMount
          className={cn(
            'flex-1 min-h-0 mt-0',
            currentSubStep !== 'crazy-eights' && 'hidden'
          )}
        >
          {isMobile ? (
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
                  Crazy 8s
                </button>
              </div>
              <div className="min-h-0 flex-1">
                {mobileView === 'chat' ? (
                  renderChatPanel('crazy-eights')
                ) : (
                  stepId && (
                    <Crazy8sCanvas
                      workshopId={workshopId}
                      stepId={stepId}
                    />
                  )
                )}
              </div>
            </div>
          ) : (
            <Group orientation="horizontal" className="h-full">
              <Panel defaultSize={40} minSize={30}>
                {renderChatPanel('crazy-eights')}
              </Panel>
              <Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
                <div className="absolute inset-y-0 -left-3 -right-3" />
                <div className="absolute inset-y-0 left-0 w-px bg-ring opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100" />
              </Separator>
              <Panel defaultSize={60} minSize={30}>
                <div className="h-full">
                  {stepId && (
                    <Crazy8sCanvas
                      workshopId={workshopId}
                      stepId={stepId}
                    />
                  )}
                </div>
              </Panel>
            </Group>
          )}
        </TabsContent>

        {/* Idea Selection tab: chat + output panel */}
        <TabsContent
          value="idea-selection"
          forceMount
          className={cn(
            'flex-1 min-h-0 mt-0',
            currentSubStep !== 'idea-selection' && 'hidden'
          )}
        >
          {isMobile ? (
            /* Mobile: stacked layout */
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1 border-b">
                {renderChatPanel('idea-selection')}
              </div>
              <div className="min-h-0 flex-1">
                {renderOutputPanel('idea-selection')}
              </div>
            </div>
          ) : (
            /* Desktop: resizable panels */
            <Group orientation="horizontal" className="h-full">
              <Panel defaultSize={40} minSize={30}>
                {renderChatPanel('idea-selection')}
              </Panel>
              <Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
                <div className="absolute inset-y-0 -left-3 -right-3" />
                <div className="absolute inset-y-0 left-0 w-px bg-ring opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100" />
              </Separator>
              <Panel defaultSize={60} minSize={30}>
                {renderOutputPanel('idea-selection')}
              </Panel>
            </Group>
          )}
        </TabsContent>
      </Tabs>

      {/* Step navigation (shared across all sub-steps) */}
      <StepNavigation
        sessionId={sessionId}
        workshopId={workshopId}
        currentStepOrder={8}
        artifactConfirmed={artifactConfirmed}
        stepStatus={stepStatus}
        onRevise={onRevise}
        onReset={onReset}
      />
    </div>
  );
}
