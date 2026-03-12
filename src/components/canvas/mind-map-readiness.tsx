'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useSelf, useOthers, useUpdateMyPresence } from '@liveblocks/react';

export type ReadinessMap = Record<string, boolean>;

export type MindMapReadinessSyncHandle = {
  toggleReady: () => void;
};

/**
 * MindMapReadinessSync — renderless component that bridges Liveblocks presence
 * to per-participant "I'm Done" readiness state.
 *
 * Must be rendered inside RoomProvider. Follows the CursorBroadcaster pattern:
 * reads presence via useSelf/useOthers and exposes state via callback + ref.
 *
 * On unmount (phase transition to Crazy 8s), resets own mindMapReady to false.
 */
export const MindMapReadinessSync = forwardRef<
  MindMapReadinessSyncHandle,
  { onReadinessChange: (map: ReadinessMap) => void }
>(function MindMapReadinessSync({ onReadinessChange }, ref) {
  const updatePresence = useUpdateMyPresence();

  // Current user's readiness + participantId
  const selfReady = useSelf((me) => me.presence.mindMapReady) ?? false;
  const selfParticipantId = useSelf((me) => me.info?.participantId) ?? null;

  // All others' readiness
  const othersReadiness = useOthers((others) =>
    others
      .filter((u) => u.info?.role === 'participant' && u.info?.participantId)
      .map((u) => ({
        participantId: u.info.participantId!,
        ready: u.presence.mindMapReady ?? false,
      }))
  );

  // Build readiness map and propagate via callback
  const prevMapRef = useRef<string>('');
  useEffect(() => {
    const map: ReadinessMap = {};

    // Add self (only if participant, not facilitator)
    if (selfParticipantId) {
      map[selfParticipantId] = selfReady;
    }

    // Add others
    for (const entry of othersReadiness) {
      map[entry.participantId] = entry.ready;
    }

    // Only fire callback if map actually changed (shallow JSON compare)
    const serialized = JSON.stringify(map);
    if (serialized !== prevMapRef.current) {
      prevMapRef.current = serialized;
      onReadinessChange(map);
    }
  }, [selfReady, selfParticipantId, othersReadiness, onReadinessChange]);

  // Expose toggleReady via ref
  useImperativeHandle(ref, () => ({
    toggleReady: () => {
      updatePresence({ mindMapReady: !selfReady });
    },
  }), [updatePresence, selfReady]);

  // Reset own readiness on unmount (phase transition)
  useEffect(() => {
    return () => {
      updatePresence({ mindMapReady: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
});
