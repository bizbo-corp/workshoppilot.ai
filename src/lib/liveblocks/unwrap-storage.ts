/**
 * Unwrap Liveblocks CRDT storage format to plain JavaScript objects.
 *
 * The Liveblocks REST API (`GET /v2/rooms/{roomId}/storage`) returns data
 * wrapped in CRDT type descriptors:
 *   - { liveblocksType: "LiveObject", data: {...} }
 *   - { liveblocksType: "LiveList", data: [...] }
 *   - { liveblocksType: "LiveMap", data: {...} }
 *
 * This utility recursively strips these wrappers, yielding plain objects
 * and arrays that match the Zustand store shapes (stickyNotes, hmwCards, etc.).
 *
 * Also handles the alternative `type` property (older API versions).
 * If the input is already plain (e.g. from solo auto-save), it passes through unchanged.
 */
export function unwrapLiveblocksStorage(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(unwrapLiveblocksStorage);

  const obj = data as Record<string, unknown>;
  const lbType = (obj.liveblocksType || obj.type) as string | undefined;

  if (lbType === 'LiveObject' && 'data' in obj) {
    const inner = obj.data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inner)) {
      result[key] = unwrapLiveblocksStorage(value);
    }
    return result;
  }

  if (lbType === 'LiveList' && 'data' in obj) {
    return (obj.data as unknown[]).map(unwrapLiveblocksStorage);
  }

  if (lbType === 'LiveMap' && 'data' in obj) {
    const inner = obj.data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inner)) {
      result[key] = unwrapLiveblocksStorage(value);
    }
    return result;
  }

  // Regular object — recurse into values
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = unwrapLiveblocksStorage(value);
  }
  return result;
}
