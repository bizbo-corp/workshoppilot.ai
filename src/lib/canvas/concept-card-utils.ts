/**
 * Shared utilities for concept card AI generation.
 *
 * Extracted from chat-panel.tsx so both the chat flow and
 * card-level AI generation share the same logic.
 */

import type { ConceptCardData } from './concept-card-types';

/**
 * All fillable field identifiers on a concept card.
 * Used by generate-field and elaborate operations.
 */
export type ConceptFieldId =
  | 'elevatorPitch'
  | 'usp'
  | 'swot'
  | 'swot-strengths'
  | 'swot-weaknesses'
  | 'swot-opportunities'
  | 'swot-threats'
  | 'feasibility'
  | 'feasibility-technical'
  | 'feasibility-business'
  | 'feasibility-userDesirability';

/**
 * Compute card state based on field population.
 *
 * - skeleton: no content fields filled
 * - active: some content but not all sections complete
 * - filled: all four major sections have content
 */
export function computeCardState(
  card: ConceptCardData,
): 'skeleton' | 'active' | 'filled' {
  const hasPitch = !!card.elevatorPitch;
  const hasUsp = !!card.usp;
  const hasSwot = card.swot?.strengths?.some((s) => !!s);
  const hasFeasibility = card.feasibility?.technical?.score > 0;

  if (hasPitch && hasUsp && hasSwot && hasFeasibility) {
    return 'filled';
  }

  if (hasPitch || hasUsp || hasSwot || hasFeasibility || !!card.conceptName) {
    return 'active';
  }

  return 'skeleton';
}

/**
 * Check if any content fields on the card are non-empty.
 * Used to decide whether to show an overwrite confirmation dialog.
 */
export function hasExistingContent(card: ConceptCardData): boolean {
  if (card.elevatorPitch) return true;
  if (card.usp) return true;
  if (card.swot?.strengths?.some((s) => !!s)) return true;
  if (card.swot?.weaknesses?.some((s) => !!s)) return true;
  if (card.swot?.opportunities?.some((s) => !!s)) return true;
  if (card.swot?.threats?.some((s) => !!s)) return true;
  if (card.feasibility?.technical?.score > 0) return true;
  if (card.feasibility?.business?.score > 0) return true;
  if (card.feasibility?.userDesirability?.score > 0) return true;
  return false;
}
