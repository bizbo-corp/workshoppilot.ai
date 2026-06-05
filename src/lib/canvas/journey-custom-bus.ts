/**
 * Journey custom-request bus — a tiny client-side event channel that lets the
 * Step 6 journey poll (canvas, in right-panel) ask the chat panel to have the
 * AI build a *custom* journey the user describes, rather than picking one of the
 * three offered templates.
 *
 * Why a bus and not the canvas store: the request is transient and per-client
 * (only the facilitator / solo owner drives the AI), so it must NOT sync via
 * Liveblocks. The poll emits; the chat panel (sibling component, same page)
 * subscribes and sends a visible user message to Wanda, who replies by emitting
 * a fresh [JOURNEY_POLL_OPTIONS] containing a localised `custom` option.
 *
 * Mirrors `grid-autocomplete-bus.ts`.
 */

export interface JourneyCustomRequest {
  /** What the user wants to map, in their own words. */
  description: string;
}

type Listener = (req: JourneyCustomRequest) => void;

const listeners = new Set<Listener>();

export function emitJourneyCustomRequest(req: JourneyCustomRequest): void {
  for (const l of listeners) l(req);
}

/** Subscribe; returns an unsubscribe function (use in a useEffect cleanup). */
export function onJourneyCustomRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
