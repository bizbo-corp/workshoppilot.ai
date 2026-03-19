'use client';

/**
 * VotingHud — Floating pill HUD for dot-vote budget and Start/Close Voting controls.
 *
 * States:
 *   idle   → "Start Voting" pill button (solo only; hidden in multiplayer — timer drives voting)
 *   open   → Budget dots + remaining count; "All votes placed" text when exhausted
 *            "Close Voting" button shown for solo only — multiplayer facilitator uses FacilitatorControls
 *   closed → Renders nothing (VotingResultsPanel from Plan 02 takes over)
 *
 * Multiplayer behaviour (via useMultiplayerContext):
 *   - idle:  returns null (facilitator uses FacilitatorControls timer to start voting)
 *   - open:  shows budget dots for ALL users; "All votes placed" text for anyone done
 *            Close Voting button is hidden — facilitator uses FacilitatorControls
 *   - closed: returns null (same as solo)
 */

import { useCanvasStore } from '@/providers/canvas-store-provider';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { CircleDot, Check } from 'lucide-react';
import { useMultiplayerContext } from './multiplayer-room';
import { useUpdateMyPresence, useSelf } from '@liveblocks/react';
import { computeVotingResults, getVotableTargetIds, currentRoundVotes } from '@/lib/canvas/voting-utils';

/**
 * VotingDoneButton — inner component that uses Liveblocks hooks.
 * Must only render inside a RoomProvider (multiplayer path).
 */
function VotingDoneButton() {
  const updatePresence = useUpdateMyPresence();
  const votingDone = useSelf((me) => me.presence.votingDone);

  if (votingDone) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-primary">
        <Check className="h-3.5 w-3.5" />
        Done
      </span>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      className="rounded-full h-7 text-xs px-3"
      onClick={() => updatePresence({ votingDone: true })}
    >
      Done Voting
    </Button>
  );
}

interface VotingHudProps {
  /** Callback for parent to know voting closed — Plan 02 VotingResultsPanel will use this. */
  onVotingClosed?: () => void;
}

export function VotingHud({ onVotingClosed }: VotingHudProps) {
  const { user } = useUser();
  const voterId = user?.id ?? 'solo-anon';

  // Multiplayer context — safe to call in both solo and multiplayer
  const { isMultiplayer } = useMultiplayerContext();

  // Store selectors
  const rawDotVotes = useCanvasStore((state) => state.dotVotes);
  const votingSession = useCanvasStore((state) => state.votingSession);
  const dotVotes = currentRoundVotes(rawDotVotes, votingSession);
  const crazy8sSlots = useCanvasStore((state) => state.crazy8sSlots);
  const slotGroups = useCanvasStore((state) => state.slotGroups);
  const openVoting = useCanvasStore((state) => state.openVoting);
  const closeVoting = useCanvasStore((state) => state.closeVoting);
  const setVotingResults = useCanvasStore((state) => state.setVotingResults);

  // Derive per-voter budget usage
  const myVotes = dotVotes.filter((v) => v.voterId === voterId);
  const totalBudget = votingSession.voteBudget;
  const remainingBudget = totalBudget - myVotes.length;

  // ── Idle: Show "Start Voting" pill (solo only) ──────────────────────────────
  if (votingSession.status === 'idle') {
    // In multiplayer, voting is started by the facilitator via the timer in FacilitatorControls
    if (isMultiplayer) return null;
    // Solo: show Start Voting button — compute scaled budget from filled slots
    const handleStartVoting = () => {
      const filledSlots = crazy8sSlots.filter((s) => s.imageUrl);
      const scaledBudget = Math.max(5, Math.ceil(filledSlots.length * 0.3));
      openVoting(scaledBudget);
    };
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <Button
          variant="default"
          size="sm"
          className="rounded-full shadow-sm gap-1.5"
          onClick={handleStartVoting}
        >
          <CircleDot className="h-3.5 w-3.5" />
          Start Voting
        </Button>
      </div>
    );
  }

  // ── Closed: Nothing — VotingResultsPanel takes over ─────────────────────────
  if (votingSession.status === 'closed') {
    return null;
  }

  // ── Open: Budget HUD pill ───────────────────────────────────────────────────
  const handleCloseVoting = () => {
    const targetIds = getVotableTargetIds(crazy8sSlots, slotGroups);
    const results = computeVotingResults(dotVotes, targetIds);
    closeVoting();
    setVotingResults(results);
    onVotingClosed?.();
  };

  const allVotesPlaced = remainingBudget === 0;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-sm border shadow-sm px-4 py-2">
        {/* Dot glyphs: filled for placed, empty for remaining */}
        <div className="flex items-center gap-0.5 text-sm" aria-label={`${remainingBudget} of ${totalBudget} votes remaining`}>
          {Array.from({ length: totalBudget }).map((_, i) => (
            <span
              key={i}
              className={i < myVotes.length ? 'text-primary' : 'text-muted-foreground/40'}
            >
              {i < myVotes.length ? '●' : '○'}
            </span>
          ))}
        </div>

        {allVotesPlaced ? (
          isMultiplayer ? (
            <VotingDoneButton />
          ) : (
            <>
              <span className="text-xs font-medium text-foreground">All votes placed</span>
              <Button
                variant="default"
                size="sm"
                className="rounded-full h-7 text-xs px-3"
                onClick={handleCloseVoting}
              >
                Close Voting
              </Button>
            </>
          )
        ) : (
          <span className="text-xs text-muted-foreground">
            {remainingBudget} of {totalBudget} remaining
          </span>
        )}
      </div>
    </div>
  );
}
