import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, buildPacks, stepArtifacts, workshopSteps } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { generateValidateSynthesis } from '@/lib/validation/generate-synthesis';
import { updateValidateArtifact } from '@/lib/validation/save-validation';
import { OutputsContent } from './outputs-content';

interface OutputsPageProps {
  params: Promise<{ sessionId: string }>;
}

interface DeliverableFormat {
  id: string;
  formatType: 'markdown' | 'json' | 'pdf';
  content: string | null;
}

interface Deliverable {
  type: string;
  title: string;
  formats: DeliverableFormat[];
}

function getDeliverableType(title: string): string {
  if (title.startsWith('PRD:')) return 'prd';
  if (title.startsWith('Tech Specs:')) return 'tech-specs';
  if (title.startsWith('Journey Map:')) return 'journey-map';
  if (title.startsWith('Feature Prioritization:')) return 'feature-prioritization';
  if (title.startsWith('Presentation:')) return 'stakeholder-ppt';
  if (title.startsWith('Validation Plan')) return 'validation-plan';
  return 'other';
}

export default async function OutputsPage({ params }: OutputsPageProps) {
  const { sessionId } = await params;

  // Load session with workshop
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      workshop: true,
    },
  });

  if (!session) {
    redirect('/');
  }

  const { workshop } = session;

  // Auth: the owner gets full access; a participant of this workshop views
  // read-only. Everyone else (signed out, or signed in but not a member) is
  // sent home.
  const { userId } = await auth();
  if (!userId) {
    redirect('/');
  }

  let isReadOnly = false;
  if (workshop.clerkUserId !== userId) {
    const participant = await resolveClerkParticipant(workshop.id);
    if (!participant) {
      redirect('/');
    }
    isReadOnly = true;
  }

  // Admin override (mirrors the workshop layout) so configured admins keep
  // settings access on the build page.
  const adminEmail = process.env.ADMIN_EMAIL;
  let isAdmin = false;
  if (adminEmail) {
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    isAdmin = !!userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase();
  }

  // Load build_packs for this workshop
  const rows = await db
    .select()
    .from(buildPacks)
    .where(eq(buildPacks.workshopId, workshop.id))
    .orderBy(buildPacks.createdAt);

  // Group rows into deliverables by type (PRD: / Tech Specs: title prefix)
  const groupMap = new Map<string, Deliverable>();

  for (const row of rows) {
    const type = getDeliverableType(row.title);

    if (!groupMap.has(type)) {
      groupMap.set(type, {
        type,
        title: row.title,
        formats: [],
      });
    }

    const group = groupMap.get(type)!;
    group.formats.push({
      id: row.id,
      formatType: row.formatType,
      content: row.content ?? null,
    });
  }

  const deliverables = Array.from(groupMap.values());

  // Workshop summary (the synthesis) — shown as a collapsible tile at the top of the Build Pack.
  // Loaded from the validate artifact; self-healed (generated from step summaries + persisted)
  // if it was never produced, so the summary is always available here.
  let synthesis: Record<string, unknown> | null = null;
  const validateStepRow = await db
    .select({ id: workshopSteps.id, status: workshopSteps.status })
    .from(workshopSteps)
    .where(and(eq(workshopSteps.workshopId, workshop.id), eq(workshopSteps.stepId, 'validate')))
    .limit(1);

  // Reaching the Build Pack means the Validation Plan is considered done — mark it complete so it
  // shows checked in the sidebar. The plan itself stays editable on the Validate step (you can
  // still record results later); this only flips the navigation/completion status.
  if (validateStepRow.length > 0 && !isReadOnly && validateStepRow[0].status !== 'complete') {
    await db
      .update(workshopSteps)
      .set({ status: 'complete' })
      .where(eq(workshopSteps.id, validateStepRow[0].id));
  }

  if (validateStepRow.length > 0) {
    const artRows = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, validateStepRow[0].id))
      .limit(1);
    if (artRows.length > 0) {
      const { _canvas, ...extracted } = artRows[0].artifact as Record<string, unknown>;
      if (Object.keys(extracted).length > 0) synthesis = extracted;
    }
  }

  const hasSynthesis =
    !!synthesis &&
    (typeof synthesis.narrativeIntro === 'string' ||
      (Array.isArray(synthesis.stepSummaries) && synthesis.stepSummaries.length > 0));

  if (!hasSynthesis && !isReadOnly) {
    try {
      const gen = await generateValidateSynthesis(workshop.id);
      if (gen) {
        await updateValidateArtifact(workshop.id, (current) => ({ ...current, ...gen.synthesis }));
        synthesis = { ...(synthesis ?? {}), ...gen.synthesis };
      }
    } catch (err) {
      console.error('[outputs] synthesis generation failed:', err);
    }
  }

  return (
    <OutputsContent
      sessionId={sessionId}
      workshopId={workshop.id}
      workshopTitle={workshop.title}
      workshopColor={workshop.color}
      workshopEmoji={workshop.emoji}
      workshopType={workshop.workshopType ?? 'solo'}
      isWorkshopOwner={!isReadOnly}
      isAdmin={isAdmin}
      deliverables={deliverables}
      isReadOnly={isReadOnly}
      synthesis={synthesis}
    />
  );
}
