/**
 * Quadrant Detection Module
 * Detects which quadrant a sticky note belongs to based on its center point
 * Supports Power-Interest matrix and Empathy Map quadrant layouts
 */

// Power-Interest quadrants (Step 2: Stakeholder Mapping)
export type PowerInterestQuadrant =
  | 'high-power-high-interest'
  | 'high-power-low-interest'
  | 'low-power-high-interest'
  | 'low-power-low-interest';

// Empathy Map quadrants (Step 4: Sense Making)
export type EmpathyMapQuadrant = 'said' | 'thought' | 'felt' | 'experienced';

// Union type for all quadrants
export type Quadrant = PowerInterestQuadrant | EmpathyMapQuadrant;

// Quadrant type discriminator
export type QuadrantType = 'power-interest' | 'empathy-map';

/**
 * Detect which quadrant a sticky note belongs to based on its center point
 * Canvas origin (0,0) is the center dividing line
 *
 * @param position - Top-left corner position of the sticky note
 * @param width - Width of the sticky note
 * @param height - Height of the sticky note
 * @param type - Type of quadrant layout
 * @returns The quadrant the sticky note belongs to
 */
export function detectQuadrant(
  position: { x: number; y: number },
  width: number,
  height: number,
  type: QuadrantType
): Quadrant {
  // Calculate center point of the sticky note
  const centerX = position.x + width / 2;
  const centerY = position.y + height / 2;

  if (type === 'power-interest') {
    // Power-Interest matrix:
    // Y < 0 = High Power (top), Y >= 0 = Low Power (bottom)
    // X < 0 = Low Interest (left), X >= 0 = High Interest (right)
    if (centerY < 0) {
      // High Power
      return centerX < 0 ? 'high-power-low-interest' : 'high-power-high-interest';
    } else {
      // Low Power
      return centerX < 0 ? 'low-power-low-interest' : 'low-power-high-interest';
    }
  } else {
    // Empathy Map:
    // Y < 0 = top, Y >= 0 = bottom
    // X < 0 = left, X >= 0 = right
    if (centerY < 0) {
      // Top quadrants
      return centerX < 0 ? 'thought' : 'felt';
    } else {
      // Bottom quadrants
      return centerX < 0 ? 'said' : 'experienced';
    }
  }
}

/**
 * Get human-readable label for a quadrant
 * @param quadrant - The quadrant to get a label for
 * @returns Human-readable label
 */
export function getQuadrantLabel(quadrant: Quadrant): string {
  const labels: Record<Quadrant, string> = {
    // Power-Interest labels
    'high-power-high-interest': 'Manage Closely',
    'high-power-low-interest': 'Keep Satisfied',
    'low-power-high-interest': 'Keep Informed',
    'low-power-low-interest': 'Monitor',
    // Empathy Map labels
    said: 'What they said',
    thought: 'What they thought',
    felt: 'What they felt',
    experienced: 'What they experienced',
  };

  return labels[quadrant];
}
