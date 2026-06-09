/**
 * /join/[token] — Participant Join Page
 * React Server Component that validates the share token and routes the visitor
 * into the multiplayer workshop. All participants must be Clerk-authenticated.
 *
 * Flow:
 * 1. RSC validates shareToken against workshopSessions table.
 * 2. If invalid: renders an error card with link to home.
 * 3. If signed out: renders the passwordless sign-in gate, returning here after.
 * 4. If the signed-in user owns the session: redirect into the workshop.
 * 5. Otherwise: render GuestJoinFlow, which joins via /api/guest-join (identity
 *    derived from the Clerk account) and shows the lobby.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshopSessions, sessionParticipants, sessions, workshopSteps } from '@/db/schema';
import { ParticipantSignInGate } from '@/components/auth/participant-sign-in-gate';
import { Surface } from '@/components/ui/surface';
import { Heading, Text } from '@/components/ui/typography';
import { getStepById } from '@/lib/workshop/step-metadata';
import { GuestJoinFlow } from './guest-join-flow';

interface JoinPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ r?: string }>;
}

export default async function JoinPage({ params, searchParams }: JoinPageProps) {
  const { token } = await params;
  const { r: rejoinToken } = await searchParams;

  // Validate share token and fetch session + workshop metadata
  const workshopSession = await db.query.workshopSessions.findFirst({
    where: eq(workshopSessions.shareToken, token),
    with: {
      workshop: true,
    },
  });

  // Invalid or expired share link
  if (!workshopSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Surface className="w-full max-w-sm p-8 text-center">
          <Heading level={3} as="h1" className="mb-2 text-xl">Invalid Link</Heading>
          <Text variant="muted" className="mb-6">
            This workshop link is invalid or has expired. Please ask the facilitator
            to share a new link.
          </Text>
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

  // Fetch the owner/facilitator's display name for the join modal
  const ownerParticipant = await db.query.sessionParticipants.findFirst({
    where: and(
      eq(sessionParticipants.sessionId, workshopSession.id),
      eq(sessionParticipants.role, 'owner')
    ),
  });

  // Fetch the AI session for this workshop — used to construct the canvas URL
  const aiSession = await db.query.sessions.findFirst({
    where: eq(sessions.workshopId, workshopSession.workshopId),
  });

  // Find the currently active step to determine where to navigate
  const activeStep = await db.query.workshopSteps.findFirst({
    where: and(
      eq(workshopSteps.workshopId, workshopSession.workshopId),
      eq(workshopSteps.status, 'in_progress')
    ),
    with: {
      stepDefinition: true,
    },
  });

  const facilitatorName = ownerParticipant?.displayName ?? null;
  const workshopTitle = workshopSession.workshop.title;

  // Require authentication. Preserve any ?r= rejoin token through the sign-in
  // round-trip so the user lands back on this exact join URL.
  const { userId } = await auth();
  if (!userId) {
    const redirectUrl = rejoinToken
      ? `/join/${token}?r=${encodeURIComponent(rejoinToken)}`
      : `/join/${token}`;
    return <ParticipantSignInGate redirectUrl={redirectUrl} workshopTitle={workshopTitle} />;
  }

  // If this Clerk user owns the session, send them into the workshop instead of
  // creating a duplicate participant.
  if (ownerParticipant?.clerkUserId === userId) {
    const stepSlug = activeStep?.stepDefinition?.id ?? 'stakeholder-mapping';
    redirect(`/workshop/${aiSession?.id ?? workshopSession.workshopId}/step/${stepSlug}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <GuestJoinFlow
        token={token}
        workshopTitle={workshopTitle}
        facilitatorName={facilitatorName}
        sessionStatus={workshopSession.status}
        workshopId={workshopSession.workshopId}
        sessionId={workshopSession.id}
        aiSessionId={aiSession?.id ?? null}
        currentStepOrder={getStepById(activeStep?.stepDefinition?.id ?? 'stakeholder-mapping')?.order ?? 1}
      />
    </div>
  );
}
