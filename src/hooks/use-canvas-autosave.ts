'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { saveCanvasState } from '@/actions/canvas-actions';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Auto-save hook for canvas state persistence
 * Debounces saves at 2 seconds, with 10s maxWait
 * Silent retry for first 2 failures, shows error after 3 consecutive failures
 * Force-saves on component unmount and beforeunload
 *
 * Uses a dirty version counter to prevent a race condition where markClean()
 * from a completing save clears isDirty even though new changes arrived during
 * the async save, causing those changes to never be saved.
 *
 * @param workshopId - The workshop ID (wks_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @returns Object with saveStatus for UI indicator
 */
export function useCanvasAutosave(workshopId: string, stepId: string) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const failureCountRef = useRef(0);

  // Dirty version counter — incremented each time state changes while dirty.
  // Prevents markClean() from clobbering changes that arrived during an async save.
  const dirtyVersionRef = useRef(0);

  // Store access
  const postIts = useCanvasStore((s) => s.postIts);
  const gridColumns = useCanvasStore((s) => s.gridColumns);
  const drawingNodes = useCanvasStore((s) => s.drawingNodes);
  const mindMapNodes = useCanvasStore((s) => s.mindMapNodes);
  const mindMapEdges = useCanvasStore((s) => s.mindMapEdges);
  const crazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);
  const conceptCards = useCanvasStore((s) => s.conceptCards);
  const personaTemplates = useCanvasStore((s) => s.personaTemplates);
  const hmwCards = useCanvasStore((s) => s.hmwCards);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const markClean = useCanvasStore((s) => s.markClean);

  // Debounced save callback
  const debouncedSave = useDebouncedCallback(
    async () => {
      // Skip if no changes
      if (!isDirty) {
        return;
      }

      // Snapshot the dirty version at save start
      const versionAtSaveStart = dirtyVersionRef.current;

      setSaveStatus('saving');

      const result = await saveCanvasState(workshopId, stepId, {
        postIts,
        ...(gridColumns.length > 0 ? { gridColumns } : {}),
        ...(drawingNodes.length > 0 ? { drawingNodes } : {}),
        ...(mindMapNodes.length > 0 ? { mindMapNodes } : {}),
        ...(mindMapEdges.length > 0 ? { mindMapEdges } : {}),
        ...(crazy8sSlots.length > 0 ? { crazy8sSlots } : {}),
        ...(conceptCards.length > 0 ? { conceptCards } : {}),
        ...(personaTemplates.length > 0 ? { personaTemplates } : {}),
        ...(hmwCards.length > 0 ? { hmwCards } : {}),
      });

      if (result.success) {
        failureCountRef.current = 0;

        // Only mark clean if no new changes arrived during the async save.
        // If the version changed, another save will be triggered by the effect.
        if (dirtyVersionRef.current === versionAtSaveStart) {
          markClean();
          setSaveStatus('saved');

          // Auto-clear "Saved" indicator after 2s
          setTimeout(() => {
            setSaveStatus('idle');
          }, 2000);
        } else {
          // New changes arrived during save — skip markClean so the
          // effect triggers another save with the latest data.
          setSaveStatus('idle');
        }
      } else {
        // Failure: increment failure count
        failureCountRef.current += 1;

        if (failureCountRef.current < 3) {
          // Silent retry: log warning but don't show error UI
          console.warn(
            `Canvas auto-save failed (attempt ${failureCountRef.current}/3):`,
            result.error
          );
          setSaveStatus('idle');
        } else {
          // Show error after 3 consecutive failures
          console.error('Canvas auto-save failed after 3 attempts:', result.error);
          setSaveStatus('error');
        }
      }
    },
    2000, // 2 second debounce
    { maxWait: 10000 } // Force save after 10 seconds max
  );

  // Trigger save when state changes and isDirty
  useEffect(() => {
    if (isDirty) {
      dirtyVersionRef.current++;
      debouncedSave();
    }
  }, [postIts, gridColumns, drawingNodes, mindMapNodes, mindMapEdges, crazy8sSlots, conceptCards, personaTemplates, hmwCards, isDirty, debouncedSave]);

  // Force-save on component unmount
  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  // Force-save on beforeunload (page navigation/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      debouncedSave.flush();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [debouncedSave]);

  return { saveStatus };
}
