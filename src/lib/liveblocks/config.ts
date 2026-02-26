import { createClient, LiveMap, LiveObject, type JsonObject } from "@liveblocks/client";

/**
 * Liveblocks client — auth endpoint wires to /api/liveblocks-auth (Phase 56)
 * which returns a Liveblocks token for the current Clerk user or verified guest.
 */
export const liveblocksClient = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

/**
 * Room naming convention for all multiplayer workshops.
 * Produces deterministic room IDs from workshop UUIDs.
 *
 * @example getRoomId("abc-123") // => "workshop-abc-123"
 */
export function getRoomId(workshopId: string): string {
  return `workshop-${workshopId}`;
}

/**
 * Participant color palette — assigned at join time, consistent across reconnects.
 * Index 0 is the owner/facilitator default (indigo).
 * Subsequent colors are assigned by participant slot (participantCount % length).
 */
export const PARTICIPANT_COLORS = [
  '#6366f1', // indigo (facilitator/owner default)
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#84cc16', // lime
  '#8b5cf6', // violet
] as const;

/**
 * A JSON-safe, Liveblocks-storable representation of a canvas element.
 * This is the subset stored in Liveblocks Storage; the full canvas element
 * type (with React refs, derived state, etc.) is kept in the local Zustand store.
 *
 * Fields:
 *   - id: Unique element ID (matches local store key)
 *   - type: Element variant (sticky-note, card, group, etc.)
 *   - position: Top-left corner on the canvas
 *   - width / height: Bounding box dimensions
 *   - data: Element-specific payload (text, color, etc.) — kept generic to
 *           avoid coupling Storage shape to UI concerns
 *   - authorId: Liveblocks userId of the participant who created the element
 *               Used for per-user undo/redo via Liveblocks History API
 */
export type CanvasElementStorable = {
  id: string;
  type: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  data: JsonObject;
  authorId: string;
};

// ---------------------------------------------------------------------------
// Global Liveblocks type augmentation
// Defines the shared types for Presence, Storage, and UserMeta used across
// all multiplayer rooms. Must be set once here — not inside createRoomContext.
// ---------------------------------------------------------------------------

declare global {
  interface Liveblocks {
    /**
     * Presence: ephemeral per-participant state broadcast in real time.
     * - cursor is null when the participant's mouse leaves the canvas
     * - color is the participant's assigned hex color (assigned at join time)
     * - displayName comes from Clerk (owners) or the guest name entry form (participants)
     * - editingDrawingNodeId is set when a participant opens EzyDraw on a drawing node,
     *   enabling single-editor locking (null when not editing)
     */
    Presence: {
      cursor: { x: number; y: number } | null;
      color: string;
      displayName: string;
      editingDrawingNodeId: string | null; // EzyDraw single-editor lock
    };

    /**
     * Storage: durable shared state persisted by Liveblocks.
     * - elements: ID-keyed map of canvas elements wrapped in LiveObject for
     *   granular conflict resolution and per-user undo/redo via History API
     */
    Storage: {
      elements: LiveMap<string, LiveObject<CanvasElementStorable>>;
    };

    /**
     * UserMeta: resolved per-user metadata set by the auth endpoint.
     * - id: Liveblocks userId (Clerk userId for owners, guest-{uuid} for participants)
     * - info.name: display name shown in presence indicators
     * - info.color: hex color assigned at join time, consistent across reconnects
     * - info.role: 'owner' controls step progression and session management;
     *              'participant' can contribute canvas elements
     */
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        role: "owner" | "participant";
      };
    };
  }
}
