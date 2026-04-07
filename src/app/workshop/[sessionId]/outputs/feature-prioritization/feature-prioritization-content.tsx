'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ListOrdered, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

import {
  FeaturePrioritizationStoreProvider,
  useFeaturePrioritizationStore,
  useFeaturePrioritizationStoreApi,
} from '@/providers/feature-prioritization-store-provider';
import { FeatureList } from '@/components/feature-prioritization/feature-list';
import type { FeaturePrioritizationState } from '@/lib/feature-prioritization/types';

interface FeaturePrioritizationContentProps {
  sessionId: string;
  workshopId: string;
  savedState: FeaturePrioritizationState | null;
  hasJourneyMap: boolean;
  hasStep9: boolean;
  isReadOnly?: boolean;
}

function FeaturePrioritizationInner({
  sessionId,
  workshopId,
  hasJourneyMap,
  hasStep9,
  isReadOnly,
}: Omit<FeaturePrioritizationContentProps, 'savedState'>) {
  const storeApi = useFeaturePrioritizationStoreApi();
  const features = useFeaturePrioritizationStore((s) => s.features);
  const hasFeatures = features.length > 0;
  const isDirty = useFeaturePrioritizationStore((s) => s.isDirty);

  const [isGenerating, setIsGenerating] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave on dirty changes (debounced 2s)
  useEffect(() => {
    if (!isDirty || isReadOnly) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const state = storeApi.getState();
        if (state.features.length === 0) return;
        await fetch('/api/build-pack/save-feature-prioritization', {
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

  const handleGenerate = useCallback(async (force = false) => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/build-pack/generate-feature-prioritization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId, force }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate feature prioritization');
      }
      const data = await res.json();
      storeApi.setState({
        ...data.state,
        isDirty: false,
      });
      toast.success('Feature prioritization generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [workshopId, storeApi]);

  const executeReset = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    storeApi.setState({
      features: [],
      workshopTitle: '',
      personaName: '',
      challengeContext: '',
      generatedAt: undefined,
      isDirty: false,
      _schemaVersion: 1,
    });
    toast.success('Feature prioritization reset');
  }, [storeApi]);

  // Empty state
  if (!hasFeatures) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ListOrdered className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">Feature Prioritization</h2>
          <p className="text-sm text-muted-foreground">
            Generate a prioritized feature list from your journey map.
            Drag and drop to reorder features by importance.
          </p>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive justify-center">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {!hasStep9 ? (
            <p className="text-sm text-muted-foreground">
              Complete Step 9 (Concept) first to generate features.
            </p>
          ) : !hasJourneyMap ? (
            <p className="text-sm text-muted-foreground">
              Generate a Journey Map first to create feature prioritization.
            </p>
          ) : isReadOnly ? (
            <p className="text-sm text-muted-foreground">
              No feature prioritization has been generated yet.
            </p>
          ) : (
            <Button
              onClick={() => handleGenerate(true)}
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
                  <ListOrdered className="h-4 w-4" />
                  Generate Features
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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link
              href={`/workshop/${sessionId}/outputs`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Build Pack
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Feature Prioritization</h1>
            <p className="text-sm text-muted-foreground">
              Drag to reorder features by priority. Position determines importance.
            </p>
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(true)}
              >
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* Feature List */}
        <FeatureList isReadOnly={isReadOnly} />
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Feature Prioritization</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the current feature list so you can regenerate from scratch.
              Your journey map data will be preserved.
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
    </div>
  );
}

export function FeaturePrioritizationContent({
  sessionId,
  workshopId,
  savedState,
  hasJourneyMap,
  hasStep9,
  isReadOnly,
}: FeaturePrioritizationContentProps) {
  return (
    <div className="h-full w-full relative">
      <FeaturePrioritizationStoreProvider initialState={savedState ?? undefined}>
        <FeaturePrioritizationInner
          sessionId={sessionId}
          workshopId={workshopId}
          hasJourneyMap={hasJourneyMap}
          hasStep9={hasStep9}
          isReadOnly={isReadOnly}
        />
      </FeaturePrioritizationStoreProvider>
    </div>
  );
}
