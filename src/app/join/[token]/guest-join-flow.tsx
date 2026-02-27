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
 *   the cookie may have expired, and re-calling creates a fresh participant record.
 * - Lobby placeholder is intentionally minimal — Plan 02 adds Liveblocks real-time
 *   presence and step progression UI.
 * - Error states provide a retry button rather than hard-failing, since network
 *   flakiness is common on mobile.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GuestJoinModal, type GuestJoinResponse } from '@/components/guest/guest-join-modal';

const SESSION_STORAGE_KEY = 'wp_guest_name';

type StoredGuestName = {
  name: string;
  workshopId: string;
};

interface GuestJoinFlowProps {
  token: string;
  workshopTitle: string;
  facilitatorName: string | null;
  sessionStatus: 'waiting' | 'active' | 'ended';
  workshopId: string;
  sessionId: string;
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
}: GuestJoinFlowProps) {
  const [state, setState] = useState<FlowState>({ stage: 'loading' });

  useEffect(() => {
    // Check sessionStorage for returning guest
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredGuestName;
        if (parsed.workshopId === workshopId && parsed.name) {
          // Auto-rejoin with the stored name
          setState({ stage: 'auto_rejoining' });
          autoRejoin(parsed.name);
          return;
        }
      }
    } catch {
      // sessionStorage unavailable or parse failed — fall through to modal
    }

    setState({ stage: 'modal' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoRejoin = async (name: string) => {
    try {
      const response = await fetch('/api/guest-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken: token, displayName: name }),
      });

      if (!response.ok) {
        // Cookie or session may have expired — show modal to re-enter name
        setState({ stage: 'modal' });
        return;
      }

      const data = await response.json() as GuestJoinResponse;
      handleJoined(data);
    } catch {
      setState({ stage: 'modal' });
    }
  };

  const handleJoined = (data: GuestJoinResponse) => {
    // Persist guest name for page-refresh recovery
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ name: data.displayName, workshopId: data.workshopId })
      );
    } catch {
      // sessionStorage unavailable — continue without persistence
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

  // stage === 'joined'
  const { guestData } = state;

  if (sessionStatus === 'ended') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Workshop Ended</h2>
          <p className="text-sm text-muted-foreground">
            This workshop session has ended. Thanks for participating, {guestData.displayName}!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
        <div
          className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold"
          style={{ backgroundColor: guestData.color }}
        >
          {guestData.displayName.charAt(0).toUpperCase()}
        </div>
        <h2 className="mb-1 text-lg font-semibold">You&apos;re in!</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Welcome, {guestData.displayName}
        </p>
        <p className="text-sm text-muted-foreground">
          {sessionStatus === 'waiting'
            ? 'Waiting for the facilitator to start the workshop...'
            : 'The workshop is in progress. Hang tight while the page loads.'}
        </p>
      </div>
    </div>
  );
}
