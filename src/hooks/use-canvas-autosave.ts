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
 * @param workshopId - The workshop ID (wks_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @returns Object with saveStatus for UI indicator
 */
export function useCanvasAutosave(workshopId: string, stepId: string) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const failureCountRef = useRef(0);

  // Store access
  const postIts = useCanvasStore((s) => s.postIts);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const markClean = useCanvasStore((s) => s.markClean);

  // Debounced save callback
  const debouncedSave = useDebouncedCallback(
    async () => {
      // Skip if no changes
      if (!isDirty) {
        return;
      }

      setSaveStatus('saving');

      const result = await saveCanvasState(workshopId, stepId, { postIts });

      if (result.success) {
        // Success: mark clean and show saved indicator
        markClean();
        setSaveStatus('saved');
        failureCountRef.current = 0;

        // Auto-clear "Saved" indicator after 2s
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
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

  // Trigger save when postIts change and isDirty
  useEffect(() => {
    if (isDirty) {
      debouncedSave();
    }
  }, [postIts, isDirty, debouncedSave]);

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
