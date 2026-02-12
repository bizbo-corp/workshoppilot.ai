/**
 * Vector simplification utilities for EzyDraw
 *
 * Uses Douglas-Peucker algorithm (via simplify-js) to reduce point count
 * in freehand strokes while preserving visual shape.
 */

// Type declaration for simplify-js (no @types package available)
declare module 'simplify-js' {
  type Point = { x: number; y: number };
  export default function simplify(
    points: Point[],
    tolerance?: number,
    highQuality?: boolean
  ): Point[];
}

import simplify from 'simplify-js';
import type { DrawingElement } from './types';

/**
 * Simplify drawing elements by reducing point count in pencil strokes
 *
 * Only simplifies elements with type==='pencil' that have 4+ point values.
 * Non-pencil elements (rectangles, circles, arrows, text, etc.) pass through unchanged.
 *
 * Uses Douglas-Peucker algorithm at tolerance=1.0 for 60%+ reduction while
 * maintaining visual fidelity.
 *
 * @param elements - Array of DrawingElement objects
 * @returns Array with simplified elements (creates new objects, preserves originals)
 */
export function simplifyDrawingElements(
  elements: DrawingElement[]
): DrawingElement[] {
  return elements.map((element) => {
    // Only simplify pencil strokes with sufficient points
    if (element.type !== 'pencil' || element.points.length < 4) {
      return element;
    }

    // Convert flat array [x1, y1, x2, y2, ...] to {x, y}[] format
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < element.points.length; i += 2) {
      points.push({
        x: element.points[i],
        y: element.points[i + 1],
      });
    }

    // Apply Douglas-Peucker simplification
    // tolerance=1.0: balance between reduction and quality
    // highQuality=true: uses full Douglas-Peucker algorithm
    const simplified = simplify(points, 1.0, true);

    // Convert back to flat array format
    const flatPoints: number[] = [];
    for (const point of simplified) {
      flatPoints.push(point.x, point.y);
    }

    // Return new element with simplified points
    return {
      ...element,
      points: flatPoints,
    };
  });
}
