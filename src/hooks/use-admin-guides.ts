'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';

/**
 * Client hook for admin guide editor — fetch, create, update, delete guides via API.
 */
export function useAdminGuides(stepId: string) {
  const [guides, setGuides] = useState<CanvasGuideData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounce timers and pending updates
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingUpdates = useRef<Map<string, { guideId: string; updates: Partial<CanvasGuideData> }>>(new Map());
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Fetch guides for step
  const fetchGuides = useCallback(async (sid: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/canvas-guides?stepId=${encodeURIComponent(sid)}`);
      if (res.ok) {
        const data = await res.json();
        setGuides(data);
      }
    } catch (err) {
      console.error('Failed to fetch guides:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuides(stepId);
  }, [stepId, fetchGuides]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Create new guide
  const createGuide = useCallback(async (defaults?: Partial<CanvasGuideData>) => {
    const variant = defaults?.variant ?? 'sticker';
    const canvasOnlyVariants = ['template-postit', 'frame', 'arrow'];
    const isCanvasOnly = canvasOnlyVariants.includes(variant);
    const noBodyVariants = ['frame', 'arrow'];
    const needsBody = !noBodyVariants.includes(variant);

    const newGuide: Partial<CanvasGuideData> = {
      stepId,
      body: needsBody ? (variant === 'template-postit' ? 'Prompt text' : 'New guide') : '',
      variant,
      layer: variant === 'frame' ? 'background' : 'foreground',
      placementMode: isCanvasOnly ? 'on-canvas' : 'on-canvas',
      canvasX: 200,
      canvasY: 200,
      dismissBehavior: isCanvasOnly ? 'persistent' : 'hover-x',
      showOnlyWhenEmpty: false,
      sortOrder: guides.length,
      ...(variant === 'template-postit' ? { color: 'yellow', width: 160, height: 100 } : {}),
      ...(variant === 'frame' ? { width: 400, height: 300, color: '#94a3b8' } : {}),
      ...(variant === 'arrow' ? { width: 120, height: 40, rotation: 0, color: '#64748b' } : {}),
      ...defaults,
    };

    try {
      const res = await fetch('/api/admin/canvas-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuide),
      });
      if (res.ok) {
        const created = await res.json();
        setGuides(prev => [...prev, created]);
        return created as CanvasGuideData;
      }
    } catch (err) {
      console.error('Failed to create guide:', err);
    }
    return null;
  }, [stepId, guides.length]);

  // Update guide — debounced PATCH
  const updateGuide = useCallback((guideId: string, updates: Partial<CanvasGuideData>) => {
    // Update local state immediately for live preview
    setGuides(prev =>
      prev.map(g => (g.id === guideId ? { ...g, ...updates } : g))
    );

    // Clear existing debounce timer for this guide
    const existing = debounceTimers.current.get(guideId);
    if (existing) clearTimeout(existing);

    // Track pending update
    const existingPending = pendingUpdates.current.get(guideId);
    pendingUpdates.current.set(guideId, {
      guideId,
      updates: existingPending ? { ...existingPending.updates, ...updates } : updates,
    });
    setHasPendingChanges(true);

    // Debounced PATCH
    const timer = setTimeout(async () => {
      debounceTimers.current.delete(guideId);
      const pending = pendingUpdates.current.get(guideId);
      pendingUpdates.current.delete(guideId);
      if (pendingUpdates.current.size === 0) setHasPendingChanges(false);
      if (!pending) return;
      try {
        await fetch(`/api/admin/canvas-guides/${guideId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pending.updates),
        });
      } catch (err) {
        console.error('Failed to update guide:', err);
      }
    }, 1000);

    debounceTimers.current.set(guideId, timer);
  }, []);

  // Delete guide
  const deleteGuide = useCallback(async (guideId: string) => {
    setGuides(prev => prev.filter(g => g.id !== guideId));
    try {
      await fetch(`/api/admin/canvas-guides/${guideId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete guide:', err);
    }
  }, []);

  // Flush all pending debounced updates immediately
  const flushAll = useCallback(async () => {
    // Clear all debounce timers
    debounceTimers.current.forEach(t => clearTimeout(t));
    debounceTimers.current.clear();

    // Send all pending updates
    const pending = Array.from(pendingUpdates.current.values());
    pendingUpdates.current.clear();
    setHasPendingChanges(false);

    await Promise.all(
      pending.map(({ guideId, updates }) =>
        fetch(`/api/admin/canvas-guides/${guideId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }).catch(err => console.error('Failed to flush guide update:', err))
      )
    );
  }, []);

  return {
    guides,
    isLoading,
    hasPendingChanges,
    createGuide,
    updateGuide,
    deleteGuide,
    flushAll,
    refetch: () => fetchGuides(stepId),
  };
}
