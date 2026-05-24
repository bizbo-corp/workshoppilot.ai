import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq, and, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, buildPacks, stepArtifacts, workshopSteps } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { JourneyMapContent } from './journey-map-content';
import type { JourneyMapperState } from '@/lib/journey-mapper/types';
import { isLegacyState, migrateToViewState } from '@/lib/journey-mapper/migrate-state';

interface JourneyMapPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function JourneyMapPage({ params }: JourneyMapPageProps) {
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

  // Load saved journey map
  const rows = await db
    .select()
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Journey Map:%')));

  const jsonRow = rows.find((r) => r.formatType === 'json' && r.content);
  let savedState: JourneyMapperState | null = null;

  if (jsonRow) {
    try {
      const parsed = JSON.parse(jsonRow.content!);
      savedState = isLegacyState(parsed)
        ? migrateToViewState(parsed as JourneyMapperState)
        : (parsed as JourneyMapperState);
    } catch {
      // Invalid JSON, treat as no saved state
    }
  }

  // Check if Step 9 is complete (needed for generation)
  const step9Artifact = await db
    .select({ artifact: stepArtifacts.artifact })
    .from(stepArtifacts)
    .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
    .where(
      and(
        eq(workshopSteps.workshopId, workshop.id),
        eq(workshopSteps.stepId, 'concept')
      )
    )
    .limit(1);

  const hasStep9 = step9Artifact.length > 0;

  return (
    <JourneyMapContent
      sessionId={sessionId}
      workshopId={workshop.id}
      savedState={savedState}
      hasStep9={hasStep9}
      isReadOnly={isReadOnly}
    />
  );
}
