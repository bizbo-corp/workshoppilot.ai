import { createClient, LiveMap, LiveObject, type JsonObject } from "@liveblocks/client";

/**
 * Liveblocks client — auth endpoint wires to /api/liveblocks-auth (Phase 56)
 * which returns a Liveblocks token for the current Clerk user or verified guest.
 *
 * Uses a callback instead of a URL string so we can retry on 401. After a dev
 * server restart (or a Clerk JWT expiry), the first auth request may fail
 * because the Clerk session cookie hasn't been refreshed yet. Retrying after
 * a short delay gives ClerkProvider time to refresh the JWT.
 */
export const liveblocksClient = createClient({
  authEndpoint: async (room) => {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        // Wait before retry — gives Clerk time to refresh JWT
        await new Promise((r) => setTimeout(r, 2000));
      }

      const response = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }),
      });

      if (response.ok) {
        return response.json();
      }

      // Don't retry on 403 (explicitly forbidden, e.g. removed participant)
      if (response.status === 403) {
        const text = await response.text();
        return { error: "forbidden" as const, reason: text };
      }

      // Retry on 401 and 5xx
      if (attempt < maxAttempts - 1) {
        console.warn(
          `[Liveblocks] Auth attempt ${attempt + 1}/${maxAttempts} failed (${response.status}), retrying...`
        );
      }
    }

    return { error: "forbidden" as const, reason: "Authentication failed after retries" };
  },
  throttle: 50, // 50ms max broadcast rate for cursor presence (PRES-01)
  lostConnectionTimeout: 30_000, // 30s before 'failed' event fires (INFR-03)
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
 * Order matches THEME_COLORS in mind-map-theme-colors.ts so that indicator dots,
 * cursors, and mind map nodes all use the same hue family per participant.
 * Index 0 is the owner/facilitator (green).
 */
export const PARTICIPANT_COLORS = [
  '#608850', // green  (facilitator) — matches --canvas-green
  '#b07068', // pink   (1st participant) — matches --canvas-pink
  '#6888a0', // blue   — matches --canvas-blue
  '#c08030', // orange — matches --canvas-orange
  '#c49820', // yellow — matches --canvas-yellow
  '#a86050', // red    — matches --canvas-red
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
      mindMapReady: boolean; // participant signals "I'm done" on mind map
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
        participantId: string | null; // spar_xxx for participants, null for owner
      };
    };

    /**
     * RoomEvent: broadcast events for facilitator controls (Phase 58) and voting (Phase 59+).
     * Sent via useBroadcastEvent(), received via useEventListener().
     * Note: the broadcasting user does NOT receive their own events.
     */
    RoomEvent:
      | { type: 'STEP_CHANGED'; stepOrder: number; stepName: string }
      | { type: 'VIEWPORT_SYNC'; x: number; y: number; zoom: number }
      | { type: 'TIMER_UPDATE'; state: 'running' | 'paused' | 'expired' | 'cancelled'; remainingMs: number; totalMs: number }
      | { type: 'SESSION_ENDED' }
      | { type: 'VOTING_OPENED'; voteBudget: number }
      | { type: 'VOTING_CLOSED' }
      | { type: 'PARTICIPANT_REMOVED'; participantId: string };
  }
}
