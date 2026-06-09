'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Heading, Text } from '@/components/ui/typography';
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
import { toast } from 'sonner';

import { JourneyMapperStoreProvider, useJourneyMapperStore, useJourneyMapperStoreApi } from '@/providers/journey-mapper-store-provider';
import { UXJourneyMapper } from '@/components/journey-mapper/ux-journey-mapper';
import type { JourneyMapperState } from '@/lib/journey-mapper/types';

interface JourneyMapContentProps {
  sessionId: string;
  workshopId: string;
  savedState: JourneyMapperState | null;
  hasStep9: boolean;
  isReadOnly?: boolean;
}

function JourneyMapInner({
  sessionId,
  workshopId,
  hasStep9,
  isReadOnly,
}: Omit<JourneyMapContentProps, 'savedState'>) {
  const router = useRouter();
  const storeApi = useJourneyMapperStoreApi();
  const nodes = useJourneyMapperStore((s) => s.nodes);
  const hasNodes = nodes.length > 0;
  const isDirty = useJourneyMapperStore((s) => s.isDirty);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildPackIdRef = useRef<string | null>(null);

  // Autosave on dirty changes (debounced 2s)
  useEffect(() => {
    if (!isDirty || isReadOnly) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const state = storeApi.getState();
        // Don't save empty state (could happen if reset raced with this timer)
        if (state.nodes.length === 0) return;
        const res = await fetch('/api/build-pack/save-journey-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workshopId, state }),
        });
        const data = await res.json();
        if (data.buildPackId) {
          buildPackIdRef.current = data.buildPackId;
        }
        storeApi.getState().markClean();
      } catch (err) {
        console.error('Autosave failed:', err);
      }
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, workshopId, isReadOnly, storeApi]);

  const handleGenerate = useCallback(async (force = false) => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/build-pack/generate-journey-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId, force }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate journey map');
      }
      const data = await res.json();
      if (data.buildPackId) {
        buildPackIdRef.current = data.buildPackId;
      }
      const incoming = data.state;
      // Use storeApi.setState directly (Zustand native) to guarantee subscriber notification
      storeApi.setState({
        ...incoming,
        isDirty: false,
      });
      toast.success('Journey map generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [workshopId, storeApi]);

  const executeReset = useCallback(async () => {
    // Kill any pending autosave BEFORE the async delete — prevents
    // the timer from firing during the await and re-saving empty state to DB.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setIsResetting(true);
    try {
      await fetch('/api/build-pack/delete-journey-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });
      // Clear the store back to empty — use storeApi.setState directly
      storeApi.setState({
        nodes: [],
        edges: [],
        stages: [],
        groups: [],
        journeyView: { nodeIds: [], positions: {}, edges: [] },
        sitemapView: { nodeIds: [], positions: {}, edges: [], groups: [] },
        activeView: 'journey',
        challengeContext: '',
        personaName: '',
        conceptRelationship: 'combined',
        strategicIntent: 'web-app',
        layoutMode: 'freeform',
        isApproved: false,
        isDirty: false,
        lastGeneratedAt: undefined,
        _schemaVersion: 2,
      });
      toast.success('Journey map reset');
    } catch (err) {
      toast.error('Failed to reset journey map');
    } finally {
      setIsResetting(false);
    }
  }, [workshopId, storeApi]);

  // Empty state
  if (!hasNodes) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Icon name="map" className="h-8 w-8 text-primary" />
            </div>
          </div>
          <Heading level={2} className="text-xl">UX Journey Mapper</Heading>
          <Text variant="muted">
            Map your validated concepts onto your user journey to create an interactive
            UX roadmap and generate a v0 prototype prompt.
          </Text>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive justify-center">
              <Icon name="alert-circle" className="h-4 w-4" />
              {error}
            </div>
          )}
          {!hasStep9 ? (
            <Text variant="muted">
              Complete Step 9 (Concept) first to generate a journey map.
            </Text>
          ) : isReadOnly ? (
            <Text variant="muted">
              No journey map has been generated yet.
            </Text>
          ) : (
            <Button
              onClick={() => handleGenerate(true)}
              disabled={isGenerating}
              variant="primary"
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Icon name="spinner" className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Icon name="map" className="h-4 w-4" />
                  Generate Journey Map
                </>
              )}
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

  return (
    <>
      <UXJourneyMapper
        workshopId={workshopId}
        sessionId={sessionId}
        isReadOnly={isReadOnly}
        buildPackIdRef={buildPackIdRef}
        onRegenerate={() => handleGenerate(true)}
        isRegenerating={isGenerating}
        onReset={() => setShowResetDialog(true)}
        isResetting={isResetting}
      />

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Journey Map</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the current map so you can regenerate from scratch.
              Your concept data from Step 9 will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setShowResetDialog(false);
                executeReset();
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function JourneyMapContent({
  sessionId,
  workshopId,
  savedState,
  hasStep9,
  isReadOnly,
}: JourneyMapContentProps) {
  return (
    <div className="h-full w-full relative">
      <JourneyMapperStoreProvider initialState={savedState ?? undefined}>
        <JourneyMapInner
          sessionId={sessionId}
          workshopId={workshopId}
          hasStep9={hasStep9}
          isReadOnly={isReadOnly}
        />
      </JourneyMapperStoreProvider>
    </div>
  );
}
