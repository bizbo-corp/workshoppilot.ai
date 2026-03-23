'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { computeCardState, type ConceptFieldId } from '@/lib/canvas/concept-card-utils';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';

type GeneratingKey = ConceptFieldId | 'all';

/**
 * Hook for card-level and field-level AI generation on concept cards.
 *
 * Manages per-field loading state and calls the concept-card-generate API.
 * Deep-merges partial results into existing card data before updating the store.
 */
export function useConceptCardGenerate(workshopId: string) {
  const storeApi = useCanvasStoreApi();

  // Per-card, per-field generating state: { [cardId]: { [fieldOrAll]: boolean } }
  const [generating, setGenerating] = useState<Record<string, Record<string, boolean>>>({});

  const setFieldGenerating = useCallback((cardId: string, key: GeneratingKey, value: boolean) => {
    setGenerating((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], [key]: value },
    }));
  }, []);

  const getCard = useCallback((cardId: string): ConceptCardData | undefined => {
    return storeApi.getState().conceptCards.find((c) => c.id === cardId);
  }, [storeApi]);

  /**
   * Call the API and return the result data.
   */
  const callApi = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch('/api/ai/concept-card-generate', {
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
   * Deep-merge AI result into the existing card and update the store.
   */
  const applyUpdates = useCallback((cardId: string, updates: Partial<ConceptCardData>) => {
    const card = getCard(cardId);
    if (!card) return;

    const { updateConceptCard } = storeApi.getState();

    // Deep-merge swot: preserve existing quadrants when only some are updated
    if (updates.swot && card.swot) {
      updates.swot = {
        strengths: updates.swot.strengths?.[0] ? updates.swot.strengths : card.swot.strengths,
        weaknesses: updates.swot.weaknesses?.[0] ? updates.swot.weaknesses : card.swot.weaknesses,
        opportunities: updates.swot.opportunities?.[0] ? updates.swot.opportunities : card.swot.opportunities,
        threats: updates.swot.threats?.[0] ? updates.swot.threats : card.swot.threats,
      };
    }

    // Deep-merge feasibility: preserve existing dimensions
    if (updates.feasibility && card.feasibility) {
      updates.feasibility = {
        technical: updates.feasibility.technical?.score
          ? updates.feasibility.technical
          : card.feasibility.technical,
        business: updates.feasibility.business?.score
          ? updates.feasibility.business
          : card.feasibility.business,
        userDesirability: updates.feasibility.userDesirability?.score
          ? updates.feasibility.userDesirability
          : card.feasibility.userDesirability,
      };
    }

    // Compute new card state
    const merged = { ...card, ...updates };
    updates.cardState = computeCardState(merged as ConceptCardData);

    updateConceptCard(cardId, updates);
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
      toast.success('Card generated successfully');
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
  const generateField = useCallback(async (cardId: string, field: ConceptFieldId) => {
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

      // Map the raw schema output to card updates
      const updates = mapFieldResult(field, result.data);
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
    field: ConceptFieldId,
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
      const updates = mapElaborateResult(field, result.data.content);
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

/**
 * Map raw field schema output to Partial<ConceptCardData>.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFieldResult(field: ConceptFieldId, data: any): Partial<ConceptCardData> {
  switch (field) {
    case 'elevatorPitch':
      return { elevatorPitch: data.elevatorPitch };
    case 'usp':
      return { usp: data.usp };
    case 'swot':
      return { swot: data.swot };
    case 'swot-strengths':
      return { swot: { strengths: data.strengths, weaknesses: ['', '', ''], opportunities: ['', '', ''], threats: ['', '', ''] } };
    case 'swot-weaknesses':
      return { swot: { strengths: ['', '', ''], weaknesses: data.weaknesses, opportunities: ['', '', ''], threats: ['', '', ''] } };
    case 'swot-opportunities':
      return { swot: { strengths: ['', '', ''], weaknesses: ['', '', ''], opportunities: data.opportunities, threats: ['', '', ''] } };
    case 'swot-threats':
      return { swot: { strengths: ['', '', ''], weaknesses: ['', '', ''], opportunities: ['', '', ''], threats: data.threats } };
    case 'feasibility':
      return { feasibility: data.feasibility };
    case 'feasibility-technical':
      return { feasibility: { technical: data.technical, business: { score: 0, rationale: '' }, userDesirability: { score: 0, rationale: '' } } };
    case 'feasibility-business':
      return { feasibility: { technical: { score: 0, rationale: '' }, business: data.business, userDesirability: { score: 0, rationale: '' } } };
    case 'feasibility-userDesirability':
      return { feasibility: { technical: { score: 0, rationale: '' }, business: { score: 0, rationale: '' }, userDesirability: data.userDesirability } };
    default:
      return {};
  }
}

/**
 * Map elaborated content back to the correct card field.
 */
function mapElaborateResult(field: ConceptFieldId, content: string): Partial<ConceptCardData> {
  switch (field) {
    case 'elevatorPitch':
      return { elevatorPitch: content };
    case 'usp':
      return { usp: content };
    default:
      return {};
  }
}
