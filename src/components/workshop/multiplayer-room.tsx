'use client';

import { createContext, useContext, useRef, useState } from 'react';
import { ClientContext, RoomProvider, useSelf, useOthersListener, useLostConnectionListener, useEventListener } from '@liveblocks/react';
import { LiveMap, LiveObject } from '@liveblocks/client';
import type { OpaqueClient } from '@liveblocks/core';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getRoomId, liveblocksClient, type CanvasElementStorable } from '@/lib/liveblocks/config';
import { PresenceBar } from './presence-bar';
import { CountdownTimer } from './countdown-timer';
import { SessionEndedOverlay } from './session-ended-overlay';

/**
 * MultiplayerContext — provides participant color, multiplayer flag, and
 * facilitator status to any component in the tree. Populated inside the
 * RoomProvider so that useSelf() is available.
 *
 * isFacilitator defaults to false — before the RoomProvider resolves,
 * participants won't see facilitator UI flash. The facilitator's UI
 * appears once useSelf() resolves.
 */
export const MultiplayerContext = createContext<{
  participantColor: string | null;
  isMultiplayer: boolean;
  isFacilitator: boolean;
}>({ participantColor: null, isMultiplayer: false, isFacilitator: false });

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
 * StepChangedListener — renderless component that listens for STEP_CHANGED
 * broadcast events from the facilitator and navigates participants to the
 * new step after a 1-second toast delay.
 *
 * Only processes events when the current user is a participant (not the
 * facilitator who originated the step change via their own navigation).
 * useEventListener does NOT fire for the sender's own broadcasts, but the
 * !isFacilitator guard is defense-in-depth against reconnection edge cases.
 */
function StepChangedListener({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { isFacilitator } = useMultiplayerContext();

  useEventListener(({ event }) => {
    if (event.type === 'STEP_CHANGED' && !isFacilitator) {
      toast(`Moving to Step ${event.stepOrder}: ${event.stepName}`, {
        duration: 3000,
      });
      // Delay navigation by 1 second so the toast is visible before page transition
      setTimeout(() => {
        router.push(`/workshop/${sessionId}/step/${event.stepOrder}`);
      }, 1000);
    }
  });

  return null;
}

/**
 * SessionEndedListener — renderless component that listens for SESSION_ENDED
 * and renders the full-screen overlay for participants.
 *
 * The facilitator never sees this — they redirect immediately after broadcasting.
 * Participants see the overlay and can click "Return to Dashboard".
 */
function SessionEndedListener({ sessionId, workshopId }: { sessionId: string; workshopId: string }) {
  const [sessionEnded, setSessionEnded] = useState(false);

  useEventListener(({ event }) => {
    if (event.type === 'SESSION_ENDED') {
      setSessionEnded(true);
    }
  });

  if (!sessionEnded) return null;
  return <SessionEndedOverlay sessionId={sessionId} />;
}

/**
 * MultiplayerRoomInner — rendered inside RoomProvider, reads the current
 * participant's color and role from Liveblocks presence and provides them
 * via context. Also renders PresenceBar (fixed overlay), JoinLeaveListener
 * (renderless), ReconnectionListener (renderless), StepChangedListener
 * (renderless), SessionEndedListener (renderless/overlay), and CountdownTimer.
 */
function MultiplayerRoomInner({ children, sessionId, workshopId }: { children: React.ReactNode; sessionId: string; workshopId: string }) {
  const self = useSelf();
  return (
    <MultiplayerContext.Provider
      value={{
        participantColor: self?.info?.color ?? null,
        isMultiplayer: true,
        isFacilitator: self?.info?.role === 'owner',
      }}
    >
      <PresenceBar />
      <JoinLeaveListener />
      <ReconnectionListener />
      <StepChangedListener sessionId={sessionId} />
      <SessionEndedListener sessionId={sessionId} workshopId={workshopId} />
      <CountdownTimer />
      {children}
    </MultiplayerContext.Provider>
  );
}

interface MultiplayerRoomProps {
  workshopId: string;
  sessionId: string;
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
export default function MultiplayerRoom({ workshopId, sessionId, children }: MultiplayerRoomProps) {
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
        <MultiplayerRoomInner sessionId={sessionId} workshopId={workshopId}>{children}</MultiplayerRoomInner>
      </RoomProvider>
    </ClientContext.Provider>
  );
}
