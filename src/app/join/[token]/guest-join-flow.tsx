'use client';

/**
 * GuestJoinFlow — Client Component
 * Manages the guest join experience after server-side token validation.
 *
 * State machine:
 *   initial → (check sessionStorage) → showing_modal | auto_rejoining | joined
 *   showing_modal → (submit name) → joined
 *   auto_rejoining → (re-post name) → joined | showing_modal (on error)
 *
 * sessionStorage key: 'wp_guest_name'
 * Value: JSON { name: string, workshopId: string }
 *
 * Design decisions:
 * - sessionStorage (not localStorage) scopes persistence to the browser tab.
 *   Closing the tab clears identity, matching session expectations.
 * - Auto-rejoin re-calls /api/guest-join rather than trusting the cookie alone —
 *   the cookie may have expired. The API reuses the existing participant record
 *   when the cookie is still valid for the same workshop.
 * - GuestLobby renders after joining, polling /api/session-status/[token] every 3s
 *   and auto-transitioning to the canvas when the facilitator starts the session.
 */

import { useEffect, useState } from 'react';
import { GuestJoinModal, type GuestJoinResponse } from '@/components/guest/guest-join-modal';
import { GuestLobby } from '@/components/guest/guest-lobby';

const SESSION_STORAGE_KEY = 'wp_guest_name';

type StoredGuestName = {
  name: string;
  workshopId: string;
  rejoinToken?: string;
};

interface GuestJoinFlowProps {
  token: string;
  workshopTitle: string;
  facilitatorName: string | null;
  sessionStatus: 'waiting' | 'active' | 'ended';
  workshopId: string;
  sessionId: string;
  aiSessionId: string | null;
  currentStepOrder: number;
  clerkDisplayName: string | null;
  rejoinToken?: string;
}

type FlowState =
  | { stage: 'loading' }
  | { stage: 'modal' }
  | { stage: 'auto_rejoining' }
  | { stage: 'joined'; guestData: GuestJoinResponse }
  | { stage: 'error'; message: string };

export function GuestJoinFlow({
  token,
  workshopTitle,
  facilitatorName,
  sessionStatus,
  workshopId,
  aiSessionId,
  currentStepOrder,
  clerkDisplayName,
  rejoinToken: rejoinTokenProp,
}: GuestJoinFlowProps) {
  const [state, setState] = useState<FlowState>({ stage: 'loading' });

  useEffect(() => {
    // Priority 1: Clerk user detected server-side — auto-join with Clerk name
    if (clerkDisplayName) {
      setState({ stage: 'auto_rejoining' });
      autoRejoin(clerkDisplayName, rejoinTokenProp);
      return;
    }

    // Priority 2: Rejoin token from URL — auto-join without name (use placeholder)
    if (rejoinTokenProp) {
      // Check sessionStorage for a stored name to use with the rejoin token
      let storedName: string | undefined;
      try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as StoredGuestName;
          if (parsed.workshopId === workshopId && parsed.name) {
            storedName = parsed.name;
          }
        }
      } catch { /* ignore */ }

      if (storedName) {
        setState({ stage: 'auto_rejoining' });
        autoRejoin(storedName, rejoinTokenProp);
        return;
      }
      // No stored name but have rejoin token — show modal so they can enter name
      // (the rejoinToken will be passed to the modal for the API call)
    }

    // Priority 3: Check sessionStorage for returning guest
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredGuestName;
        if (parsed.workshopId === workshopId && parsed.name) {
          setState({ stage: 'auto_rejoining' });
          autoRejoin(parsed.name, parsed.rejoinToken);
          return;
        }
      }
    } catch {
      // sessionStorage unavailable or parse failed — fall through to modal
    }

    setState({ stage: 'modal' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoRejoin = async (name: string, rToken?: string) => {
    try {
      const response = await fetch('/api/guest-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: token,
          displayName: name,
          ...(rToken ? { rejoinToken: rToken } : {}),
        }),
      });

      if (!response.ok) {
        // Cookie or session may have expired — show modal to re-enter name
        setState({ stage: 'modal' });
        return;
      }

      const data = await response.json();

      // Name-match detected — fall through to modal so user can confirm
      if (data.nameMatch) {
        setState({ stage: 'modal' });
        return;
      }

      handleJoined(data as GuestJoinResponse);
    } catch {
      setState({ stage: 'modal' });
    }
  };

  const handleJoined = (data: GuestJoinResponse) => {
    // Persist guest name + rejoin token for page-refresh recovery
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          name: data.displayName,
          workshopId: data.workshopId,
          rejoinToken: data.rejoinToken,
        })
      );
    } catch {
      // sessionStorage unavailable — continue without persistence
    }

    // Update URL to include rejoin token (no navigation, just updates URL bar)
    if (data.rejoinToken) {
      const url = new URL(window.location.href);
      url.searchParams.set('r', data.rejoinToken);
      history.replaceState(null, '', url.toString());
    }

    setState({ stage: 'joined', guestData: data });
  };

  if (state.stage === 'loading' || state.stage === 'auto_rejoining') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Joining workshop...</p>
        </div>
      </div>
    );
  }

  if (state.stage === 'modal') {
    return (
      <GuestJoinModal
        shareToken={token}
        workshopTitle={workshopTitle}
        facilitatorName={facilitatorName}
        rejoinToken={rejoinTokenProp}
        onJoined={handleJoined}
      />
    );
  }

  if (state.stage === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Unable to Join</h2>
          <p className="mb-6 text-sm text-muted-foreground">{state.message}</p>
          <button
            onClick={() => setState({ stage: 'modal' })}
            className="text-sm font-medium underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // stage === 'joined' — render GuestLobby with real-time polling and auto-transition
  const { guestData } = state;

  return (
    <GuestLobby
      token={token}
      workshopTitle={workshopTitle}
      sessionStatus={sessionStatus}
      aiSessionId={aiSessionId}
      currentStepOrder={currentStepOrder}
      participantId={guestData.participantId}
      displayName={guestData.displayName}
      color={guestData.color}
    />
  );
}
