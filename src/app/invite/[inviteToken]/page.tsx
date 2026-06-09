/**
 * /invite/[inviteToken] — Workshop Invitation Landing
 *
 * Validates the invitation token, then routes the invitee in. The invite is
 * LOCKED to the email it was sent to: the user must be signed in as that exact
 * address. Signed out → passwordless sign-in gate. Signed in as a different
 * email → mismatch screen. Signed in as the invited email → auto-claim.
 */

import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  workshopInvitations,
  workshops,
  workshopSessions,
  sessions,
  sessionParticipants,
} from '@/db/schema';
import { getPrimaryEmail } from '@/lib/auth/participant-name';
import { ParticipantSignInGate } from '@/components/auth/participant-sign-in-gate';
import { Surface } from '@/components/ui/surface';
import { Heading, Text } from '@/components/ui/typography';
import { InviteClaimFlow } from './invite-claim-flow';
import { InviteEmailMismatch } from './invite-email-mismatch';

interface InvitePageProps {
  params: Promise<{ inviteToken: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { inviteToken } = await params;

  const invitation = await db.query.workshopInvitations.findFirst({
    where: eq(workshopInvitations.inviteToken, inviteToken),
  });

  if (!invitation) return <InviteErrorCard title="Invalid invitation" message="This invitation link doesn't exist. Ask the facilitator to resend it." />;
  if (invitation.status === 'revoked')
    return <InviteErrorCard title="Invitation revoked" message="The facilitator revoked this invitation. Ask them for a new one." />;
  if (invitation.status === 'expired')
    return <InviteErrorCard title="Invitation expired" message="This invitation has expired. Ask the facilitator to send a new one." />;

  const [workshop] = await db
    .select({
      id: workshops.id,
      title: workshops.title,
      clerkUserId: workshops.clerkUserId,
      facilitatorMode: workshops.facilitatorMode,
    })
    .from(workshops)
    .where(eq(workshops.id, invitation.workshopId))
    .limit(1);
  if (!workshop) return <InviteErrorCard title="Workshop not found" message="The workshop attached to this invitation no longer exists." />;

  const [wSession] = await db
    .select({ id: workshopSessions.id, status: workshopSessions.status })
    .from(workshopSessions)
    .where(eq(workshopSessions.workshopId, workshop.id))
    .limit(1);
  if (!wSession) return <InviteErrorCard title="Workshop not ready" message="This workshop isn't ready for participants yet." />;
  if (wSession.status === 'ended')
    return <InviteErrorCard title="Workshop ended" message="This workshop has ended. The facilitator can share the outputs with you directly." />;

  const [urlSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.workshopId, workshop.id))
    .limit(1);
  if (!urlSession) return <InviteErrorCard title="Workshop not initialised" message="Try the link again in a moment." />;

  // Fetch the owner/facilitator's display name for the invite card
  const ownerParticipant = await db.query.sessionParticipants.findFirst({
    where: eq(sessionParticipants.sessionId, wSession.id),
    // role='owner' — checked client-side, the table contains both roles
  });
  const facilitatorName =
    ownerParticipant?.role === 'owner' ? ownerParticipant.displayName : null;

  const invitedEmail = invitation.email.toLowerCase();
  const inviteUrl = `/invite/${inviteToken}`;

  // Require authentication, returning here afterwards.
  const { userId } = await auth();
  if (!userId) {
    return (
      <ParticipantSignInGate
        redirectUrl={inviteUrl}
        workshopTitle={workshop.title}
        subtitle={`You've been invited as ${invitation.email}. Sign in with that email to join.`}
      />
    );
  }

  // Email lock: the signed-in account's verified primary email must match the
  // address the invite was sent to.
  const user = await currentUser();
  const signedInEmail = getPrimaryEmail(user);
  if (!signedInEmail || signedInEmail !== invitedEmail) {
    return (
      <InviteEmailMismatch
        invitedEmail={invitation.email}
        signedInEmail={signedInEmail ?? 'an unknown address'}
        inviteUrl={inviteUrl}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <InviteClaimFlow
        inviteToken={inviteToken}
        workshopTitle={workshop.title}
        facilitatorName={facilitatorName}
        urlSessionId={urlSession.id}
      />
    </div>
  );
}

function InviteErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Surface className="w-full max-w-sm p-8 text-center">
        <Heading level={3} as="h1" className="mb-2 text-xl">{title}</Heading>
        <Text variant="muted" className="mb-6">{message}</Text>
        <Link
          href="/"
          className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
        >
          Go to Home
        </Link>
      </Surface>
    </div>
  );
}
