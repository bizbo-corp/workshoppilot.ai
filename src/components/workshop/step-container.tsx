'use client';

import * as React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { ChatPanel } from './chat-panel';
import { OutputPanel } from './output-panel';
import { cn } from '@/lib/utils';

interface StepContainerProps {
  stepOrder: number;
}

export function StepContainer({ stepOrder }: StepContainerProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile: stacked layout
  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 border-b">
          <ChatPanel stepOrder={stepOrder} />
        </div>
        <div className="flex-1">
          <OutputPanel stepOrder={stepOrder} />
        </div>
      </div>
    );
  }

  // Desktop: resizable panels
  return (
    <Group orientation="horizontal" className="h-full">
      <Panel defaultSize={50} minSize={30}>
        <ChatPanel stepOrder={stepOrder} />
      </Panel>

      <Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
        {/* Invisible touch-friendly hit area */}
        <div className="absolute inset-y-0 -left-3 -right-3" />
        {/* Visual indicator on hover */}
        <div className="absolute inset-y-0 left-0 w-px bg-ring opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100" />
      </Separator>

      <Panel defaultSize={50} minSize={25}>
        <OutputPanel stepOrder={stepOrder} />
      </Panel>
    </Group>
  );
}
