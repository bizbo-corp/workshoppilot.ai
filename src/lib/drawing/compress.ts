/**
 * VectorJson compression — strips redundant default values from drawing elements
 * before storage and restores them on load.
 *
 * Round-trip safe: compress → decompress always produces the original element.
 * Backward compatible: uncompressed elements pass through decompressElements unchanged.
 *
 * Expected ~30-40% reduction in vectorJson size for typical drawings.
 */

import type { DrawingElement } from './types';

/**
 * Default values that are stripped during compression.
 * Only BaseElement fields with well-known defaults.
 */
const DEFAULTS: Record<string, unknown> = {
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
};

/**
 * Compress drawing elements by removing fields that match their default values.
 * Returns a lightweight array suitable for JSON.stringify.
 */
export function compressElements(elements: DrawingElement[]): unknown[] {
  return elements.map((el) => {
    const compressed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(el)) {
      // Skip fields that match their default value
      if (key in DEFAULTS && value === DEFAULTS[key]) {
        continue;
      }
      // Skip undefined groupId
      if (key === 'groupId' && value === undefined) {
        continue;
      }
      compressed[key] = value;
    }

    return compressed;
  });
}

/**
 * Decompress elements by restoring default values for missing fields.
 * Handles both compressed (defaults stripped) and uncompressed (all fields present) input.
 */
export function decompressElements(compressed: unknown[]): DrawingElement[] {
  return compressed.map((item) => {
    const obj = item as Record<string, unknown>;

    // Restore defaults for any missing BaseElement fields
    for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
      if (!(key in obj)) {
        obj[key] = defaultValue;
      }
    }

    return obj as unknown as DrawingElement;
  });
}

/**
 * Compress a vectorJson string in-place: parse → compress elements → re-stringify.
 * Handles both old (plain array) and new (VectorData wrapper) formats.
 * Returns the compressed JSON string.
 */
export function compressVectorJson(raw: string): string {
  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      // Old format: plain array of elements
      return JSON.stringify(compressElements(parsed as DrawingElement[]));
    }

    // New format: VectorData wrapper
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.elements)) {
      return JSON.stringify({
        ...parsed,
        elements: compressElements(parsed.elements as DrawingElement[]),
      });
    }

    // Unrecognized format — return as-is
    return raw;
  } catch {
    // Malformed JSON — return as-is
    return raw;
  }
}
