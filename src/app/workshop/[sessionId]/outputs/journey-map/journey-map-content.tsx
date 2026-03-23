'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Map, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const hasNodes = useJourneyMapperStore((s) => s.nodes.length > 0);
  const isDirty = useJourneyMapperStore((s) => s.isDirty);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
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
      storeApi.getState().setState({
        ...data.state,
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

  const handleReset = useCallback(async () => {
    if (!confirm('Reset journey map? This will delete the current map so you can regenerate from scratch.')) return;
    setIsResetting(true);
    try {
      await fetch('/api/build-pack/delete-journey-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });
      // Clear the store back to empty
      storeApi.getState().setState({
        nodes: [],
        edges: [],
        stages: [],
        groups: [],
        challengeContext: '',
        personaName: '',
        conceptRelationship: 'combined',
        strategicIntent: 'web-app',
        isApproved: false,
        isDirty: false,
        lastGeneratedAt: undefined,
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
              <Map className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">UX Journey Mapper</h2>
          <p className="text-sm text-muted-foreground">
            Map your validated concepts onto your user journey to create an interactive
            UX roadmap and generate a v0 prototype prompt.
          </p>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive justify-center">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {!hasStep9 ? (
            <p className="text-sm text-muted-foreground">
              Complete Step 9 (Concept) first to generate a journey map.
            </p>
          ) : isReadOnly ? (
            <p className="text-sm text-muted-foreground">
              No journey map has been generated yet.
            </p>
          ) : (
            <Button
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Map className="h-4 w-4" />
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
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Build Pack
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UXJourneyMapper
      workshopId={workshopId}
      sessionId={sessionId}
      isReadOnly={isReadOnly}
      buildPackIdRef={buildPackIdRef}
      onRegenerate={() => handleGenerate(true)}
      isRegenerating={isGenerating}
      onReset={handleReset}
      isResetting={isResetting}
    />
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
    <div className="h-screen w-full">
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
