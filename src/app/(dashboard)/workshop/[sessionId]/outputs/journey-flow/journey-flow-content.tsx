'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Heading, Text } from '@/components/ui/typography';

import {
  JourneyFlowStoreProvider,
  useJourneyFlowStore,
  useJourneyFlowStoreApi,
} from '@/providers/journey-flow-store-provider';
import { JourneyFlowCanvas } from '@/components/journey-flow/journey-flow-canvas';
import type { JourneyFlowState } from '@/lib/journey-flow/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface JourneyFlowContentProps {
  sessionId: string;
  workshopId: string;
  savedState: Partial<JourneyFlowState> | null;
  isReadOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Inner component (must be inside JourneyFlowStoreProvider to access hooks)
// ---------------------------------------------------------------------------

function JourneyFlowInner({
  sessionId,
  workshopId,
  isReadOnly,
}: Omit<JourneyFlowContentProps, 'savedState'>) {
  const storeApi = useJourneyFlowStoreApi();
  const nodes = useJourneyFlowStore((s) => s.nodes);
  const isDirty = useJourneyFlowStore((s) => s.isDirty);
  const hasNodes = nodes.length > 0;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave on dirty changes (debounced 2s)
  useEffect(() => {
    if (!isDirty || isReadOnly) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const state = storeApi.getState();
        // Never save empty state (guards against a reset racing with this timer)
        if (state.nodes.length === 0) return;
        await fetch('/api/build-pack/save-journey-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workshopId, state }),
        });
        storeApi.getState().markClean();
      } catch (err) {
        console.error('Autosave failed:', err);
      }
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, workshopId, isReadOnly, storeApi]);

  // ---------------------------------------------------------------------------
  // handleAddFirstScreen — places a single node and flips hasNodes → canvas shows
  // ---------------------------------------------------------------------------

  function handleAddFirstScreen() {
    storeApi.getState().addNode({
      id: `jf-node-${Date.now()}`,
      name: 'New Screen',
      uiType: 'landing-page',
      purpose: '',
      keyElements: [],
      priority: 'must-have',
      position: { x: 100, y: 100 },
    });
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (!hasNodes) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Icon name="workflow" className="h-8 w-8 text-primary" />
            </div>
          </div>
          <Heading level={2} className="text-xl">Journey Flow</Heading>
          <Text variant="muted">
            Map the screens of the flow you want to test. Add your first screen to get started.
          </Text>
          {isReadOnly ? (
            <Text variant="muted">No journey flow has been created yet.</Text>
          ) : (
            <Button
              onClick={handleAddFirstScreen}
              variant="primary"
              className="gap-2"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add your first screen
            </Button>
          )}
          <div>
            <Link
              href={`/workshop/${sessionId}/outputs`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="arrow-left" className="h-3.5 w-3.5" />
              Back to Build Pack
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Canvas (once at least one node exists)
  // ---------------------------------------------------------------------------

  return (
    <JourneyFlowCanvas
      workshopId={workshopId}
      sessionId={sessionId}
      isReadOnly={isReadOnly}
    />
  );
}

// ---------------------------------------------------------------------------
// Public export — wraps inner in the store provider
// ---------------------------------------------------------------------------

export function JourneyFlowContent({
  sessionId,
  workshopId,
  savedState,
  isReadOnly,
}: JourneyFlowContentProps) {
  return (
    <div className="h-full w-full relative">
      <JourneyFlowStoreProvider initialState={savedState ?? undefined}>
        <JourneyFlowInner
          sessionId={sessionId}
          workshopId={workshopId}
          isReadOnly={isReadOnly}
        />
      </JourneyFlowStoreProvider>
    </div>
  );
}
