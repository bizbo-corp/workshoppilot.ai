'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useSelf, useOthers, useUpdateMyPresence } from '@liveblocks/react';

export type Crazy8sReadinessMap = Record<string, boolean>;

export type Crazy8sReadinessSyncHandle = {
  setReady: (ready: boolean) => void;
};

/**
 * Crazy8sReadinessSync — renderless component that bridges Liveblocks presence
 * to per-participant "I'm Done" readiness state for Crazy 8s.
 *
 * Must be rendered inside RoomProvider. Mirrors MindMapReadinessSync pattern.
 * Uses `crazy8sReady` presence field. Exposes `setReady(boolean)` (one-way
 * completion) instead of `toggleReady()`.
 *
 * Maps facilitator self-key as 'facilitator' since owner has participantId: null.
 * On unmount, resets own crazy8sReady to false.
 */
export const Crazy8sReadinessSync = forwardRef<
  Crazy8sReadinessSyncHandle,
  { onReadinessChange: (map: Crazy8sReadinessMap) => void }
>(function Crazy8sReadinessSync({ onReadinessChange }, ref) {
  const updatePresence = useUpdateMyPresence();

  // Current user's readiness + participantId + role
  const selfReady = useSelf((me) => me.presence.crazy8sReady) ?? false;
  const selfParticipantId = useSelf((me) => me.info?.participantId) ?? null;
  const selfRole = useSelf((me) => me.info?.role) ?? null;

  // All others' readiness
  const othersReadiness = useOthers((others) =>
    others
      .filter((u) => u.info?.participantId || u.info?.role === 'owner')
      .map((u) => ({
        key: u.info.participantId || 'facilitator',
        ready: u.presence.crazy8sReady ?? false,
      }))
  );

  // Build readiness map and propagate via callback
  const prevMapRef = useRef<string>('');
  useEffect(() => {
    const map: Crazy8sReadinessMap = {};

    // Add self — use 'facilitator' key for owner (participantId is null)
    const selfKey = selfParticipantId || (selfRole === 'owner' ? 'facilitator' : null);
    if (selfKey) {
      map[selfKey] = selfReady;
    }

    // Add others
    for (const entry of othersReadiness) {
      map[entry.key] = entry.ready;
    }

    // Only fire callback if map actually changed (shallow JSON compare)
    const serialized = JSON.stringify(map);
    if (serialized !== prevMapRef.current) {
      prevMapRef.current = serialized;
      onReadinessChange(map);
    }
  }, [selfReady, selfParticipantId, selfRole, othersReadiness, onReadinessChange]);

  // Expose setReady via ref
  useImperativeHandle(ref, () => ({
    setReady: (ready: boolean) => {
      updatePresence({ crazy8sReady: ready });
    },
  }), [updatePresence]);

  // Reset own readiness on unmount (phase transition)
  useEffect(() => {
    return () => {
      updatePresence({ crazy8sReady: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
});
