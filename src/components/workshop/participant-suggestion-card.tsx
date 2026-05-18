"use client";

import { Check } from "lucide-react";
import {
  getParticipantDeepColor,
  getParticipantTextColor,
} from "@/lib/liveblocks/config";

export interface ParticipantSuggestion {
  /** Stable id so we can dedupe and resolve later. */
  id: string;
  participantId: string;
  participantName: string;
  /** Hex from PARTICIPANT_COLORS — the participant's pastel. */
  participantColor: string;
  /** Display label for what they're suggesting (e.g., the journey template name). */
  label: string;
  /** Short descriptor of the action — "suggests", "picked", etc. */
  verb?: string;
  /** When true, render in the resolved (faded + check) state. */
  resolved?: boolean;
  /** Wall-clock ms; useful for sort + de-dupe but not displayed. */
  createdAt: number;
}

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Non-AI system-notice card rendered in the facilitator's chat stream when a
 * participant picks a structural option (e.g., journey template). Visually
 * distinct from AI prose and from user bubbles so the facilitator can scan
 * "who suggested what" without confusing it for their own dialogue.
 */
export function ParticipantSuggestionCard({
  suggestion,
}: {
  suggestion: ParticipantSuggestion;
}) {
  const { participantColor, participantName, label, verb, resolved } = suggestion;
  const avatarBg = getParticipantDeepColor(participantColor);
  const avatarText = getParticipantTextColor(participantColor);

  return (
    <div
      className={`flex items-stretch gap-2 transition-opacity ${
        resolved ? "opacity-50" : ""
      }`}
    >
      <div
        className="w-[3px] flex-none rounded-full"
        style={{ backgroundColor: participantColor }}
        aria-hidden
      />
      <div className="flex-1 rounded-lg border border-olive-200 bg-card px-3 py-2.5 dark:border-neutral-olive-800">
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-semibold leading-none"
            style={{ backgroundColor: avatarBg, color: avatarText }}
            aria-hidden
          >
            {initialsOf(participantName)}
          </span>
          <span className="text-xs font-medium text-foreground">
            {participantName}
          </span>
          <span className="text-xs text-muted-foreground">
            {verb ?? "suggests"}
          </span>
          {resolved && (
            <Check
              className="ml-auto h-3.5 w-3.5 text-muted-foreground"
              aria-hidden
            />
          )}
        </div>
        <div className="mt-1 text-sm text-foreground">{label}</div>
      </div>
    </div>
  );
}
