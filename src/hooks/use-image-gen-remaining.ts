'use client';

import { useState, useEffect, useCallback } from 'react';
import { IMAGE_GEN_CAP } from '@/lib/ai/constants';

/**
 * Hook to track remaining image generations for a specific item.
 * Fetches from /api/ai/image-gen-remaining on mount and provides
 * optimistic decrement after successful generation.
 */
export function useImageGenRemaining(itemId: string | null) {
  const [remaining, setRemaining] = useState<number>(IMAGE_GEN_CAP);
  const [loading, setLoading] = useState(false);

  const fetchRemaining = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/image-gen-remaining', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [itemId] }),
      });
      if (res.ok) {
        const { results } = await res.json();
        if (results[itemId]) {
          setRemaining(results[itemId].remaining);
        }
      }
    } catch (e) {
      console.error('Failed to fetch image gen remaining:', e);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchRemaining();
  }, [fetchRemaining]);

  const decrementRemaining = useCallback(() => {
    setRemaining((prev) => Math.max(0, prev - 1));
  }, []);

  return { remaining, loading, refetch: fetchRemaining, decrementRemaining, cap: IMAGE_GEN_CAP };
}
