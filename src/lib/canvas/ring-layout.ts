/**
 * Ring Layout Module
 * Provides concentric ring layout for Step 2 (Stakeholder Mapping)
 * Distributes cards evenly around rings based on importance scoring
 */

/**
 * Configuration for a ring-based layout
 */
export type RingConfig = {
  rings: Array<{ id: string; label?: string; radius: number; color: string }>;
  center: { x: number; y: number };
};

/**
 * Distribute cards evenly around a ring circumference
 * @param cardCount - Number of cards to distribute
 * @param ringRadius - Radius of the ring in pixels
 * @param center - Ring center point in canvas coordinates
 * @returns Array of {x, y} positions for card top-left corners
 */
export function distributeCardsOnRing(
  cardCount: number,
  ringRadius: number,
  center: { x: number; y: number },
): Array<{ x: number; y: number }> {
  // Handle empty case
  if (cardCount === 0) {
    return [];
  }

  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = (2 * Math.PI) / cardCount;
  const startAngle = -Math.PI / 2; // Start from top for visual balance

  // Card dimensions (same as POST_IT constants)
  const POST_IT_WIDTH = 160;
  const POST_IT_HEIGHT = 100;

  for (let i = 0; i < cardCount; i++) {
    const angle = startAngle + i * angleStep;

    // Calculate card center position on the ring
    const centerX = center.x + ringRadius * Math.cos(angle);
    const centerY = center.y + ringRadius * Math.sin(angle);

    // Convert from center to top-left corner for rendering
    const x = centerX - POST_IT_WIDTH / 2;
    const y = centerY - POST_IT_HEIGHT / 2;

    positions.push({ x, y });
  }

  return positions;
}

/**
 * Detect which ring a position falls into
 * @param position - Canvas position to check
 * @param config - Ring configuration
 * @returns Ring ID or fallback ring
 */
export function detectRing(
  position: { x: number; y: number },
  config: RingConfig,
): string {
  // Calculate distance from position to ring center
  const dx = position.x - config.center.x;
  const dy = position.y - config.center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Handle very small distance (at or near center)
  if (distance < 10) {
    return config.rings[0].id; // inner ring
  }

  // Find the ring whose radius boundary contains this distance
  // Rings are ordered inner-to-outer
  for (let i = 0; i < config.rings.length; i++) {
    const ring = config.rings[i];
    const previousRadius = i > 0 ? config.rings[i - 1].radius : 0;

    // Position belongs to this ring if distance is within its boundaries
    if (distance >= previousRadius && distance < ring.radius) {
      return ring.id;
    }
  }

  // Fallback: if beyond all rings, assign to outermost ring
  return config.rings[config.rings.length - 1].id;
}
