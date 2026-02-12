/**
 * SVG path generation for speech bubbles with adjustable tails
 *
 * Generates a rounded rectangle body with a triangular tail using quadratic bezier curves.
 * The tail is integrated into the bottom edge of the bubble.
 */

/**
 * Generate SVG path data for a speech bubble with rounded corners and tail.
 *
 * @param x - Top-left x coordinate of the bubble body
 * @param y - Top-left y coordinate of the bubble body
 * @param width - Width of the bubble body
 * @param height - Height of the bubble body
 * @param tailX - Absolute x position of the tail tip (relative to bubble origin)
 * @param tailY - Absolute y position of the tail tip (relative to bubble origin)
 * @param cornerRadius - Radius for rounded corners (default 8)
 * @returns SVG path data string
 */
export function generateSpeechBubblePath(
  x: number,
  y: number,
  width: number,
  height: number,
  tailX: number,
  tailY: number,
  cornerRadius: number = 8
): string {
  // Clamp corner radius to prevent overlap
  const maxRadius = Math.min(width, height) / 2;
  const r = Math.min(cornerRadius, maxRadius);

  // Tail configuration
  const tailBaseWidth = 20; // Width of tail base on bubble edge
  const bubbleBottom = y + height;

  // Clamp tail tip position to reasonable bounds
  // Tail should not be inside the bubble
  const clampedTailY = Math.max(tailY, bubbleBottom + 5);

  // Calculate tail base center point on bottom edge
  // Clamp to stay within the bottom edge (leaving room for corners and tail width)
  const tailBaseCenterX = Math.max(
    x + r + tailBaseWidth / 2,
    Math.min(tailX, x + width - r - tailBaseWidth / 2)
  );

  // Tail base anchor points
  const tailLeftX = tailBaseCenterX - tailBaseWidth / 2;
  const tailRightX = tailBaseCenterX + tailBaseWidth / 2;
  const tailBaseY = bubbleBottom;

  // Control points for tail bezier curves (smooth transition)
  const controlX = (tailBaseCenterX + tailX) / 2;
  const controlY = (tailBaseY + clampedTailY) / 2;

  // Build SVG path (clockwise from top-left)
  const path = [
    // Start at top-left corner (after radius)
    `M ${x + r} ${y}`,

    // Top edge to top-right corner
    `L ${x + width - r} ${y}`,

    // Top-right corner (quadratic bezier)
    `Q ${x + width} ${y} ${x + width} ${y + r}`,

    // Right edge to bottom-right corner
    `L ${x + width} ${y + height - r}`,

    // Bottom-right corner
    `Q ${x + width} ${y + height} ${x + width - r} ${y + height}`,

    // Bottom edge to tail (right side)
    `L ${tailRightX} ${tailBaseY}`,

    // Tail right curve to tip
    `Q ${controlX} ${controlY} ${tailX} ${clampedTailY}`,

    // Tail tip to left curve
    `Q ${controlX} ${controlY} ${tailLeftX} ${tailBaseY}`,

    // Bottom edge from tail to bottom-left corner
    `L ${x + r} ${y + height}`,

    // Bottom-left corner
    `Q ${x} ${y + height} ${x} ${y + height - r}`,

    // Left edge to top-left corner
    `L ${x} ${y + r}`,

    // Top-left corner
    `Q ${x} ${y} ${x + r} ${y}`,

    // Close path
    'Z',
  ];

  return path.join(' ');
}
