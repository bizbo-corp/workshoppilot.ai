import { db } from '@/db/client';
import { workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Resolve the workshop step row id (wst_*) for a given workshop + semantic step id.
 * Returns null if the step row does not exist.
 */
export async function resolveWorkshopStepId(
  workshopId: string,
  stepId: string
): Promise<string | null> {
  const rows = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(
      and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, stepId))
    )
    .limit(1);

  return rows[0]?.id ?? null;
}
