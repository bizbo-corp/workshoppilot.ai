'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useBroadcastEvent, useOthers, useUpdateMyPresence } from '@liveblocks/react';
import { shallow } from '@liveblocks/react';
import { useRouter } from 'next/navigation';
import { Eye, Timer, Square, Pause, Play, X, RotateCcw, CheckCircle2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMultiplayerContext } from './multiplayer-room';
import { endWorkshopSession } from '@/actions/session-actions';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { computeVotingResults, getVotableTargetIds, currentRoundVotes } from '@/lib/canvas/voting-utils';

// Timer preset durations in milliseconds
const TIMER_PRESETS = [
  { label: '1 min', ms: 60_000 },
  { label: '3 min', ms: 180_000 },
  { label: '5 min', ms: 300_000 },
  { label: '10 min', ms: 600_000 },
] as const;

/**
 * playChime — synthesize a short chime sound using Web Audio API.
 * No audio file needed — zero bundle cost.
 */
function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  } catch {
    // Silently ignore if AudioContext is not available
  }
}

/** Format milliseconds as MM:SS */
function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}


interface FacilitatorControlsProps {
  workshopId: string;
  sessionId: string;
  votingMode?: boolean; // true when in idea-selection phase (Step 8)
  stepOrder?: number;
}

export function FacilitatorControls({ workshopId, sessionId: _sessionId, votingMode, stepOrder }: FacilitatorControlsProps) {
  const { isFacilitator } = useMultiplayerContext();
  const broadcast = useBroadcastEvent();
  const router = useRouter();

  // Voting store selectors — always called (hooks before early returns)
  const openVoting = useCanvasStore((s) => s.openVoting);
  const closeVoting = useCanvasStore((s) => s.closeVoting);
  const resetVoting = useCanvasStore((s) => s.resetVoting);
  const resetAndOpenVoting = useCanvasStore((s) => s.resetAndOpenVoting);
  const setVotingResults = useCanvasStore((s) => s.setVotingResults);
  const votingSession = useCanvasStore((s) => s.votingSession);
  const setConceptActivityStarted = useCanvasStore((s) => s.setConceptActivityStarted);
  const conceptActivityStarted = useCanvasStore((s) => s.conceptActivityStarted);
  const setPendingFocusCardId = useCanvasStore((s) => s.setPendingFocusCardId);
  const storeApi = useCanvasStoreApi();
  const updatePresence = useUpdateMyPresence();

  // Track whether all participants have signalled "Done Voting"
  const othersVotingDone = useOthers(
    (others) => others.filter(u => u.info?.role === 'participant').map(u => u.presence.votingDone ?? false),
    shallow,
  );
  const allParticipantsDone = othersVotingDone.length > 0 && othersVotingDone.every(Boolean);

  // Ref to avoid stale closures in timer intervals (Pitfall 2 from RESEARCH.md)
  // votingSessionRef always holds the latest votingSession value
  const votingSessionRef = useRef(votingSession);
  useEffect(() => {
    votingSessionRef.current = votingSession;
  }, [votingSession]);

  // Timer state
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'expired'>('idle');
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showTimerPresets, setShowTimerPresets] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');

  // End session state
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // --- Viewport Sync ---
  const handleViewportSync = useCallback(() => {
    // Dispatch custom DOM event — FacilitatorViewportCapture in react-flow-canvas.tsx
    // listens for this, reads getViewport(), and broadcasts via useBroadcastEvent.
    document.dispatchEvent(new Event('facilitator-viewport-sync'));
    toast('Viewport synced to all participants', { duration: 2000 });
  }, []);

  // --- Timer ---
  const startTimer = useCallback((ms: number) => {
    // Clear any existing timer
    if (intervalRef.current) clearInterval(intervalRef.current);

    setTimerState('running');
    setRemainingMs(ms);
    setTotalMs(ms);
    setShowTimerPresets(false);
    broadcast({ type: 'TIMER_UPDATE', state: 'running', remainingMs: ms, totalMs: ms });

    // Open voting when starting timer and voting is idle (check store state directly
    // instead of votingMode prop to avoid false negatives from prop derivation bugs)
    if (votingSessionRef.current?.status === 'idle') {
      const filledSlots = storeApi.getState().crazy8sSlots.filter((s) => s.imageUrl);
      const scaledBudget = Math.max(5, Math.ceil(filledSlots.length * 0.3));
      broadcast({ type: 'VOTING_OPENED', voteBudget: scaledBudget });
      // Facilitator's own store — useEventListener does NOT fire for the sender
      openVoting(scaledBudget);
    }

    intervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimerState('expired');
          broadcast({ type: 'TIMER_UPDATE', state: 'expired', remainingMs: 0, totalMs: ms });
          playChime();

          // Close voting on timer expiry if voting is currently open
          if (votingSessionRef.current?.status === 'open') {
            const state = storeApi.getState();
            const votes = currentRoundVotes(state.dotVotes, state.votingSession);
            const targetIds = getVotableTargetIds(state.crazy8sSlots, state.slotGroups);
            const results = computeVotingResults(votes, targetIds);
            broadcast({ type: 'VOTING_CLOSED' });
            closeVoting();
            setVotingResults(results);
          }

          // Auto-reset to idle after 5 seconds
          setTimeout(() => {
            setTimerState('idle');
            setRemainingMs(0);
          }, 5000);
          return 0;
        }
        broadcast({ type: 'TIMER_UPDATE', state: 'running', remainingMs: next, totalMs: ms });
        return next;
      });
    }, 1000);
  }, [broadcast, openVoting, closeVoting, setVotingResults, storeApi]);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('paused');
    broadcast({ type: 'TIMER_UPDATE', state: 'paused', remainingMs, totalMs });
  }, [broadcast, remainingMs, totalMs]);

  const resumeTimer = useCallback(() => {
    const currentRemaining = remainingMs;
    const currentTotal = totalMs;
    setTimerState('running');
    broadcast({ type: 'TIMER_UPDATE', state: 'running', remainingMs: currentRemaining, totalMs: currentTotal });

    intervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimerState('expired');
          broadcast({ type: 'TIMER_UPDATE', state: 'expired', remainingMs: 0, totalMs: currentTotal });
          playChime();

          // Close voting on timer expiry (resume path) if voting is open
          if (votingSessionRef.current?.status === 'open') {
            const state = storeApi.getState();
            const votes = currentRoundVotes(state.dotVotes, state.votingSession);
            const targetIds = getVotableTargetIds(state.crazy8sSlots, state.slotGroups);
            const results = computeVotingResults(votes, targetIds);
            broadcast({ type: 'VOTING_CLOSED' });
            closeVoting();
            setVotingResults(results);
          }

          setTimeout(() => {
            setTimerState('idle');
            setRemainingMs(0);
          }, 5000);
          return 0;
        }
        broadcast({ type: 'TIMER_UPDATE', state: 'running', remainingMs: next, totalMs: currentTotal });
        return next;
      });
    }, 1000);
  }, [broadcast, remainingMs, totalMs, closeVoting, setVotingResults, storeApi]);

  const cancelTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setRemainingMs(0);
    setTotalMs(0);
    broadcast({ type: 'TIMER_UPDATE', state: 'cancelled', remainingMs: 0, totalMs: 0 });

    // Cancelling timer while voting is open also closes voting
    if (votingSessionRef.current?.status === 'open') {
      const cancelState = storeApi.getState();
      const cancelVotes = currentRoundVotes(cancelState.dotVotes, cancelState.votingSession);
      const targetIds = getVotableTargetIds(cancelState.crazy8sSlots, cancelState.slotGroups);
      const results = computeVotingResults(cancelVotes, targetIds);
      broadcast({ type: 'VOTING_CLOSED' });
      closeVoting();
      setVotingResults(results);
    }
  }, [broadcast, closeVoting, setVotingResults, storeApi]);

  // Reset all votes and re-open voting from scratch
  const handleResetVotes = useCallback(() => {
    // Cancel any running timer
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setRemainingMs(0);
    setTotalMs(0);

    // Compute fresh budget (same logic as startTimer)
    const filledSlots = storeApi.getState().crazy8sSlots.filter((s) => s.imageUrl);
    const scaledBudget = Math.max(5, Math.ceil(filledSlots.length * 0.3));

    // Atomic reset+open — single CRDT write avoids race where voteBudget:2 wins
    resetAndOpenVoting(scaledBudget);

    // Broadcast so participants reset immediately
    broadcast({ type: 'VOTING_RESET', voteBudget: scaledBudget });
    broadcast({ type: 'TIMER_UPDATE', state: 'cancelled', remainingMs: 0, totalMs: 0 });

    // Reset votingDone presence for facilitator
    updatePresence({ votingDone: false });

    toast('All votes have been reset', { duration: 2000 });
  }, [broadcast, resetAndOpenVoting, storeApi, updatePresence]);

  // Close voting manually (facilitator clicks "Close Voting")
  const handleCloseVotingManual = useCallback(() => {
    const state = storeApi.getState();
    const votes = currentRoundVotes(state.dotVotes, state.votingSession);
    const targetIds = getVotableTargetIds(state.crazy8sSlots, state.slotGroups);
    const results = computeVotingResults(votes, targetIds);
    broadcast({ type: 'VOTING_CLOSED' });
    closeVoting();
    setVotingResults(results);

    // Cancel any running timer
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setRemainingMs(0);
    setTotalMs(0);
    broadcast({ type: 'TIMER_UPDATE', state: 'cancelled', remainingMs: 0, totalMs: 0 });
  }, [broadcast, closeVoting, setVotingResults, storeApi]);

  const handleCustomTimer = useCallback(() => {
    const mins = parseInt(customMinutes, 10);
    if (isNaN(mins) || mins < 1 || mins > 60) {
      toast.error('Enter a value between 1 and 60 minutes');
      return;
    }
    startTimer(mins * 60_000);
    setCustomMinutes('');
  }, [customMinutes, startTimer]);

  // --- End Session ---
  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await endWorkshopSession(workshopId);
      // Broadcast SESSION_ENDED AFTER Neon write is committed
      broadcast({ type: 'SESSION_ENDED' });
      // Cancel any running timer
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Redirect facilitator to workshop detail page
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to end session:', err);
      toast.error('Failed to end session. Please try again.');
      setIsEnding(false);
    }
  };

  // Gate rendering — all hooks called above; early return here is safe
  if (!isFacilitator) return null;

  // Determine timer button label — "Start Voting Timer" when in voting idle mode
  const timerButtonLabel = votingMode && votingSession.status === 'idle' ? 'Start Voting Timer' : 'Timer';
  const timerDropdownHeader = votingMode && votingSession.status === 'idle' ? 'Start Voting Timer' : 'Set Timer';

  return (
    <>
      {/* Facilitator toolbar — rendered inline within multiplayer controls container.
          Button style matches the canvas toolbar: text-muted-foreground with hover:bg-accent. */}
      <div className="flex items-center gap-0.5">
        {/* Viewport sync button */}
        <button
          onClick={handleViewportSync}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Bring everyone to your view"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Sync View</span>
        </button>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Timer controls */}
        {timerState === 'idle' ? (
          <div className="relative">
            <button
              onClick={() => setShowTimerPresets(!showTimerPresets)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title={votingMode && votingSession.status === 'idle' ? 'Start voting timer for participants' : 'Set countdown timer'}
            >
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">{timerButtonLabel}</span>
            </button>

            {/* Timer preset dropdown */}
            {showTimerPresets && (
              <div className="absolute top-full mt-1 right-0 bg-card rounded-lg shadow-lg border border-border p-2 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150 z-50">
                <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  {timerDropdownHeader}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {TIMER_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => startTimer(preset.ms)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    placeholder="Min"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomTimer()}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="default" onClick={handleCustomTimer} className="h-8 shrink-0">
                    Start
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Active timer pill */
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-mono font-semibold',
              timerState === 'expired'
                ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 animate-pulse'
                : timerState === 'paused'
                ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400'
                : 'bg-accent text-accent-foreground'
            )}
          >
            <span>{formatTime(remainingMs)}</span>

            {timerState === 'running' && (
              <button
                onClick={pauseTimer}
                className="p-0.5 rounded hover:bg-background/50 transition-colors"
                title="Pause timer"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            )}
            {timerState === 'paused' && (
              <button
                onClick={resumeTimer}
                className="p-0.5 rounded hover:bg-background/50 transition-colors"
                title="Resume timer"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            )}
            {(timerState === 'running' || timerState === 'paused') && (
              <button
                onClick={cancelTimer}
                className="p-0.5 rounded hover:bg-background/50 transition-colors"
                title="Cancel timer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Close Voting button — visible when voting is open (not gated on votingMode
            so it shows even if the prop derivation is wrong) */}
        {votingSession.status === 'open' && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button
              onClick={handleCloseVotingManual}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                allParticipantsDone
                  ? 'bg-primary text-primary-foreground animate-pulse'
                  : 'text-primary hover:bg-primary/10',
              )}
              title={allParticipantsDone ? 'All participants are done — close voting' : 'Close voting and show results'}
            >
              <CheckCircle2 className="h-4 w-4" />
              Close Voting
            </button>
          </>
        )}

        {/* Reset Votes button — visible when voting is open or closed (not gated on
            votingMode so it always shows when voting has been initiated) */}
        {(votingSession.status === 'open' || votingSession.status === 'closed') && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button
              onClick={handleResetVotes}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Clear all votes and restart voting"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset Votes</span>
            </button>
          </>
        )}

        {/* Start Activity button — Step 9 only */}
        {stepOrder === 9 && !conceptActivityStarted && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button
              onClick={() => {
                broadcast({ type: 'CONCEPT_ACTIVITY_STARTED' });
                setConceptActivityStarted(true);
                // Focus facilitator on their first owned concept card
                const cards = storeApi.getState().conceptCards;
                const myCard = cards.find((c) => c.ownerId === 'facilitator');
                if (myCard) setPendingFocusCardId(myCard.id);
                toast('Activity started — participants navigated to their cards', { duration: 3000 });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              title="Start concept development activity for all participants"
            >
              <Rocket className="h-4 w-4" />
              <span className="hidden sm:inline">Start Activity</span>
            </button>
          </>
        )}

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* End Session button */}
        <button
          onClick={() => setShowEndConfirm(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          title="End workshop session"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          <span className="hidden sm:inline">End</span>
        </button>

        {/* Separator before presence avatars */}
        <div className="w-px h-5 bg-border mx-0.5" />
      </div>

      {/* End Session confirmation dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this workshop session?</DialogTitle>
            <DialogDescription>
              All participants will be disconnected. The current canvas state will be saved before ending.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEndConfirm(false)}
              disabled={isEnding}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndSession}
              disabled={isEnding}
            >
              {isEnding ? 'Ending...' : 'End Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
