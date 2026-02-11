/**
 * Empathy Zone Layout Module
 * Provides 6-zone empathy map layout for Step 4 (Sense Making)
 * Classic empathy map: 4 quadrants + 2 horizontal strips for pains/gains
 */

/**
 * Empathy zone identifiers
 */
export type EmpathyZone = 'says' | 'thinks' | 'feels' | 'does' | 'pains' | 'gains';

/**
 * Configuration for empathy zone layout
 */
export type EmpathyZoneConfig = {
  zones: Record<
    EmpathyZone,
    {
      bounds: { x: number; y: number; width: number; height: number };
      label: string;
      color: string;
    }
  >;
};

/**
 * Detect which zone a position falls into
 * @param position - Canvas position to check
 * @param config - Empathy zone configuration
 * @returns Zone key or null if outside all zones
 */
export function getZoneForPosition(
  position: { x: number; y: number },
  config: EmpathyZoneConfig,
): EmpathyZone | null {
  // Check each zone using rectangular bounds
  for (const [zoneKey, zoneData] of Object.entries(config.zones)) {
    const { bounds } = zoneData;

    // Simple rectangular bounds check
    if (
      position.x >= bounds.x &&
      position.x < bounds.x + bounds.width &&
      position.y >= bounds.y &&
      position.y < bounds.y + bounds.height
    ) {
      return zoneKey as EmpathyZone;
    }
  }

  return null;
}

/**
 * Distribute cards in a tidy grid within a zone
 * @param cardCount - Number of cards to place
 * @param zoneBounds - Zone bounds
 * @param cardSize - Card dimensions
 * @param padding - Spacing between cards and from edges
 * @returns Array of {x, y} positions for card top-left corners
 */
export function distributeCardsInZone(
  cardCount: number,
  zoneBounds: { x: number; y: number; width: number; height: number },
  cardSize: { width: number; height: number },
  padding: number,
): Array<{ x: number; y: number }> {
  // Handle empty case
  if (cardCount === 0) {
    return [];
  }

  const positions: Array<{ x: number; y: number }> = [];

  // Calculate max columns that fit in zone width
  const availableWidth = zoneBounds.width - 2 * padding;
  const maxColumns = Math.floor(availableWidth / (cardSize.width + padding));

  // Ensure at least 1 column
  const columns = Math.max(1, maxColumns);

  // Reserve space for zone label header
  const headerHeight = 40;
  const startX = zoneBounds.x + padding;
  const startY = zoneBounds.y + padding + headerHeight;

  for (let i = 0; i < cardCount; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);

    const x = startX + col * (cardSize.width + padding);
    const y = startY + row * (cardSize.height + padding);

    positions.push({ x, y });
  }

  return positions;
}
