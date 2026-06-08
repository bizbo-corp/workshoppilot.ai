/**
 * Validate-artifact persistence (Step 10).
 *
 * The `validate` step artifact holds two independent sub-trees (synthesis + validation
 * planning) in one jsonb blob, and saveStepArtifact does a FULL REPLACE. So every write
 * must read-modify-write the whole artifact to avoid clobbering the other sub-tree.
 */

import { db } from '@/db/client';
import { stepArtifacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { saveStepArtifact, OptimisticLockError } from '@/lib/context/save-artifact';
import { resolveWorkshopStepId } from '@/lib/workshop/resolve-step';
import type { ValidateArtifact } from '@/lib/schemas';

const VALIDATE_STEP_ID = 'validate';
const SCHEMA_VERSION = '2.0';

export class ValidateStepNotFoundError extends Error {
  constructor(workshopId: string) {
    super(`No validate step row for workshop ${workshopId}`);
    this.name = 'ValidateStepNotFoundError';
  }
}

async function readValidateArtifact(workshopStepId: string): Promise<ValidateArtifact> {
  const rows = await db
    .select({ artifact: stepArtifacts.artifact })
    .from(stepArtifacts)
    .where(eq(stepArtifacts.workshopStepId, workshopStepId))
    .limit(1);
  return (rows[0]?.artifact as ValidateArtifact | undefined) ?? {};
}

/**
 * Read the current validate artifact, apply `mutator`, and persist the merged result.
 * Retries once on optimistic-lock conflict.
 *
 * @returns the persisted ValidateArtifact.
 */
export async function updateValidateArtifact(
  workshopId: string,
  mutator: (current: ValidateArtifact) => ValidateArtifact
): Promise<ValidateArtifact> {
  const workshopStepId = await resolveWorkshopStepId(workshopId, VALIDATE_STEP_ID);
  if (!workshopStepId) throw new ValidateStepNotFoundError(workshopId);

  const attempt = async (): Promise<ValidateArtifact> => {
    const current = await readValidateArtifact(workshopStepId);
    const next = mutator(current);
    await saveStepArtifact(workshopStepId, VALIDATE_STEP_ID, next, SCHEMA_VERSION, false);
    return next;
  };

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof OptimisticLockError) {
      // Concurrent write — re-read and re-apply once.
      return await attempt();
    }
    throw err;
  }
}

/** Read the validation-planning state (classification + plans) for resume / display. */
export async function getValidateArtifact(
  workshopId: string
): Promise<ValidateArtifact | null> {
  const workshopStepId = await resolveWorkshopStepId(workshopId, VALIDATE_STEP_ID);
  if (!workshopStepId) return null;
  return readValidateArtifact(workshopStepId);
}
