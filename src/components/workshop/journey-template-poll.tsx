"use client";

import * as React from "react";
import { Icon } from '@/components/ui/icon';
import { useBroadcastEvent } from "@liveblocks/react";
import { toast } from "sonner";
import { useCanvasStore } from "@/providers/canvas-store-provider";
import { useMultiplayerContext } from "./multiplayer-room";
import {
  getParticipantDeepColor,
  getParticipantTextColor,
} from "@/lib/liveblocks/config";
import { getTemplateById } from "@/lib/workshop/journeyTemplates";
import type { JourneyPollOption } from "@/lib/canvas/journey-poll-types";
import { emitJourneyCustomRequest } from "@/lib/canvas/journey-custom-bus";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/** Fire the custom-journey request to the chat panel and acknowledge it. */
function requestCustomJourney(description: string) {
  emitJourneyCustomRequest({ description });
  toast("Asking Wanda to build your journey…", { duration: 2500 });
}

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Presentational view — no store, no Liveblocks. Renders the radio-style cards
// and the confirm button. Both the solo and multiplayer containers feed it.
// ---------------------------------------------------------------------------
interface JourneyTemplatePollViewProps {
  title: string;
  subtitle: string;
  options: JourneyPollOption[];
  /** Template id the current user has selected (their radio choice). */
  selectedTemplateId: string | null;
  onSelectOption: (templateId: string) => void;
  /** Optional badge text, e.g. "3 votes" (multiplayer). */
  countLabel?: string | null;
  /** Optional per-option extra (voter avatars in multiplayer). */
  renderVoters?: (templateId: string) => React.ReactNode;
  showConfirm: boolean;
  confirmDisabled: boolean;
  confirmHint?: string;
  onConfirm: () => void;
  /** When set, renders the "Create your own journey" affordance. The user types
   *  what they want to map and Wanda builds a custom option. Only wired for the
   *  person who drives the AI (solo owner / multiplayer facilitator). */
  onRequestCustom?: (description: string) => void;
}

export function JourneyTemplatePollView({
  title,
  subtitle,
  options,
  selectedTemplateId,
  onSelectOption,
  countLabel,
  renderVoters,
  showConfirm,
  confirmDisabled,
  confirmHint,
  onConfirm,
  onRequestCustom,
}: JourneyTemplatePollViewProps) {
  return (
    <Surface className="mb-4 border-olive-200 p-5 dark:border-neutral-olive-800">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {countLabel && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {countLabel}
          </span>
        )}
      </div>

      <div role="radiogroup" aria-label={title} className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {options.map((option) => {
          const isSelected = selectedTemplateId === option.templateId;
          // Prefer the AI's localised stages (what it spoke in chat) so the card
          // matches the conversation. Fall back to the option's stored preview,
          // then the generic catalog stages only as a last resort.
          const catalogTemplate = getTemplateById(option.templateId);
          const previewStages =
            option.stages && option.stages.length > 0
              ? option.stages.slice(0, 3)
              : option.stagePreview.length > 0
                ? option.stagePreview
                : catalogTemplate
                  ? catalogTemplate.stages.slice(0, 3).map((s) => s.name)
                  : [];

          return (
            <button
              key={option.templateId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectOption(option.templateId)}
              className={cn(
                "group relative flex cursor-pointer flex-col gap-2 rounded-lg border bg-background p-4 pl-10 text-left transition-all",
                "hover:border-olive-400 hover:shadow-md hover:-translate-y-0.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500/40",
                isSelected
                  ? "border-olive-500 ring-2 ring-olive-500/30 bg-olive-50/40 dark:bg-olive-950/20"
                  : "border-olive-200 dark:border-neutral-olive-800",
              )}
            >
              {/* Radio dot — top-left, makes "pick one" obvious */}
              <span
                aria-hidden
                className={cn(
                  "absolute left-3.5 top-4 flex h-4 w-4 flex-none items-center justify-center rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-olive-500"
                    : "border-olive-300 group-hover:border-olive-400 dark:border-neutral-olive-700",
                )}
              >
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-olive-500" />
                )}
              </span>

              <span className="text-sm font-semibold text-foreground">
                {option.templateName}
              </span>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
              {previewStages.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {previewStages.map((stage, i) => (
                    <span
                      key={`${option.templateId}-stage-${i}`}
                      className="rounded-full bg-olive-100 px-2 py-0.5 text-[11px] font-medium text-olive-900 dark:bg-neutral-olive-800 dark:text-neutral-olive-100"
                    >
                      {stage}
                    </span>
                  ))}
                </div>
              )}
              {renderVoters?.(option.templateId)}
            </button>
          );
        })}
      </div>

      {onRequestCustom && <CustomJourneyPanel onSubmit={onRequestCustom} />}

      {showConfirm && (
        <div className="mt-4 flex items-center justify-end gap-3">
          {confirmHint && (
            <p className="text-xs text-muted-foreground">{confirmHint}</p>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors",
              "hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Icon name="check" className="h-3.5 w-3.5" aria-hidden />
            Confirm journey type
          </button>
        </div>
      )}
    </Surface>
  );
}

/**
 * CustomJourneyPanel — "none of these fit?" affordance. Collapsed it's a single
 * link; expanded it takes a one-line description and asks Wanda to build a
 * bespoke journey (she replies by re-opening the poll with a localised `custom`
 * option). Only rendered for the person who drives the AI.
 */
function CustomJourneyPanel({
  onSubmit,
}: {
  onSubmit: (description: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = () => {
    const description = value.trim();
    if (!description) return;
    onSubmit(description);
    setValue("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-olive-300 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-olive-400 hover:text-foreground dark:border-neutral-olive-700"
      >
        <Icon name="plus" className="h-3.5 w-3.5" aria-hidden />
        None of these fit? Create your own journey
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-olive-300 bg-olive-50/40 p-3 dark:border-olive-700 dark:bg-olive-950/20">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Icon name="sparkles" className="h-4 w-4 text-olive-600" aria-hidden />
        Create your own journey
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Describe the journey you want to map and Wanda will draft the stages for
        you.
      </p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="e.g. patient notes that carry context across multiple vets"
        className="w-full rounded-md border border-olive-200 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500/40 dark:border-neutral-olive-800"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValue("");
          }}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="sparkles" className="h-3.5 w-3.5" aria-hidden />
          Ask Wanda to build
        </button>
      </div>
    </div>
  );
}

/**
 * SoloJourneyTemplatePoll — solo-mode chooser. No voting, no Liveblocks: the
 * single user selects one structure (radio) and confirms. Selection is recorded
 * in the canvas store's journeyPoll.votes under voterId "owner" so it survives a
 * refresh via `_canvas.journeyPoll`. Confirm locks the template, which triggers
 * the chat to emit [JOURNEY_STAGES] (see chat-panel lock effect).
 */
export function SoloJourneyTemplatePoll() {
  const journeyPoll = useCanvasStore((s) => s.journeyPoll);
  const castVote = useCanvasStore((s) => s.castJourneyVote);
  const lockTemplate = useCanvasStore((s) => s.lockJourneyTemplate);

  if (!journeyPoll) return null;
  if (journeyPoll.lockedTemplate) {
    return <LockedBanner template={journeyPoll.lockedTemplate} />;
  }

  const myVote = journeyPoll.votes.find((v) => v.voterId === "owner");
  const selectedTemplateId = myVote?.templateId ?? null;

  const handleSelect = (templateId: string) => {
    castVote({
      voterId: "owner",
      voterName: "You",
      voterColor: "#b3efbd",
      templateId,
      votedAt: Date.now(),
    });
  };

  const handleConfirm = () => {
    if (!selectedTemplateId) return;
    const option = journeyPoll.options.find(
      (o) => o.templateId === selectedTemplateId,
    );
    lockTemplate(
      selectedTemplateId,
      option?.templateName ?? selectedTemplateId,
      option?.stages,
    );
  };

  return (
    <JourneyTemplatePollView
      title="Pick a journey structure"
      subtitle="Choose the shape that best fits, then confirm to start mapping."
      options={journeyPoll.options}
      selectedTemplateId={selectedTemplateId}
      onSelectOption={handleSelect}
      showConfirm
      confirmDisabled={!selectedTemplateId}
      confirmHint={
        selectedTemplateId ? undefined : "Select a structure to continue."
      }
      onConfirm={handleConfirm}
      onRequestCustom={requestCustomJourney}
    />
  );
}

/**
 * JourneyTemplatePoll — multiplayer affordance that lets the team vote on which
 * journey structure to use, with the facilitator confirming the final pick.
 * Synced via the canvas store (Liveblocks Storage). Once `lockedTemplate` is
 * set, collapses to a thin banner.
 *
 * Multiplayer-only: solo mode renders <SoloJourneyTemplatePoll /> instead.
 */
export function JourneyTemplatePoll() {
  const journeyPoll = useCanvasStore((s) => s.journeyPoll);
  const castVote = useCanvasStore((s) => s.castJourneyVote);
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
    return <LockedBanner template={journeyPoll.lockedTemplate} byTeam />;
  }

  const voterId = participantId ?? "owner";
  const voterName = displayName ?? (isFacilitator ? "Facilitator" : "You");
  const voterColor = participantColor ?? "#b3efbd";

  // Dedupe votes by voterId, keeping the most recent. Liveblocks Storage CRDT
  // can merge concurrent writes from two sessions of the same voter and leave
  // duplicate entries; render-time dedupe covers every race.
  const dedupedVotes = Array.from(
    journeyPoll.votes
      .reduce((acc, v) => {
        const existing = acc.get(v.voterId);
        if (!existing || v.votedAt > existing.votedAt) acc.set(v.voterId, v);
        return acc;
      }, new Map<string, (typeof journeyPoll.votes)[number]>())
      .values(),
  );

  const myVote = dedupedVotes.find((v) => v.voterId === voterId);

  const handleSelect = (templateId: string) => {
    // Radio semantics: clicking an option selects it (no toggle-off).
    if (myVote?.templateId === templateId) return;
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

  const handleConfirm = () => {
    // Tally votes; pick the most-voted option, break ties by earliest voted.
    const counts = new Map<string, { count: number; firstVoteAt: number }>();
    for (const v of dedupedVotes) {
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
      toast.error("Need at least one vote before confirming.");
      return;
    }
    const option = journeyPoll.options.find((o) => o.templateId === winner);
    const templateName = option?.templateName ?? winner;
    lockTemplate(winner, templateName, option?.stages);
    broadcast({
      type: "JOURNEY_POLL_LOCKED",
      templateId: winner,
      templateName,
      stages: option?.stages,
    });
    toast.success(`Confirmed: ${templateName}`);
  };

  const totalVotes = dedupedVotes.length;

  const renderVoters = (templateId: string) => {
    const voters = dedupedVotes.filter((v) => v.templateId === templateId);
    if (voters.length === 0) return null;
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {voters.map((v) => (
          <span
            key={`${templateId}-voter-${v.voterId}`}
            title={v.voterName}
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold leading-none"
            style={{
              backgroundColor: getParticipantDeepColor(v.voterColor),
              color: getParticipantTextColor(v.voterColor),
            }}
            aria-label={`${v.voterName} voted for this option`}
          >
            {initialsOf(v.voterName)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <JourneyTemplatePollView
      title="Pick a journey structure together"
      subtitle="Everyone picks one; the facilitator confirms the team's choice."
      options={journeyPoll.options}
      selectedTemplateId={myVote?.templateId ?? null}
      onSelectOption={handleSelect}
      countLabel={`${totalVotes} ${totalVotes === 1 ? "vote" : "votes"}`}
      renderVoters={renderVoters}
      showConfirm={isFacilitator}
      confirmDisabled={totalVotes === 0}
      confirmHint={
        totalVotes === 0
          ? "Waiting for votes…"
          : "Confirm the team's pick to start mapping."
      }
      onConfirm={handleConfirm}
      onRequestCustom={isFacilitator ? requestCustomJourney : undefined}
    />
  );
}

function LockedBanner({
  template,
  byTeam = false,
}: {
  template: { templateId: string; templateName: string };
  byTeam?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-olive-300 bg-olive-50/60 px-4 py-2.5 text-sm dark:border-olive-700 dark:bg-olive-950/30">
      <Icon name="check" className="h-4 w-4 flex-none text-olive-600" aria-hidden />
      <span className="font-medium text-foreground">
        {template.templateName}
      </span>
      <span className="text-xs text-muted-foreground">
        {byTeam ? "— confirmed by the team" : "— confirmed"}
      </span>
    </div>
  );
}
