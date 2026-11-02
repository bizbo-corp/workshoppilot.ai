import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, workshopMembers } from '@/db/schema';
import { requireUser } from '@/lib/auth/current-user';
import { STAGE_LABELS } from '@/lib/stages/definitions';

export const dynamic = 'force-dynamic';

/**
 * The workshop room. Phase 3 replaces this placeholder with the engine-driven
 * chat and board; for now it proves membership and shows the idea.
 */
export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const [row] = await db
    .select({ workshop: workshops })
    .from(workshops)
    .innerJoin(workshopMembers, and(eq(workshopMembers.workshopId, workshops.id), eq(workshopMembers.userId, user.id)))
    .where(eq(workshops.id, id))
    .limit(1);
  if (!row || row.workshop.deletedAt) notFound();
  const w = row.workshop;

  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{STAGE_LABELS[w.stage]}</div>
      <h1 className="text-2xl font-semibold tracking-tight">{w.title}</h1>
      <p className="max-w-2xl text-muted-foreground">{w.idea}</p>
      <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        The facilitator arrives in the next build step. Your idea is saved.
      </p>
    </div>
  );
}
