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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Lightbulb, Zap, PenTool, Check, Sparkles } from 'lucide-react';

type IdeationSubStep = 'mind-mapping' | 'crazy-eights' | 'brain-writing';

interface IdeationSubStepContainerProps {
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  initialArtifact?: Record<string, unknown> | null;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  onRevise?: () => void;
  onReset?: () => void;
}

export function IdeationSubStepContainer({
  sessionId,
  workshopId,
  initialMessages,
  initialArtifact,
  stepStatus,
  onRevise,
  onReset,
}: IdeationSubStepContainerProps) {
  const router = useRouter();

  // State management
  const [currentSubStep, setCurrentSubStep] = React.useState<IdeationSubStep>('mind-mapping');
  const [isMobile, setIsMobile] = React.useState(false);
  const [artifact, setArtifact] = React.useState<Record<string, unknown> | null>(
    initialArtifact || null
  );
  const [liveMessageCount, setLiveMessageCount] = React.useState(0);

  // Extraction state
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(null);

  // Artifact confirmation state
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(
    stepStatus === 'complete' && initialArtifact !== null
  );

  // Selection state
  const [selectedIdeas, setSelectedIdeas] = React.useState<string[]>([]);
  const [userAddedIdeas, setUserAddedIdeas] = React.useState<Array<{title: string; description: string}>>([]);

  // Sub-step progress tracking
  const [mindMappingEngaged, setMindMappingEngaged] = React.useState(false);
  const [crazyEightsEngaged, setCrazyEightsEngaged] = React.useState(false);
  const [brainWritingEngaged, setBrainWritingEngaged] = React.useState(false);

  // Track engagement when user has enough messages in a sub-step
  React.useEffect(() => {
    if (liveMessageCount > 2) {
      if (currentSubStep === 'mind-mapping') setMindMappingEngaged(true);
      if (currentSubStep === 'crazy-eights') setCrazyEightsEngaged(true);
      if (currentSubStep === 'brain-writing') setBrainWritingEngaged(true);
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
        selectedIdeaTitles: selectedIdeas,
        userIdeas: [
          ...((artifact.userIdeas as Array<{title: string; description: string}>) || []),
          ...userAddedIdeas.filter(ua =>
            !((artifact.userIdeas as Array<{title: string; description: string}>) || [])
              .some(existing => existing.title === ua.title)
          ),
        ],
      };
      setArtifact(updatedArtifact);
    }
    setArtifactConfirmed(true);
  }, [artifact, selectedIdeas, userAddedIdeas]);

  const handleEdit = React.useCallback(() => {
    setArtifactConfirmed(false);
    setArtifact(null);
  }, []);

  const hasEnoughMessages = liveMessageCount >= 4;

  // Extract all ideas from artifact for IdeaSelection
  const allIdeasFromArtifact = React.useMemo(() => {
    if (!artifact) return [];
    const items: Array<{title: string; description: string; source: 'mind-mapping' | 'crazy-eights' | 'brain-writing' | 'user'; isWildCard?: boolean}> = [];

    // Clusters from mind mapping
    const clusters = (artifact.clusters as Array<{theme: string; ideas: Array<{title: string; description: string; isWildCard?: boolean}>}>) || [];
    clusters.forEach(cluster => {
      cluster.ideas.forEach(idea => {
        items.push({ ...idea, source: 'mind-mapping' });
      });
    });

    // Crazy 8s ideas
    const crazy8s = (artifact.crazyEightsIdeas as Array<{title: string; description: string}>) || [];
    crazy8s.forEach(idea => {
      items.push({ ...idea, source: 'crazy-eights' });
    });

    // Brain written ideas (use finalVersion as title)
    const brainWritten = (artifact.brainWrittenIdeas as Array<{originalTitle: string; finalVersion: string; evolutionDescription: string}>) || [];
    brainWritten.forEach(idea => {
      items.push({
        title: idea.finalVersion,
        description: idea.evolutionDescription,
        source: 'brain-writing'
      });
    });

    // User ideas already in artifact
    const existingUserIdeas = (artifact.userIdeas as Array<{title: string; description: string}>) || [];
    existingUserIdeas.forEach(idea => {
      items.push({ ...idea, source: 'user' });
    });

    return items;
  }, [artifact]);

  // Pre-populate selectedIdeas from artifact
  React.useEffect(() => {
    if (artifact && (artifact.selectedIdeaTitles as string[])?.length > 0) {
      setSelectedIdeas((artifact.selectedIdeaTitles as string[]) || []);
    }
  }, [artifact]);

  // User idea handlers
  const handleAddUserIdea = (idea: {title: string; description: string}) => {
    setUserAddedIdeas(prev => [...prev, idea]);
  };

  const handleRemoveUserIdea = (title: string) => {
    setUserAddedIdeas(prev => prev.filter(i => i.title !== title));
    setSelectedIdeas(prev => prev.filter(t => t !== title));
  };

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
      {/* Extract Output button -- only shown in the active tab when conditions met */}
      {currentSubStep === subStep && hasEnoughMessages && !artifact && !isExtracting && (
        <div className="flex shrink-0 justify-center border-t bg-background p-4">
          <Button onClick={extractArtifact} variant="outline" size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Extract Output
          </Button>
        </div>
      )}
    </div>
  );

  // Render output panel with IdeaSelection and ArtifactConfirmation
  const renderOutputPanel = (subStep: IdeationSubStep) => (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <OutputPanel
          stepOrder={8}
          artifact={artifact}
          isExtracting={isExtracting}
          extractionError={extractionError}
          onRetry={extractArtifact}
        />
        {/* IdeaSelection -- shown in brain-writing tab when artifact exists */}
        {currentSubStep === subStep && subStep === 'brain-writing' && artifact && !artifactConfirmed && (
          <div className="border-t p-4">
            <IdeaSelection
              ideas={allIdeasFromArtifact}
              selectedTitles={selectedIdeas}
              onSelectionChange={setSelectedIdeas}
              userAddedIdeas={userAddedIdeas}
              onAddUserIdea={handleAddUserIdea}
              onRemoveUserIdea={handleRemoveUserIdea}
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
            {currentSubStep === 'brain-writing' && '8c: Brain Writing'}
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
            <TabsTrigger value="brain-writing" className="gap-2">
              <PenTool className="h-3.5 w-3.5" />
              Brain Writing
              {brainWritingEngaged && <Check className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Each tab: forceMount + hidden class for state preservation */}
        {(['mind-mapping', 'crazy-eights', 'brain-writing'] as const).map((subStep) => (
          <TabsContent
            key={subStep}
            value={subStep}
            forceMount
            className={cn(
              'flex-1 min-h-0 mt-0',
              currentSubStep !== subStep && 'hidden'
            )}
          >
            {isMobile ? (
              /* Mobile: stacked layout */
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1 border-b">
                  {renderChatPanel(subStep)}
                </div>
                <div className="min-h-0 flex-1">
                  {renderOutputPanel(subStep)}
                </div>
              </div>
            ) : (
              /* Desktop: resizable panels */
              <Group orientation="horizontal" className="h-full">
                <Panel defaultSize={50} minSize={30}>
                  {renderChatPanel(subStep)}
                </Panel>
                <Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
                  <div className="absolute inset-y-0 -left-3 -right-3" />
                  <div className="absolute inset-y-0 left-0 w-px bg-ring opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100" />
                </Separator>
                <Panel defaultSize={50} minSize={25}>
                  {renderOutputPanel(subStep)}
                </Panel>
              </Group>
            )}
          </TabsContent>
        ))}
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
