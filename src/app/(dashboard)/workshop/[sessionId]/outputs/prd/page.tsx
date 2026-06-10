import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq, and, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, buildPacks } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { PrdContent } from './prd-content';

interface PrdPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function PrdPage({ params }: PrdPageProps) {
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

  // Load saved PRD
  const prdRows = await db
    .select()
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'PRD:%')));

  const savedFormats = prdRows
    .filter((r) => r.content)
    .map((r) => ({
      id: r.id,
      formatType: r.formatType as 'markdown' | 'json' | 'pdf',
      content: r.content,
    }));

  // Check if feature prioritization exists
  const fpRows = await db
    .select({ id: buildPacks.id })
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Feature Prioritization:%')))
    .limit(1);
  const hasFeaturePrioritization = fpRows.length > 0;

  // Check if tech specs exist
  const tsRows = await db
    .select({ id: buildPacks.id })
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Tech Specs:%')))
    .limit(1);
  const hasTechSpecs = tsRows.length > 0;

  return (
    <PrdContent
      sessionId={sessionId}
      workshopId={workshop.id}
      savedFormats={savedFormats.length > 0 ? savedFormats : null}
      hasFeaturePrioritization={hasFeaturePrioritization}
      hasTechSpecs={hasTechSpecs}
      isReadOnly={isReadOnly}
    />
  );
}
