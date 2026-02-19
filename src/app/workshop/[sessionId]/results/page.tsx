import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, workshopSteps, stepArtifacts, buildPacks } from '@/db/schema';
import { ResultsContent } from './results-content';

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { sessionId } = await params;

  // Load session with workshop and steps
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      workshop: {
        with: {
          steps: true,
        },
      },
    },
  });

  if (!session) {
    redirect('/dashboard');
  }

  const workshopId = session.workshop.id;

  // Load Step 10 (validate) synthesis artifact
  let synthesisArtifact: Record<string, unknown> | null = null;
  const validateStep = session.workshop.steps.find((s) => s.stepId === 'validate');

  if (validateStep) {
    const artifactRows = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, validateStep.id))
      .limit(1);

    if (artifactRows.length > 0) {
      const { _canvas, ...extracted } = artifactRows[0].artifact as Record<string, unknown>;
      if (Object.keys(extracted).length > 0) {
        synthesisArtifact = extracted;
      }
    }
  }

  // Load prototype URL from build packs (JSON format, extract v0DemoUrl)
  let prototypeUrl: string | null = null;
  const buildPackRows = await db
    .select({ content: buildPacks.content })
    .from(buildPacks)
    .where(
      and(
        eq(buildPacks.workshopId, workshopId),
        eq(buildPacks.formatType, 'json'),
      )
    )
    .limit(1);

  if (buildPackRows.length > 0 && buildPackRows[0].content) {
    try {
      const parsed = JSON.parse(buildPackRows[0].content);
      if (parsed.v0DemoUrl) {
        prototypeUrl = parsed.v0DemoUrl + (parsed.v0DemoUrl.includes('?') ? '&f=1' : '?f=1');
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return (
    <ResultsContent
      sessionId={sessionId}
      workshopId={workshopId}
      synthesisArtifact={synthesisArtifact}
      prototypeUrl={prototypeUrl}
    />
  );
}
