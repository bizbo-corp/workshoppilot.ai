/**
 * POST /api/build-pack/generate-validation-plan
 * Upsert the workshop's Validation Plan as a Build Pack deliverable (markdown).
 *
 * Body: { workshopId: string }
 */

import { db } from '@/db/client';
import { buildPacks } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { resolveValidateAccess } from '@/lib/validation/access';
import { getValidateArtifact } from '@/lib/validation/save-validation';
import { renderValidationPlanMarkdown } from '@/lib/validation/plan-markdown';

const TITLE = 'Validation Plan';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request) {
  try {
    const { workshopId } = await req.json();
    if (!workshopId) return json({ error: 'workshopId is required' }, 400);
    if (!(await resolveValidateAccess(workshopId))) return json({ error: 'Access denied' }, 403);

    const artifact = await getValidateArtifact(workshopId);
    const plans = artifact?.validationPlans ?? [];
    if (plans.length === 0) {
      return json({ error: 'No validation plans to export yet' }, 400);
    }

    const content = renderValidationPlanMarkdown(plans);

    const existing = (
      await db
        .select()
        .from(buildPacks)
        .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, `${TITLE}%`)))
    ).find((r) => r.formatType === 'markdown');

    let buildPackId: string;
    if (existing) {
      await db.update(buildPacks).set({ content }).where(eq(buildPacks.id, existing.id));
      buildPackId = existing.id;
    } else {
      const [inserted] = await db
        .insert(buildPacks)
        .values({ workshopId, title: TITLE, formatType: 'markdown', content })
        .returning({ id: buildPacks.id });
      buildPackId = inserted.id;
    }

    return json({ saved: true, buildPackId });
  } catch (error) {
    console.error(
      '[build-pack/generate-validation-plan] error:',
      error instanceof Error ? error.message : error
    );
    return json({ error: 'Failed to generate validation plan' }, 500);
  }
}
