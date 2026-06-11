'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/typography';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  JourneyFlowStoreProvider,
  useJourneyFlowStore,
  useJourneyFlowStoreApi,
} from '@/providers/journey-flow-store-provider';
import { JourneyFlowCanvas } from '@/components/journey-flow/journey-flow-canvas';
import { ScopeChooser } from '@/components/journey-flow/scope-chooser';
import type { ScopeChooserConcept } from '@/components/journey-flow/scope-chooser';
import type { JourneyFlowState, TestScope } from '@/lib/journey-flow/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface JourneyFlowContentProps {
  sessionId: string;
  workshopId: string;
  savedState: Partial<JourneyFlowState> | null;
  concepts: ScopeChooserConcept[];
  isReadOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Inner component (must be inside JourneyFlowStoreProvider to access hooks)
// ---------------------------------------------------------------------------

function JourneyFlowInner({
  sessionId,
  workshopId,
  concepts,
  isReadOnly,
}: Omit<JourneyFlowContentProps, 'savedState'>) {
  const storeApi = useJourneyFlowStoreApi();
  const nodes = useJourneyFlowStore((s) => s.nodes);
  const isDirty = useJourneyFlowStore((s) => s.isDirty);
  const flowArchetype = useJourneyFlowStore((s) => s.flowArchetype);
  const hasNodes = nodes.length > 0;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

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
  // handleGenerate — calls generate route, populates store
  // ---------------------------------------------------------------------------

  const handleGenerate = useCallback(
    async (scope: TestScope, selectedConceptName?: string, force = false) => {
      // Pitfall 2: clear any pending autosave debounce BEFORE fetching
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      // Belt-and-braces: if isDirty stayed true the re-render from setIsGenerating(true)
      // would let the autosave effect re-register a fresh debounce for the OLD nodes.
      storeApi.setState({ isDirty: false });

      setIsGenerating(true);
      try {
        const res = await fetch('/api/build-pack/generate-journey-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workshopId,
            scope,
            selectedConceptId: selectedConceptName,
            force,
          }),
        });

        if (!res.ok) {
          let message = 'Generation failed — please try again';
          try {
            const errBody = await res.json();
            if (errBody?.error) message = errBody.error;
          } catch {
            // ignore parse failure
          }
          toast.error(message);
          return;
        }

        const { state } = await res.json();
        // Route already persisted — set isDirty:false so autosave doesn't double-write
        storeApi.setState({
          nodes: state.nodes,
          edges: state.edges,
          isApproved: false,
          isDirty: false,
          flowArchetype: state.flowArchetype,
          strategicIntent: state.strategicIntent,
          testScope: state.testScope,
          selectedConceptId: state.selectedConceptId,
          lastGeneratedAt: state.lastGeneratedAt,
          isTwoSided: state.isTwoSided,
        });
        toast.success('Baseline flow generated');
      } finally {
        setIsGenerating(false);
      }
    },
    [workshopId, storeApi],
  );

  // ---------------------------------------------------------------------------
  // handleRegenerate — confirm-gated; reads stored scope
  // ---------------------------------------------------------------------------

  const handleRegenerate = useCallback(() => {
    setShowRegenerateConfirm(true);
  }, []);

  const executeRegenerate = useCallback(() => {
    setShowRegenerateConfirm(false);
    const s = storeApi.getState();
    handleGenerate(s.testScope ?? 'journey', s.selectedConceptId, true);
  }, [storeApi, handleGenerate]);

  // ---------------------------------------------------------------------------
  // Render branches
  // ---------------------------------------------------------------------------

  // Read-only + no nodes
  if (!hasNodes && isReadOnly) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Icon name="workflow" className="h-8 w-8 text-primary" />
            </div>
          </div>
          <Text variant="muted">No journey flow has been created yet.</Text>
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

  // Generating spinner (no nodes yet, actively generating)
  if (!hasNodes && isGenerating) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Icon name="spinner" className="h-8 w-8 text-primary animate-spin" />
          <Text variant="muted">Generating your baseline flow…</Text>
        </div>
      </div>
    );
  }

  // Scope chooser (no nodes, not generating, not read-only)
  if (!hasNodes) {
    return (
      <div className="h-full flex flex-col">
        <ScopeChooser
          concepts={concepts}
          isGenerating={isGenerating}
          onGenerate={(scope, name) => handleGenerate(scope, name)}
          onStartFromScratch={handleAddFirstScreen}
        />
        <div className="flex justify-center pb-4">
          <Link
            href={`/workshop/${sessionId}/outputs`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5" />
            Back to Build Pack
          </Link>
        </div>
      </div>
    );
  }

  // Canvas (has nodes)
  return (
    <>
      <JourneyFlowCanvas
        workshopId={workshopId}
        sessionId={sessionId}
        isReadOnly={isReadOnly}
        onRegenerate={isReadOnly ? undefined : handleRegenerate}
        isGenerating={isGenerating}
        archetype={flowArchetype}
      />

      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate baseline flow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current screens and connections with a fresh AI-generated
              baseline. Any edits you&apos;ve made will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={executeRegenerate}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Public export — wraps inner in the store provider
// ---------------------------------------------------------------------------

export function JourneyFlowContent({
  sessionId,
  workshopId,
  savedState,
  concepts,
  isReadOnly,
}: JourneyFlowContentProps) {
  return (
    <div className="h-full w-full relative">
      <JourneyFlowStoreProvider initialState={savedState ?? undefined}>
        <JourneyFlowInner
          sessionId={sessionId}
          workshopId={workshopId}
          concepts={concepts}
          isReadOnly={isReadOnly}
        />
      </JourneyFlowStoreProvider>
    </div>
  );
}
