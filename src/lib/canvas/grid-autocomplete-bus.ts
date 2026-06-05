/**
 * Grid autocomplete bus — a tiny client-side event channel that lets the Step 6
 * journey grid (canvas) ask the chat panel to have the AI auto-fill a row or a
 * single cell.
 *
 * Why a bus and not the canvas store: the request is transient and per-client
 * (only the facilitator / solo owner drives the AI), so it must NOT sync via
 * Liveblocks. The grid overlay emits; the chat panel (sibling component, same
 * page) subscribes and sends a hidden synthetic message to the model.
 */

export type GridAutocompleteScope = "row" | "cell";

export interface GridAutocompleteRequest {
  scope: GridAutocompleteScope;
  /** Grid row id, e.g. "actions", "barriers", "moments". Sent to the AI verbatim. */
  rowId: string;
  /** Human label for the row, e.g. "Actions". */
  rowLabel: string;
  /**
   * Columns to fill. For scope "row" this is every stage column; for scope
   * "cell" it's the single target column. id is the kebab column id used in
   * [GRID_ITEM col="..."]; label is the stage's display name.
   */
  columns: { id: string; label: string }[];
}

type Listener = (req: GridAutocompleteRequest) => void;

const listeners = new Set<Listener>();

export function emitGridAutocomplete(req: GridAutocompleteRequest): void {
  for (const l of listeners) l(req);
}

/** Subscribe; returns an unsubscribe function (use in a useEffect cleanup). */
export function onGridAutocomplete(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
