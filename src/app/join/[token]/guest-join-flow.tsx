'use client';

/**
 * GuestJoinFlow — Client Component
 * Runs after the join page has confirmed a signed-in Clerk user. Joins the
 * workshop via /api/guest-join (identity derived server-side from the Clerk
 * account — no name entry, no name-match) and renders the lobby.
 *
 * State machine: joining → joined | error
 */

import { useEffect, useRef, useState } from 'react';
import { GuestLobby } from '@/components/guest/guest-lobby';

interface JoinResponse {
  ok: boolean;
  participantId: string;
  workshopId: string;
  sessionId: string;
  displayName: string;
  color: string;
}

interface GuestJoinFlowProps {
  token: string;
  workshopTitle: string;
  facilitatorName: string | null;
  sessionStatus: 'waiting' | 'active' | 'ended';
  workshopId: string;
  sessionId: string;
  aiSessionId: string | null;
  currentStepOrder: number;
}

type FlowState =
  | { stage: 'joining' }
  | { stage: 'joined'; data: JoinResponse }
  | { stage: 'error'; message: string };

export function GuestJoinFlow({
  token,
  workshopTitle,
  sessionStatus,
  aiSessionId,
  currentStepOrder,
}: GuestJoinFlowProps) {
  const [state, setState] = useState<FlowState>({ stage: 'joining' });
  const startedRef = useRef(false);

  const join = async () => {
    setState({ stage: 'joining' });
    try {
      const response = await fetch('/api/guest-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken: token }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setState({
          stage: 'error',
          message: data?.error ?? 'We couldn’t add you to this workshop. Please try again.',
        });
        return;
      }
      const data = (await response.json()) as JoinResponse;
      setState({ stage: 'joined', data });
    } catch {
      setState({ stage: 'error', message: 'Network error. Please try again.' });
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.stage === 'joining') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Joining workshop...</p>
        </div>
      </div>
    );
  }

  if (state.stage === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Unable to Join</h2>
          <p className="mb-6 text-sm text-muted-foreground">{state.message}</p>
          <button
            onClick={() => {
              startedRef.current = true;
              join();
            }}
            className="text-sm font-medium underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { data } = state;
  return (
    <GuestLobby
      token={token}
      workshopTitle={workshopTitle}
      sessionStatus={sessionStatus}
      aiSessionId={aiSessionId}
      currentStepOrder={currentStepOrder}
      participantId={data.participantId}
      displayName={data.displayName}
      color={data.color}
    />
  );
}
