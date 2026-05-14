'use client';

import { useEffect, useState } from 'react';
import { Clock, Sparkles } from 'lucide-react';

interface LobbyCountdownProps {
  /** ISO string for when the workshop starts. */
  startAtIso: string;
}

/**
 * Ticks once per second showing "Starts in 12:34" — flips to a "Ready to start"
 * banner once the scheduled time has passed.
 */
export function LobbyCountdown({ startAtIso }: LobbyCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const startMs = new Date(startAtIso).getTime();
  const diffMs = startMs - now;

  if (diffMs <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">
          Ready to start whenever the facilitator hits Go.
        </span>
      </div>
    );
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const label =
    days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : hours > 0
      ? `${hours}h ${String(minutes).padStart(2, '0')}m`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">Starts in {label}</span>
    </div>
  );
}
