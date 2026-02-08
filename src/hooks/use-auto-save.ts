import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { autoSaveMessages } from '@/actions/auto-save-actions';
import type { UIMessage } from 'ai';

/**
 * Auto-save hook with debounced persistence
 * Saves messages every 2 seconds (debounced) with 10s maxWait
 * Flushes pending saves on component unmount
 *
 * @param sessionId - The session ID
 * @param stepId - The step ID
 * @param messages - Array of UIMessage objects from AI SDK
 * @returns Object with isPending flag and flush function
 */
export function useAutoSave(
  sessionId: string,
  stepId: string,
  messages: UIMessage[]
) {
  const debouncedSave = useDebouncedCallback(
    async (msgs: UIMessage[]) => {
      await autoSaveMessages(sessionId, stepId, msgs);
    },
    2000, // 2 second delay
    { maxWait: 10000 } // Force save after 10 seconds max
  );

  // Trigger save on message changes
  useEffect(() => {
    if (messages.length > 0) {
      debouncedSave(messages);
    }
  }, [messages, debouncedSave]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  return {
    isPending: debouncedSave.isPending(),
    flush: debouncedSave.flush,
  };
}
