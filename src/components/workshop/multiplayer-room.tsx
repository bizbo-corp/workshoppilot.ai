'use client';

import { createContext, useContext } from 'react';
import { ClientContext, RoomProvider, useSelf } from '@liveblocks/react';
import { LiveMap, LiveObject } from '@liveblocks/client';
import type { OpaqueClient } from '@liveblocks/core';
import { getRoomId, liveblocksClient, type CanvasElementStorable } from '@/lib/liveblocks/config';

/**
 * MultiplayerContext — provides participant color and multiplayer flag to
 * any component in the tree. Populated inside the RoomProvider so that
 * useSelf() is available.
 */
export const MultiplayerContext = createContext<{
  participantColor: string | null;
  isMultiplayer: boolean;
}>({ participantColor: null, isMultiplayer: false });

export function useMultiplayerContext() {
  return useContext(MultiplayerContext);
}

/**
 * MultiplayerRoomInner — rendered inside RoomProvider, reads the current
 * participant's color from Liveblocks presence and provides it via context.
 */
function MultiplayerRoomInner({ children }: { children: React.ReactNode }) {
  const self = useSelf();
  return (
    <MultiplayerContext.Provider
      value={{
        participantColor: self?.info?.color ?? null,
        isMultiplayer: true,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
}

interface MultiplayerRoomProps {
  workshopId: string;
  children: React.ReactNode;
}

/**
 * MultiplayerRoom — wraps children with Liveblocks RoomProvider.
 *
 * Enables useSelf() / useOthers() / useUpdateMyPresence() hooks for all
 * descendant components. The Zustand liveblocks() middleware and the
 * RoomProvider share the same Liveblocks room (WebSocket connection is
 * deduplicated by the Liveblocks client).
 *
 * initialPresence must include all Presence fields declared in config.ts.
 */
export default function MultiplayerRoom({ workshopId, children }: MultiplayerRoomProps) {
  return (
    <ClientContext.Provider value={liveblocksClient as unknown as OpaqueClient}>
      <RoomProvider
        id={getRoomId(workshopId)}
        initialPresence={{
          cursor: null,
          color: '#6366f1',
          displayName: '',
          editingDrawingNodeId: null,
        }}
        initialStorage={{
          elements: new LiveMap<string, LiveObject<CanvasElementStorable>>(),
        }}
      >
        <MultiplayerRoomInner>{children}</MultiplayerRoomInner>
      </RoomProvider>
    </ClientContext.Provider>
  );
}
