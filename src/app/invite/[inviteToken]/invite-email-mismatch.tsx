'use client';

import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Heading, Text } from '@/components/ui/typography';

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
      <Surface className="w-full max-w-md p-8 text-center">
        <Heading level={3} as="h1" className="mb-2 text-xl">Wrong account</Heading>
        <Text variant="muted" className="mb-1">
          This invite was sent to <span className="font-medium text-foreground">{invitedEmail}</span>,
          but you&apos;re signed in as <span className="font-medium text-foreground">{signedInEmail}</span>.
        </Text>
        <Text variant="muted" className="mb-6">
          Sign out and sign back in with <span className="font-medium text-foreground">{invitedEmail}</span> to join.
        </Text>
        <SignOutButton redirectUrl={inviteUrl}>
          <Button variant="primary" className="w-full">Sign out and switch account</Button>
        </SignOutButton>
      </Surface>
    </div>
  );
}
