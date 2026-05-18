"use client";

import * as React from "react";
import { Check, Lock } from "lucide-react";
import { useBroadcastEvent } from "@liveblocks/react";
import { toast } from "sonner";
import { useCanvasStore } from "@/providers/canvas-store-provider";
import { useMultiplayerContext } from "./multiplayer-room";
import {
  getParticipantDeepColor,
  getParticipantTextColor,
} from "@/lib/liveblocks/config";
import { getTemplateById } from "@/lib/workshop/journeyTemplates";
import { cn } from "@/lib/utils";

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * JourneyTemplatePoll — step-6 affordance that lets the team vote on which
 * journey template to use, with the facilitator locking the final pick. Synced
 * via the canvas store (multiplayer Liveblocks Storage). Renders above the
 * journey grid; once `lockedTemplate` is set, collapses to a thin banner.
 *
 * Multiplayer-only: in solo mode, this component is not rendered (the
 * facilitator picks directly via the chat as before).
 */
export function JourneyTemplatePoll() {
  const journeyPoll = useCanvasStore((s) => s.journeyPoll);
  const castVote = useCanvasStore((s) => s.castJourneyVote);
  const retractVote = useCanvasStore((s) => s.retractJourneyVote);
  const lockTemplate = useCanvasStore((s) => s.lockJourneyTemplate);
  const {
    isMultiplayer,
    isFacilitator,
    participantId,
    displayName,
    participantColor,
  } = useMultiplayerContext();
  const broadcast = useBroadcastEvent();

  if (!isMultiplayer || !journeyPoll) return null;
  if (journeyPoll.lockedTemplate) {
    return <LockedBanner template={journeyPoll.lockedTemplate} />;
  }

  // Voter id mirrors the Liveblocks userId convention used elsewhere.
  const voterId = participantId ?? "owner";
  const voterName = displayName ?? (isFacilitator ? "Facilitator" : "You");
  const voterColor = participantColor ?? "#b3efbd";

  const myVote = journeyPoll.votes.find((v) => v.voterId === voterId);

  const handleVote = (templateId: string) => {
    // Toggle off if clicking the same option again.
    if (myVote?.templateId === templateId) {
      retractVote(voterId);
      broadcast({
        type: "JOURNEY_POLL_VOTE_CAST",
        voterId,
        voterName,
        voterColor,
        templateId,
        retract: true,
      });
      return;
    }
    const vote = {
      voterId,
      voterName,
      voterColor,
      templateId,
      votedAt: Date.now(),
    };
    castVote(vote);
    broadcast({
      type: "JOURNEY_POLL_VOTE_CAST",
      voterId,
      voterName,
      voterColor,
      templateId,
    });
  };

  const handleLock = () => {
    // Tally votes; pick the most-voted option, break ties by earliest voted.
    const counts = new Map<string, { count: number; firstVoteAt: number }>();
    for (const v of journeyPoll.votes) {
      const c = counts.get(v.templateId);
      if (c) {
        c.count += 1;
        c.firstVoteAt = Math.min(c.firstVoteAt, v.votedAt);
      } else {
        counts.set(v.templateId, { count: 1, firstVoteAt: v.votedAt });
      }
    }
    let winner: string | null = null;
    let best = { count: -1, firstVoteAt: Number.MAX_SAFE_INTEGER };
    for (const [tid, c] of counts) {
      if (
        c.count > best.count ||
        (c.count === best.count && c.firstVoteAt < best.firstVoteAt)
      ) {
        winner = tid;
        best = c;
      }
    }
    if (!winner) {
      toast.error("Need at least one vote before locking.");
      return;
    }
    const option = journeyPoll.options.find((o) => o.templateId === winner);
    const templateName = option?.templateName ?? winner;
    lockTemplate(winner, templateName);
    broadcast({
      type: "JOURNEY_POLL_LOCKED",
      templateId: winner,
      templateName,
    });
    toast.success(`Locked: ${templateName}`);
  };

  const totalVotes = journeyPoll.votes.length;

  return (
    <div className="mb-4 rounded-xl border border-olive-200 bg-card p-5 shadow-sm dark:border-neutral-olive-800">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Pick a journey structure together
          </h3>
          <p className="text-xs text-muted-foreground">
            The team votes; the facilitator confirms.
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {journeyPoll.options.map((option) => {
          const isSelected = myVote?.templateId === option.templateId;
          const voters = journeyPoll.votes.filter(
            (v) => v.templateId === option.templateId,
          );
          // Prefer the template's actual stages from the catalog when present;
          // fall back to the option's stagePreview (in case the catalog id is
          // unknown — defensive).
          const catalogTemplate = getTemplateById(option.templateId);
          const previewStages = catalogTemplate
            ? catalogTemplate.stages.slice(0, 3).map((s) => s.name)
            : option.stagePreview;

          return (
            <button
              key={option.templateId}
              type="button"
              onClick={() => handleVote(option.templateId)}
              className={cn(
                "group flex flex-col gap-2 rounded-lg border bg-background p-4 text-left transition-all",
                "hover:border-olive-500 hover:shadow-sm",
                isSelected
                  ? "border-olive-500 ring-2 ring-olive-500/30"
                  : "border-olive-200 dark:border-neutral-olive-800",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {option.templateName}
                </span>
                {isSelected && (
                  <Check
                    className="h-4 w-4 flex-none text-olive-500"
                    aria-hidden
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
              {previewStages.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {previewStages.map((stage, i) => (
                    <span
                      key={`${option.templateId}-stage-${i}`}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {stage}
                    </span>
                  ))}
                </div>
              )}
              {voters.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {voters.map((v) => (
                    <span
                      key={`${option.templateId}-voter-${v.voterId}`}
                      title={v.voterName}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold leading-none"
                      style={{
                        backgroundColor: getParticipantDeepColor(v.voterColor),
                        color: getParticipantTextColor(v.voterColor),
                      }}
                      aria-label={`${v.voterName} voted for ${option.templateName}`}
                    >
                      {initialsOf(v.voterName)}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isFacilitator && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <p className="text-xs text-muted-foreground">
            {totalVotes === 0
              ? "Waiting for votes…"
              : "Lock the team's pick to start mapping."}
          </p>
          <button
            type="button"
            onClick={handleLock}
            disabled={totalVotes === 0}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors",
              "hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Lock template
          </button>
        </div>
      )}
    </div>
  );
}

function LockedBanner({
  template,
}: {
  template: { templateId: string; templateName: string };
}) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-olive-300 bg-olive-50/60 px-4 py-2.5 text-sm dark:border-olive-700 dark:bg-olive-950/30">
      <Check className="h-4 w-4 flex-none text-olive-600" aria-hidden />
      <span className="font-medium text-foreground">
        {template.templateName}
      </span>
      <span className="text-xs text-muted-foreground">
        — locked by the team
      </span>
    </div>
  );
}
