/**
 * Keep the "Validation Plan" Build Pack deliverable in sync with the workshop's validation plans.
 *
 * The Validation Plan is published to the Build Pack automatically — there is no manual "add"
 * button. The /outputs page calls this on load (so it's always present and current), and it runs
 * again whenever a result is recorded (so the exported markdown reflects the latest outcome).
 *
 * Pure server-side; safe to call repeatedly (it only writes when the content actually changed).
 */

import { db } from '@/db/client';
import { buildPacks } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { getValidateArtifact } from '@/lib/validation/save-validation';
import { renderValidationPlanMarkdown } from '@/lib/validation/plan-markdown';

const TITLE = 'Validation Plan';

/**
 * Render the workshop's validation plans to markdown and upsert the Build Pack deliverable.
 * No-op when there are no plans yet. Returns true if a row was written.
 */
export async function syncValidationPlanDeliverable(workshopId: string): Promise<boolean> {
  const artifact = await getValidateArtifact(workshopId);
  const plans = artifact?.validationPlans ?? [];
  if (plans.length === 0) return false;

  const content = renderValidationPlanMarkdown(plans);

  const existing = (
    await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, `${TITLE}%`)))
  ).find((r) => r.formatType === 'markdown');

  if (existing) {
    if (existing.content !== content) {
      await db.update(buildPacks).set({ content }).where(eq(buildPacks.id, existing.id));
      return true;
    }
    return false;
  }

  await db
    .insert(buildPacks)
    .values({ workshopId, title: TITLE, formatType: 'markdown', content });
  return true;
}
