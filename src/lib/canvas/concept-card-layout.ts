import type { ConceptCardData } from './concept-card-types';

/**
 * Calculate position for next concept card using dealing-cards pattern
 * Offset from last card by 30px x and y for cascading stack effect
 */
export function getNextConceptCardPosition(
  existingCards: ConceptCardData[]
): { x: number; y: number } {
  if (existingCards.length === 0) {
    // First card: near viewport center (caller can adjust with screenToFlowPosition)
    return { x: 100, y: 100 };
  }

  const lastCard = existingCards[existingCards.length - 1];
  return {
    x: lastCard.position.x + 30,
    y: lastCard.position.y + 30,
  };
}
