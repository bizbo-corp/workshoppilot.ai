'use client';

/**
 * InviteClaimFlow — runs after the invite page confirms the user is signed in
 * as the invited email. Claims the invitation via /api/invite-claim (identity
 * derived server-side from the Clerk account) and redirects into the lobby.
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface InviteClaimFlowProps {
  inviteToken: string;
  workshopTitle: string;
  facilitatorName: string | null;
  urlSessionId: string;
}

type ClaimState =
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

export function InviteClaimFlow({
  inviteToken,
  workshopTitle,
  facilitatorName,
  urlSessionId,
}: InviteClaimFlowProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<ClaimState>({ kind: 'submitting' });
  const startedRef = useRef(false);

  async function submit() {
    setState({ kind: 'submitting' });
    try {
      const res = await fetch('/api/invite-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setState({ kind: 'error', message: data.error ?? 'Could not accept invitation' });
        return;
      }
      startTransition(() => {
        router.push(`/workshop/${data.urlSessionId ?? urlSessionId}/lobby`);
      });
    } catch {
      setState({ kind: 'error', message: 'Network error — please try again' });
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="mb-2 text-sm text-muted-foreground">
          {facilitatorName ?? 'Your facilitator'} invited you to
        </p>
        <h1 className="mb-4 text-2xl font-semibold">{workshopTitle}</h1>

        {state.kind === 'submitting' ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <p className="text-sm">Joining…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{state.message}</p>
            <button
              onClick={() => {
                startedRef.current = true;
                void submit();
              }}
              className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
