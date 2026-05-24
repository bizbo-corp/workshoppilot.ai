'use client';

import { SignOutButton } from '@clerk/nextjs';

interface InviteEmailMismatchProps {
  invitedEmail: string;
  signedInEmail: string;
  /** Return here after signing out so they can retry with the right account. */
  inviteUrl: string;
}

/**
 * Shown when a signed-in user opens an invite addressed to a different email.
 * The invite is locked to its address, so we don't claim — we explain the
 * mismatch and offer a one-click sign-out to retry with the right account.
 */
export function InviteEmailMismatch({
  invitedEmail,
  signedInEmail,
  inviteUrl,
}: InviteEmailMismatchProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Wrong account</h1>
        <p className="mb-1 text-sm text-muted-foreground">
          This invite was sent to <span className="font-medium text-foreground">{invitedEmail}</span>,
          but you&apos;re signed in as <span className="font-medium text-foreground">{signedInEmail}</span>.
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          Sign out and sign back in with <span className="font-medium text-foreground">{invitedEmail}</span> to join.
        </p>
        <SignOutButton redirectUrl={inviteUrl}>
          <button className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90">
            Sign out and switch account
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
