import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq, and, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, buildPacks, stepArtifacts, workshopSteps } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { JourneyFlowContent } from './journey-flow-content';
import type { JourneyFlowState } from '@/lib/journey-flow/types';
import type { ScopeChooserConcept } from '@/components/journey-flow/scope-chooser';

interface JourneyFlowPageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function JourneyFlowPage({ params, searchParams }: JourneyFlowPageProps) {
  const { sessionId } = await params;
  const { from } = await searchParams;

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

  // Load Step 9 concept artifact — normalize to { name, elevatorPitch }[]
  let concepts: ScopeChooserConcept[] = [];
  try {
    const conceptRows = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
      .where(and(eq(workshopSteps.workshopId, workshop.id), eq(workshopSteps.stepId, 'concept')))
      .limit(1);

    if (conceptRows.length > 0) {
      const artifact = conceptRows[0].artifact as Record<string, unknown>;
      // Research Pattern 5 — prefer concepts[], fall back to _canvas.conceptCards[], then cards[]
      const rawList: unknown[] =
        Array.isArray(artifact.concepts)
          ? (artifact.concepts as unknown[])
          : Array.isArray((artifact._canvas as Record<string, unknown> | undefined)?.conceptCards)
            ? ((artifact._canvas as Record<string, unknown>).conceptCards as unknown[])
            : Array.isArray(artifact.cards)
              ? (artifact.cards as unknown[])
              : [];

      concepts = rawList
        .map((item) => {
          const c = item as Record<string, unknown>;
          const name = String(c.conceptName ?? c.name ?? c.title ?? c.ideaSource ?? '').trim();
          const elevatorPitch = String(
            c.elevatorPitch ?? c.pitch ?? c.description ?? ''
          ).trim() || undefined;
          return { name, elevatorPitch };
        })
        .filter((c) => c.name.length > 0);
    }
  } catch {
    // Artifact shapes vary — default to empty list on any failure
    concepts = [];
  }

  return (
    <JourneyFlowContent
      sessionId={sessionId}
      workshopId={workshop.id}
      savedState={savedState}
      concepts={concepts}
      isReadOnly={isReadOnly}
      from={from}
    />
  );
}
