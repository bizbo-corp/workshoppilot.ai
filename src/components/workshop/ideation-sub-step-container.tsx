'use client';

import * as React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { UIMessage } from 'ai';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatPanel } from './chat-panel';
import { OutputPanel } from './output-panel';
import { StepNavigation } from './step-navigation';
import { cn } from '@/lib/utils';
import { Lightbulb, Zap, PenTool } from 'lucide-react';

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
  // State management
  const [currentSubStep, setCurrentSubStep] = React.useState<IdeationSubStep>('mind-mapping');
  const [isMobile, setIsMobile] = React.useState(false);
  const [artifact, setArtifact] = React.useState<Record<string, unknown> | null>(
    initialArtifact || null
  );
  const [liveMessageCount, setLiveMessageCount] = React.useState(0);

  // Check for mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
            </TabsTrigger>
            <TabsTrigger value="crazy-eights" className="gap-2">
              <Zap className="h-3.5 w-3.5" />
              Crazy 8s
            </TabsTrigger>
            <TabsTrigger value="brain-writing" className="gap-2">
              <PenTool className="h-3.5 w-3.5" />
              Brain Writing
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
                  <ChatPanel
                    stepOrder={8}
                    sessionId={sessionId}
                    workshopId={workshopId}
                    initialMessages={initialMessages}
                    onMessageCountChange={setLiveMessageCount}
                    subStep={subStep}
                  />
                </div>
                <div className="min-h-0 flex-1">
                  <OutputPanel
                    stepOrder={8}
                    artifact={artifact}
                    isExtracting={false}
                    extractionError={null}
                    onRetry={() => {}}
                  />
                </div>
              </div>
            ) : (
              /* Desktop: resizable panels */
              <Group orientation="horizontal" className="h-full">
                <Panel defaultSize={50} minSize={30}>
                  <ChatPanel
                    stepOrder={8}
                    sessionId={sessionId}
                    workshopId={workshopId}
                    initialMessages={initialMessages}
                    onMessageCountChange={setLiveMessageCount}
                    subStep={subStep}
                  />
                </Panel>
                <Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
                  <div className="absolute inset-y-0 -left-3 -right-3" />
                  <div className="absolute inset-y-0 left-0 w-px bg-ring opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100" />
                </Separator>
                <Panel defaultSize={50} minSize={25}>
                  <OutputPanel
                    stepOrder={8}
                    artifact={artifact}
                    isExtracting={false}
                    extractionError={null}
                    onRetry={() => {}}
                  />
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
        artifactConfirmed={false}
        stepStatus={stepStatus}
        onRevise={onRevise}
        onReset={onReset}
      />
    </div>
  );
}
