'use client';

import { createContext, useContext, useRef } from 'react';
import { ClientContext, RoomProvider, useSelf, useOthersListener, useLostConnectionListener } from '@liveblocks/react';
import { LiveMap, LiveObject } from '@liveblocks/client';
import type { OpaqueClient } from '@liveblocks/core';
import { toast } from 'sonner';
import { getRoomId, liveblocksClient, type CanvasElementStorable } from '@/lib/liveblocks/config';
import { PresenceBar } from './presence-bar';

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
 * JoinLeaveListener — renderless component that fires neutral toasts when
 * participants join or leave the room. Renders null; zero layout impact.
 *
 * Uses plain toast() (not toast.success/toast.error) per context decision.
 * duration: 3000 = 3-second auto-dismiss. Each person gets their own toast.
 */
function JoinLeaveListener() {
  useOthersListener(({ type, user }) => {
    if (type === 'enter') {
      toast(`${user.info?.name ?? 'Someone'} joined`, {
        duration: 3000,
      });
    } else if (type === 'leave') {
      toast(`${user.info?.name ?? 'Someone'} left`, {
        duration: 3000,
      });
    }
  });
  return null;
}

/**
 * ReconnectionListener — renderless component that fires toast notifications
 * on Liveblocks connection state changes.
 *
 * Events from useLostConnectionListener:
 * - 'lost': Connection dropped — show persistent "Reconnecting..." toast
 * - 'restored': Connection recovered — dismiss previous toast, show "Reconnected"
 * - 'failed': Extended failure (after lostConnectionTimeout) — show persistent error
 *
 * Per user decision: "Subtle toast on disconnect/reconnect — 'Reconnecting...' then
 * 'Reconnected', non-blocking. On extended failure: persistent 'Connection lost' error."
 */
function ReconnectionListener() {
  const toastIdRef = useRef<string | number | null>(null);

  useLostConnectionListener((event) => {
    if (event === 'lost') {
      toastIdRef.current = toast('Reconnecting...', { duration: Infinity });
    } else if (event === 'restored') {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toast('Reconnected', { duration: 3000 });
      toastIdRef.current = null;
    } else if (event === 'failed') {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toast.error('Connection lost. Refresh to rejoin.', { duration: Infinity });
      toastIdRef.current = null;
    }
  });

  return null;
}

/**
 * MultiplayerRoomInner — rendered inside RoomProvider, reads the current
 * participant's color from Liveblocks presence and provides it via context.
 * Also renders PresenceBar (fixed overlay), JoinLeaveListener (renderless),
 * and ReconnectionListener (renderless).
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
      <PresenceBar />
      <JoinLeaveListener />
      <ReconnectionListener />
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
