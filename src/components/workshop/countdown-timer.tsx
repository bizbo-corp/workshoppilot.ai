'use client';

import { useState, useEffect } from 'react';
import { useEventListener } from '@liveblocks/react';
import { cn } from '@/lib/utils';
import { useMultiplayerContext } from './multiplayer-room';

/**
 * playChime — synthesize a short chime sound using Web Audio API.
 * Duplicated from facilitator-controls.tsx to avoid import coupling.
 */
function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
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

/**
 * CountdownTimer — participant-side countdown display.
 *
 * Listens for TIMER_UPDATE broadcast events from the facilitator.
 * Between broadcasts (which arrive every ~1 second), the participant runs
 * a local 1-second interval to smoothly count down. Each broadcast resyncs
 * the remaining time to prevent drift.
 *
 * The facilitator does NOT see this component — their timer is managed
 * locally inside FacilitatorControls.
 */
export function CountdownTimer() {
  const { isFacilitator } = useMultiplayerContext();
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'expired' | 'cancelled'>('idle');
  const [remainingMs, setRemainingMs] = useState(0);

  // Listen for timer updates from facilitator
  useEventListener(({ event }) => {
    if (event.type === 'TIMER_UPDATE') {
      setTimerState(event.state);
      setRemainingMs(event.remainingMs);

      if (event.state === 'expired') {
        playChime();
      }
      if (event.state === 'cancelled') {
        // Brief display then hide
        setTimeout(() => {
          setTimerState('idle');
          setRemainingMs(0);
        }, 500);
      }
    }
  });

  // Local countdown between broadcasts for smooth display
  useEffect(() => {
    if (timerState !== 'running') return;

    const interval = setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState]);

  // Auto-reset expired timer after 5 seconds
  useEffect(() => {
    if (timerState === 'expired') {
      const timeout = setTimeout(() => {
        setTimerState('idle');
        setRemainingMs(0);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [timerState]);

  // Don't render for facilitator (they have their own timer in FacilitatorControls)
  // or when timer is idle
  if (isFacilitator || timerState === 'idle') return null;

  return (
    <div
      className={cn(
        'fixed top-14 right-3 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-mono font-semibold shadow-sm border',
        'bg-background/80 backdrop-blur-sm',
        timerState === 'expired'
          ? 'border-red-500 text-red-600 dark:text-red-400 animate-pulse'
          : timerState === 'paused'
          ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
          : 'border-border text-foreground'
      )}
    >
      <span>{formatTime(remainingMs)}</span>
      {timerState === 'paused' && (
        <span className="text-xs font-normal text-muted-foreground">Paused</span>
      )}
    </div>
  );
}
