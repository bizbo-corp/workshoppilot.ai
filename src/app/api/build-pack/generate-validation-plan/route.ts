/**
 * POST /api/build-pack/generate-validation-plan
 * Upsert the workshop's Validation Plan as a Build Pack deliverable (markdown).
 *
 * Body: { workshopId: string }
 */

import { resolveValidateAccess } from '@/lib/validation/access';
import { getValidateArtifact } from '@/lib/validation/save-validation';
import { syncValidationPlanDeliverable } from '@/lib/validation/sync-build-pack';

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
    if ((artifact?.validationPlans ?? []).length === 0) {
      return json({ error: 'No validation plans to export yet' }, 400);
    }

    await syncValidationPlanDeliverable(workshopId);
    return json({ saved: true });
  } catch (error) {
    console.error(
      '[build-pack/generate-validation-plan] error:',
      error instanceof Error ? error.message : error
    );
    return json({ error: 'Failed to generate validation plan' }, 500);
  }
}
