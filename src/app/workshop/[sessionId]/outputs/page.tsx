import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, buildPacks } from '@/db/schema';
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
    redirect('/dashboard');
  }

  const { workshop } = session;

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
      deliverables={deliverables}
    />
  );
}
