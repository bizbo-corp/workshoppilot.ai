'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface InviteClaimFlowProps {
  inviteToken: string;
  workshopTitle: string;
  facilitatorName: string | null;
  urlSessionId: string;
  clerkDisplayName: string | null;
}

type ClaimState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

export function InviteClaimFlow({
  inviteToken,
  workshopTitle,
  facilitatorName,
  urlSessionId,
  clerkDisplayName,
}: InviteClaimFlowProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(clerkDisplayName ?? '');
  const [state, setState] = useState<ClaimState>({ kind: 'idle' });

  // If the user is signed in with Clerk, auto-submit using their name
  useEffect(() => {
    if (clerkDisplayName && state.kind === 'idle') {
      void submit(clerkDisplayName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(displayName: string) {
    setState({ kind: 'submitting' });
    try {
      const res = await fetch('/api/invite-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken, displayName }),
      });
      const data = await res.json();
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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setState({ kind: 'error', message: 'Display name must be between 2 and 30 characters' });
      return;
    }
    void submit(trimmed);
  }

  const submitting = state.kind === 'submitting';

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <p className="mb-2 text-sm text-muted-foreground">
          {facilitatorName ?? 'Your facilitator'} invited you to
        </p>
        <h1 className="mb-2 text-2xl font-semibold">{workshopTitle}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          You&apos;ll review the workshop challenge first, then jump into Stakeholder Mapping.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-name" className="mb-1 block text-sm font-medium">
              Your name
            </label>
            <input
              id="invite-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={30}
              required
              placeholder="What should we call you?"
              disabled={submitting}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {state.kind === 'error' && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Joining…' : 'Review challenge'}
          </button>
        </form>
      </div>
    </div>
  );
}
