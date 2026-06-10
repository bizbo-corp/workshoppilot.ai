import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq, and, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, buildPacks } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { JourneyFlowContent } from './journey-flow-content';
import type { JourneyFlowState } from '@/lib/journey-flow/types';

interface JourneyFlowPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function JourneyFlowPage({ params }: JourneyFlowPageProps) {
  const { sessionId } = await params;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { workshop: true },
  });

  if (!session) redirect('/');

  const { workshop } = session;

  // Auth check
  const { userId } = await auth();
  if (!userId) redirect('/');

  // Owner gets full access; a participant of this workshop views read-only.
  let isReadOnly = false;
  if (workshop.clerkUserId !== userId) {
    const participant = await resolveClerkParticipant(workshop.id);
    if (!participant) redirect('/');
    isReadOnly = true;
  }

  // Load saved journey flow — ONLY rows with the 'Journey Flow:' title prefix
  const rows = await db
    .select()
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Journey Flow:%')));

  const jsonRow = rows.find((r) => r.formatType === 'json' && r.content);
  let savedState: Partial<JourneyFlowState> | null = null;

  if (jsonRow) {
    try {
      savedState = JSON.parse(jsonRow.content!) as Partial<JourneyFlowState>;
    } catch {
      // Invalid JSON — treat as no saved state
    }
  }

  return (
    <JourneyFlowContent
      sessionId={sessionId}
      workshopId={workshop.id}
      savedState={savedState}
      isReadOnly={isReadOnly}
    />
  );
}
