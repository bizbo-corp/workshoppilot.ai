'use client';

import { useEffect, useState } from 'react';

/**
 * Polls /api/participant-activity for the count of pending (not-yet-joined) invites.
 * Returns `null` while the first request is in flight; `0` when there are no pending invites.
 *
 * Pass `enabled={false}` to skip polling (e.g. before challengePublished, or for participants).
 * Uses the same 15s cadence as ParticipantOverview so the badge stays in sync with the panel.
 */
export function usePendingInviteCount(
  sessionId: string,
  stepId: string,
  enabled: boolean
): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await fetch(
          `/api/participant-activity?sessionId=${sessionId}&stepId=${stepId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setCount(Array.isArray(data?.pending) ? data.pending.length : 0);
        }
      } catch {
        // Silent — badge will simply not update on transient failures.
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, stepId, enabled]);

  // Derive the return value so a disabled hook reports null without needing
  // a setState-in-effect to clear state when `enabled` flips false.
  return enabled ? count : null;
}
