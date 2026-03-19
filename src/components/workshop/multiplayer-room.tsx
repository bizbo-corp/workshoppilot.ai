"use client";

import { createContext, useContext, useRef, useState } from "react";
import {
  ClientContext,
  RoomProvider,
  useSelf,
  useOthersListener,
  useLostConnectionListener,
  useEventListener,
} from "@liveblocks/react";
import { LiveMap, LiveObject } from "@liveblocks/client";
import type { OpaqueClient } from "@liveblocks/core";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getRoomId,
  liveblocksClient,
  type CanvasElementStorable,
} from "@/lib/liveblocks/config";

import { CountdownTimer } from "./countdown-timer";
import { SessionEndedOverlay } from "./session-ended-overlay";
import {
  useCanvasStore,
  useCanvasStoreApi,
} from "@/providers/canvas-store-provider";
import type { VotingResult } from "@/lib/canvas/voting-types";
import { computeVotingResults } from "@/lib/canvas/voting-utils";

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
  participantId: string | null;
  displayName: string | null;
}>({ participantColor: null, isMultiplayer: false, isFacilitator: false, participantId: null, displayName: null });

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
    if (type === "enter") {
      toast(`${user.info?.name ?? "Someone"} joined`, {
        duration: 3000,
      });
    } else if (type === "leave") {
      toast(`${user.info?.name ?? "Someone"} left`, {
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
    if (event === "lost") {
      toastIdRef.current = toast("Reconnecting...", { duration: Infinity });
    } else if (event === "restored") {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toast("Reconnected", { duration: 3000 });
      toastIdRef.current = null;
    } else if (event === "failed") {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toast.error("Connection lost. Refresh to rejoin.", {
        duration: Infinity,
      });
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
    if (event.type === "STEP_CHANGED" && !isFacilitator) {
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
function SessionEndedListener({
  sessionId,
  workshopId,
}: {
  sessionId: string;
  workshopId: string;
}) {
  const [sessionEnded, setSessionEnded] = useState(false);

  useEventListener(({ event }) => {
    if (event.type === "SESSION_ENDED") {
      setSessionEnded(true);
    }
  });

  if (!sessionEnded) return null;
  return <SessionEndedOverlay sessionId={sessionId} />;
}

/**
 * VotingEventListener — renderless component that listens for VOTING_OPENED
 * and VOTING_CLOSED broadcast events from the facilitator.
 *
 * Participants receive these events and update their local store + UI state.
 * The facilitator does NOT receive their own broadcasts (Liveblocks design),
 * so the facilitator's store is updated directly in FacilitatorControls.
 *
 * Uses storeApi.getState() for VOTING_CLOSED to read fresh dotVotes at
 * call time, avoiding stale closure (Pitfall 2 from RESEARCH.md).
 */
function VotingEventListener() {
  const openVoting = useCanvasStore((s) => s.openVoting);
  const closeVoting = useCanvasStore((s) => s.closeVoting);
  const setVotingResults = useCanvasStore((s) => s.setVotingResults);
  const storeApi = useCanvasStoreApi();

  useEventListener(({ event }) => {
    if (event.type === "VOTING_OPENED") {
      openVoting(event.voteBudget);
    }
    if (event.type === "VOTING_CLOSED") {
      // Read fresh state at call time — avoids stale closure (Pitfall 2)
      const { dotVotes, crazy8sSlots } = storeApi.getState();
      const results: VotingResult[] = computeVotingResults(
        dotVotes,
        crazy8sSlots,
      );
      closeVoting();
      setVotingResults(results);
    }
  });

  return null;
}

/**
 * ParticipantRemovedListener — renderless component that listens for
 * PARTICIPANT_REMOVED broadcast events. When the current user's participantId
 * matches, shows a toast and redirects to the home page.
 */
function ParticipantRemovedListener() {
  const router = useRouter();
  const { participantId } = useMultiplayerContext();
  const deleteOwnerContent = useCanvasStore((s) => s.deleteOwnerContent);

  useEventListener(({ event }) => {
    if (event.type !== 'PARTICIPANT_REMOVED') return;

    if (participantId && event.participantId === participantId) {
      // I was removed — redirect
      toast.error('You have been removed from this session', { duration: 5000 });
      setTimeout(() => { router.push('/'); }, 1500);
    } else {
      // Someone else was removed — purge their data from MY local store
      // so I don't sync stale data back to Liveblocks Storage
      deleteOwnerContent(event.participantId);
    }
  });

  return null;
}

/**
 * MultiplayerRoomInner — rendered inside RoomProvider, reads the current
 * participant's color and role from Liveblocks presence and provides them
 * via context. Also renders PresenceBar (fixed overlay), JoinLeaveListener
 * (renderless), ReconnectionListener (renderless), StepChangedListener
 * (renderless), SessionEndedListener (renderless/overlay), VotingEventListener
 * (renderless), ParticipantRemovedListener (renderless), and CountdownTimer.
 */
function MultiplayerRoomInner({
  children,
  sessionId,
  workshopId,
}: {
  children: React.ReactNode;
  sessionId: string;
  workshopId: string;
}) {
  const self = useSelf();
  return (
    <MultiplayerContext.Provider
      value={{
        participantColor: self?.info?.color ?? null,
        isMultiplayer: true,
        isFacilitator: self?.info?.role === "owner",
        participantId: self?.info?.participantId ?? null,
        displayName: self?.info?.name ?? null,
      }}
    >
      <JoinLeaveListener />
      <ReconnectionListener />
      <StepChangedListener sessionId={sessionId} />
      <SessionEndedListener sessionId={sessionId} workshopId={workshopId} />
      <VotingEventListener />
      <ParticipantRemovedListener />
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
export default function MultiplayerRoom({
  workshopId,
  sessionId,
  children,
}: MultiplayerRoomProps) {
  return (
    <ClientContext.Provider
      value={liveblocksClient as unknown as OpaqueClient}
    >
      <RoomProvider
        id={getRoomId(workshopId)}
        initialPresence={{
          cursor: null,
          color: "#608850",
          displayName: "",
          editingDrawingNodeId: null,
          mindMapReady: false,
          crazy8sReady: false,
        }}
        initialStorage={{
          elements: new LiveMap<string, LiveObject<CanvasElementStorable>>(),
        }}
      >
        <MultiplayerRoomInner sessionId={sessionId} workshopId={workshopId}>
          {children}
        </MultiplayerRoomInner>
      </RoomProvider>
    </ClientContext.Provider>
  );
}
