'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useCanvasStoreApi } from '@/providers/canvas-store-provider';
import type { HmwFieldId, HmwCardData } from '@/lib/canvas/hmw-card-types';

type GeneratingKey = HmwFieldId | 'all';

/**
 * Hook for card-level and field-level AI generation on HMW cards.
 *
 * Manages per-field loading state and calls the hmw-card-generate API.
 * Applies results into existing card data before updating the store.
 */
export function useHmwCardGenerate(workshopId: string) {
  const storeApi = useCanvasStoreApi();

  // Per-card, per-field generating state: { [cardId]: { [fieldOrAll]: boolean } }
  const [generating, setGenerating] = useState<Record<string, Record<string, boolean>>>({});

  const setFieldGenerating = useCallback((cardId: string, key: GeneratingKey, value: boolean) => {
    setGenerating((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], [key]: value },
    }));
  }, []);

  const getCard = useCallback((cardId: string): HmwCardData | undefined => {
    return storeApi.getState().hmwCards.find((c) => c.id === cardId);
  }, [storeApi]);

  const callApi = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch('/api/ai/hmw-card-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }, []);

  /**
   * Apply updates and recompute cardState.
   */
  const applyUpdates = useCallback((cardId: string, updates: Partial<HmwCardData>) => {
    const card = getCard(cardId);
    if (!card) return;

    const { updateHmwCard } = storeApi.getState();

    const merged = { ...card, ...updates };

    // Recompute cardState
    if (merged.givenThat && merged.persona && merged.immediateGoal && merged.deeperGoal) {
      updates.cardState = 'filled';
    } else if (merged.givenThat || merged.persona || merged.immediateGoal || merged.deeperGoal) {
      updates.cardState = 'active';
    }

    updateHmwCard(cardId, updates);
  }, [getCard, storeApi]);

  /**
   * Generate all fields for a card in one API call.
   */
  const generateAll = useCallback(async (cardId: string) => {
    const card = getCard(cardId);
    if (!card) return;

    setFieldGenerating(cardId, 'all', true);
    try {
      const result = await callApi({
        workshopId,
        cardId,
        cardData: card,
        operation: 'generate-all',
      });

      applyUpdates(cardId, result.data);
      toast.success('HMW card generated successfully');
    } catch (err) {
      console.error('generateAll failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate card');
    } finally {
      setFieldGenerating(cardId, 'all', false);
    }
  }, [workshopId, getCard, callApi, applyUpdates, setFieldGenerating]);

  /**
   * Generate a single field.
   */
  const generateField = useCallback(async (cardId: string, field: HmwFieldId) => {
    const card = getCard(cardId);
    if (!card) return;

    setFieldGenerating(cardId, field, true);
    try {
      const result = await callApi({
        workshopId,
        cardId,
        cardData: card,
        operation: 'generate-field',
        field,
      });

      // API returns { value: string } for single field
      const updates: Partial<HmwCardData> = { [field]: result.data.value };
      applyUpdates(cardId, updates);
      toast.success('Field generated');
    } catch (err) {
      console.error('generateField failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate field');
    } finally {
      setFieldGenerating(cardId, field, false);
    }
  }, [workshopId, getCard, callApi, applyUpdates, setFieldGenerating]);

  /**
   * Elaborate/polish existing content with user instructions.
   */
  const elaborate = useCallback(async (
    cardId: string,
    field: HmwFieldId,
    currentContent: string,
    instructions: string,
  ) => {
    const card = getCard(cardId);
    if (!card) return;

    setFieldGenerating(cardId, field, true);
    try {
      const result = await callApi({
        workshopId,
        cardId,
        cardData: card,
        operation: 'elaborate',
        field,
        currentContent,
        instructions,
      });

      // Elaborate returns { content: string }
      const updates: Partial<HmwCardData> = { [field]: result.data.content };
      applyUpdates(cardId, updates);
      toast.success('Content improved');
    } catch (err) {
      console.error('elaborate failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to elaborate');
    } finally {
      setFieldGenerating(cardId, field, false);
    }
  }, [workshopId, getCard, callApi, applyUpdates, setFieldGenerating]);

  return {
    generating,
    generateAll,
    generateField,
    elaborate,
  };
}
