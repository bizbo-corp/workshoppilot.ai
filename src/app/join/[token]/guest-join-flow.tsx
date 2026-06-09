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
import { useRouter } from 'next/navigation';
import { GuestLobby } from '@/components/guest/guest-lobby';
import { Surface } from '@/components/ui/surface';
import { Heading, Text } from '@/components/ui/typography';

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
  const router = useRouter();
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
      // Land everyone on the shared lobby for context. The lobby resolves the
      // (now-created) participant row and shows the adaptive begin/nudge CTA.
      // Falls back to the inline GuestLobby below if there's no AI session id.
      if (aiSessionId) {
        router.replace(`/workshop/${aiSessionId}/lobby`);
      }
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
        <Surface className="w-full max-w-sm p-8 text-center">
          <Heading level={3} className="mb-2">Unable to Join</Heading>
          <Text variant="muted" className="mb-6">{state.message}</Text>
          <button
            onClick={() => {
              startedRef.current = true;
              join();
            }}
            className="text-sm font-medium underline underline-offset-4"
          >
            Try again
          </button>
        </Surface>
      </div>
    );
  }

  const { data } = state;

  // Joined with an AI session → we've kicked off a redirect to the lobby; show
  // a brief transitional spinner so there's no flash of the old guest lobby.
  if (aiSessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Entering lobby...</p>
        </div>
      </div>
    );
  }

  // No AI session id — fall back to the legacy inline guest lobby.
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
