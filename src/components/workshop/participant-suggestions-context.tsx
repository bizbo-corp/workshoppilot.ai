"use client";

import * as React from "react";
import type { ParticipantSuggestion } from "./participant-suggestion-card";

interface ParticipantSuggestionsContextValue {
  suggestions: ParticipantSuggestion[];
  /** Add a new suggestion. If one from the same participant on the same step
   *  exists for a different label, replace it (participants can change their
   *  mind). If the same label already exists from the same participant,
   *  refresh its timestamp. */
  addSuggestion: (next: ParticipantSuggestion) => void;
  /** Mark all current suggestions as resolved (faded). Called when the
   *  facilitator commits the final structural choice. */
  markAllResolved: () => void;
  /** Clear everything (e.g., on step change). */
  clear: () => void;
}

const ParticipantSuggestionsContext =
  React.createContext<ParticipantSuggestionsContextValue | null>(null);

/**
 * Holds the list of participant-suggested structural choices that should show
 * as system-notice cards in the facilitator's chat. Ephemeral — client-only,
 * not persisted. The Liveblocks broadcast that populates this is the
 * authoritative signal; persistence happens elsewhere (in the canvas state
 * when the facilitator actually locks the choice).
 *
 * Mount inside MultiplayerRoomInner so descendants (chat-panel) can consume.
 */
export function ParticipantSuggestionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [suggestions, setSuggestions] = React.useState<ParticipantSuggestion[]>(
    [],
  );

  const addSuggestion = React.useCallback((next: ParticipantSuggestion) => {
    setSuggestions((prev) => {
      // Replace any prior suggestion from the same participant — they only
      // count for their latest pick. Dedupe by participantId + label so a
      // double-click of the same chip doesn't stack.
      const filtered = prev.filter(
        (s) => s.participantId !== next.participantId,
      );
      return [...filtered, next];
    });
  }, []);

  const markAllResolved = React.useCallback(() => {
    setSuggestions((prev) =>
      prev.map((s) => (s.resolved ? s : { ...s, resolved: true })),
    );
  }, []);

  const clear = React.useCallback(() => {
    setSuggestions([]);
  }, []);

  const value = React.useMemo(
    () => ({ suggestions, addSuggestion, markAllResolved, clear }),
    [suggestions, addSuggestion, markAllResolved, clear],
  );

  return (
    <ParticipantSuggestionsContext.Provider value={value}>
      {children}
    </ParticipantSuggestionsContext.Provider>
  );
}

/**
 * Read the suggestions context. Returns a stable no-op default when used
 * outside a provider (solo mode) so consumers don't have to null-check.
 */
export function useParticipantSuggestions(): ParticipantSuggestionsContextValue {
  return (
    React.useContext(ParticipantSuggestionsContext) ?? DEFAULT_CONTEXT_VALUE
  );
}

const DEFAULT_CONTEXT_VALUE: ParticipantSuggestionsContextValue = {
  suggestions: [],
  addSuggestion: () => {},
  markAllResolved: () => {},
  clear: () => {},
};
