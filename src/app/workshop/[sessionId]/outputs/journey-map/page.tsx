import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq, and, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, buildPacks, stepArtifacts, workshopSteps } from '@/db/schema';
import { COOKIE_NAME, verifyGuestCookie } from '@/lib/auth/guest-cookie';
import { JourneyMapContent } from './journey-map-content';
import type { JourneyMapperState } from '@/lib/journey-mapper/types';

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
  let isReadOnly = false;

  if (!userId) {
    const cookieStore = await cookies();
    const guestToken = cookieStore.get(COOKIE_NAME)?.value;
    if (!guestToken) redirect('/');
    const payload = verifyGuestCookie(guestToken);
    if (!payload || payload.workshopId !== workshop.id) redirect('/');
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
      savedState = JSON.parse(jsonRow.content!) as JourneyMapperState;
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
