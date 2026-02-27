/**
 * /join/[token] — Guest Join Page
 * React Server Component that validates the share token and renders the
 * guest join flow for multiplayer workshop participants.
 *
 * Flow:
 * 1. RSC validates shareToken against workshopSessions table
 * 2. If invalid: renders an error card with link to home
 * 3. If valid: renders GuestJoinFlow client component with session metadata
 *
 * Design decisions:
 * - Server-side token validation prevents leaking workshop details to invalid links.
 * - GuestJoinFlow checks sessionStorage on mount for returning guests (avoids
 *   re-showing the modal on page refresh within the same browser session).
 * - The AI session ID and current step order are fetched server-side so GuestLobby
 *   can navigate directly to the canvas URL without an extra client-side lookup.
 */

import Link from 'next/link';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshopSessions, sessionParticipants, workshops, sessions, workshopSteps } from '@/db/schema';
import { GuestJoinFlow } from './guest-join-flow';

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;

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
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
          <h1 className="mb-2 text-xl font-semibold">Invalid Link</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            This workshop link is invalid or has expired. Please ask the facilitator
            to share a new link.
          </p>
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
        currentStepOrder={activeStep?.stepDefinition?.order ?? 1}
      />
    </div>
  );
}
