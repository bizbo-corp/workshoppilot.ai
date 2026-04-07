import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq, and, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, buildPacks } from '@/db/schema';
import { COOKIE_NAME, verifyGuestCookie } from '@/lib/auth/guest-cookie';
import { TechSpecsContent } from './tech-specs-content';
import type { TechSpecsPreferences } from '@/lib/tech-specs-wizard/types';

interface TechSpecsPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function TechSpecsPage({ params }: TechSpecsPageProps) {
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

  // Load saved tech specs preferences
  const prefRows = await db
    .select()
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Tech Specs Preferences:%')));

  const prefRow = prefRows.find((r) => r.formatType === 'json' && r.content);
  let savedPreferences: TechSpecsPreferences | null = null;

  if (prefRow) {
    try {
      savedPreferences = JSON.parse(prefRow.content!) as TechSpecsPreferences;
    } catch {
      // Invalid JSON, treat as no saved preferences
    }
  }

  // Load saved tech specs results
  const specRows = await db
    .select()
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Tech Specs:%')));

  const savedSpecs = specRows
    .filter((r) => r.content)
    .map((r) => ({
      id: r.id,
      formatType: r.formatType as 'markdown' | 'json' | 'pdf',
      content: r.content,
    }));

  return (
    <TechSpecsContent
      sessionId={sessionId}
      workshopId={workshop.id}
      savedPreferences={savedPreferences}
      savedSpecs={savedSpecs.length > 0 ? savedSpecs : null}
      isReadOnly={isReadOnly}
    />
  );
}
