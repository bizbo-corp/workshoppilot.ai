import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, buildPacks } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
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
    />
  );
}
