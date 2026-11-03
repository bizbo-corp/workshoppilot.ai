import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, workshopMembers, type Workshop, type MemberRole } from '@/db/schema';
import { requireUser } from '@/lib/auth/current-user';
import type { User } from '@/db/schema';

export class ForbiddenError extends Error {
  constructor() {
    super('Not a member of this workshop');
    this.name = 'ForbiddenError';
  }
}

/** The signed-in user and their membership of the workshop, or throws. */
export async function requireMember(workshopId: string): Promise<{ user: User; workshop: Workshop; role: MemberRole }> {
  const user = await requireUser();
  const [row] = await db
    .select({ workshop: workshops, role: workshopMembers.role })
    .from(workshops)
    .innerJoin(workshopMembers, and(eq(workshopMembers.workshopId, workshops.id), eq(workshopMembers.userId, user.id)))
    .where(eq(workshops.id, workshopId))
    .limit(1);
  if (!row || row.workshop.deletedAt) throw new ForbiddenError();
  return { user, workshop: row.workshop, role: row.role };
}
