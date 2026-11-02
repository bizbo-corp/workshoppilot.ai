'use server';

import { and, desc, eq, isNull, count } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { workshops, workshopMembers, workshopEvents, type Workshop } from '@/db/schema';
import { requireUser } from '@/lib/auth/current-user';
import type { ActionResult } from './billing';

/** Free tier: this many active workshops at once. Extra ones are a credit job later. */
export const FREE_ACTIVE_WORKSHOPS = 2;

export async function listMyWorkshops(): Promise<Workshop[]> {
  const user = await requireUser();
  return db
    .select()
    .from(workshops)
    .where(and(eq(workshops.ownerId, user.id), isNull(workshops.deletedAt), isNull(workshops.testRunId)))
    .orderBy(desc(workshops.updatedAt));
}

/** Create a workshop from one sentence and go straight to it. */
export async function createWorkshop(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const idea = String(formData.get('idea') ?? '').trim();
  if (idea.length < 8) return { success: false, error: 'Tell me a little more about the idea' };
  if (idea.length > 600) return { success: false, error: 'Keep it under 600 characters for now' };

  const [{ active }] = await db
    .select({ active: count() })
    .from(workshops)
    .where(and(eq(workshops.ownerId, user.id), eq(workshops.status, 'active'), isNull(workshops.deletedAt), isNull(workshops.testRunId)));
  if (active >= FREE_ACTIVE_WORKSHOPS) {
    return { success: false, error: `You have ${active} workshops on the go. Finish or archive one to start another.` };
  }

  const title = idea.length > 60 ? `${idea.slice(0, 57).trimEnd()}…` : idea;
  const [workshop] = await db.insert(workshops).values({ ownerId: user.id, title, idea }).returning();
  await db.insert(workshopMembers).values({ workshopId: workshop.id, userId: user.id, role: 'owner' });
  await db.insert(workshopEvents).values({
    workshopId: workshop.id,
    seq: 1,
    actor: 'user',
    actorId: user.id,
    type: 'workshop.created',
    payload: { idea },
  });

  revalidatePath('/dashboard');
  redirect(`/w/${workshop.id}`);
}

export async function archiveWorkshop(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await db
    .update(workshops)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(and(eq(workshops.id, id), eq(workshops.ownerId, user.id)));
  revalidatePath('/dashboard');
  return { success: true, data: undefined };
}
