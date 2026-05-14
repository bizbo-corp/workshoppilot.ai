/**
 * /invite/[inviteToken] — Workshop Invitation Landing
 *
 * Validates the invitation token, then routes the invitee to challenge-review.
 * If the user is already a session participant (Clerk userId match or valid cookie),
 * the invitation is auto-claimed via /api/invite-claim and the user is redirected.
 * Otherwise the InviteClaimFlow client component captures a display name and POSTs.
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
import { InviteClaimFlow } from './invite-claim-flow';

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

  // Auto-claim path for signed-in Clerk users
  const { userId } = await auth();
  let clerkDisplayName: string | null = null;
  if (userId) {
    const user = await currentUser();
    const raw = user?.fullName ?? user?.username ?? '';
    const trimmed = raw.trim().slice(0, 30);
    if (trimmed.length >= 2) clerkDisplayName = trimmed;
  }

  return (
    <div className="min-h-screen bg-background">
      <InviteClaimFlow
        inviteToken={inviteToken}
        workshopTitle={workshop.title}
        facilitatorName={facilitatorName}
        urlSessionId={urlSession.id}
        clerkDisplayName={clerkDisplayName}
      />
    </div>
  );
}

function InviteErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">{title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{message}</p>
        <Link
          href="/"
          className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
