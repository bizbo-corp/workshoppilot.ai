'use server';

import { revalidatePath } from 'next/cache';
import { resolveValidateAccess } from '@/lib/validation/access';
import { loadAllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { getConceptCards } from '@/lib/validation/llm-context';
import {
  updateValidateArtifact,
  getValidateArtifact,
} from '@/lib/validation/save-validation';
import { computeScore } from '@/lib/validation/score';
import {
  outputTypeClassificationSchema,
  validationPlanSchema,
  type OutputTypeClassification,
  type ValidationPlan,
  type ValidateArtifact,
} from '@/lib/schemas';

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

function validationState(artifact: ValidateArtifact | null): {
  classification: OutputTypeClassification | null;
  validationPlans: ValidationPlan[];
} {
  return {
    classification: artifact?.classification ?? null,
    validationPlans: artifact?.validationPlans ?? [],
  };
}

export interface WorkshopConcept {
  name: string;
  ideaSource: string;
  elevatorPitch: string;
  usp: string;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Read classification + plans + concept list + problem framing for resume / display. */
export async function getValidationState(workshopId: string): Promise<
  ActionResult<{
    classification: OutputTypeClassification | null;
    validationPlans: ValidationPlan[];
    concepts: WorkshopConcept[];
    problemStatement: string;
    reframedStatement: string;
  }>
> {
  if (!(await resolveValidateAccess(workshopId))) {
    return { success: false, error: 'Access denied' };
  }
  try {
    const [artifact, artifacts] = await Promise.all([
      getValidateArtifact(workshopId),
      loadAllWorkshopArtifacts(workshopId),
    ]);
    const concepts: WorkshopConcept[] = getConceptCards(artifacts)
      .map((c) => ({
        name: asString(c.name),
        ideaSource: asString(c.ideaSource),
        elevatorPitch: asString(c.elevatorPitch),
        usp: asString(c.usp),
      }))
      .filter((c) => c.name);

    const challenge = artifacts.challenge as Record<string, unknown> | null;
    const reframe = artifacts.reframe as Record<string, unknown> | null;
    const reframedStatement =
      asString((reframe?.evolution as Record<string, unknown> | undefined)?.reframedStatement) ||
      asString((reframe?.hmwStatements as string[] | undefined)?.[0]);

    return {
      success: true,
      data: {
        ...validationState(artifact),
        concepts,
        problemStatement: asString(challenge?.problemStatement),
        reframedStatement,
      },
    };
  } catch (err) {
    return { success: false, error: errMessage(err) };
  }
}

/** Persist the (possibly user-overridden) output-type classification. */
export async function saveClassification(
  workshopId: string,
  classification: OutputTypeClassification
): Promise<ActionResult<{ classification: OutputTypeClassification }>> {
  if (!(await resolveValidateAccess(workshopId))) {
    return { success: false, error: 'Access denied' };
  }
  const parsed = outputTypeClassificationSchema.safeParse(classification);
  if (!parsed.success) {
    return { success: false, error: 'Invalid classification' };
  }
  try {
    await updateValidateArtifact(workshopId, (current) => ({
      ...current,
      classification: parsed.data,
    }));
    return { success: true, data: { classification: parsed.data } };
  } catch (err) {
    return { success: false, error: errMessage(err) };
  }
}

/** Insert or update a validation plan (matched by id). */
export async function upsertValidationPlan(
  workshopId: string,
  plan: ValidationPlan
): Promise<ActionResult<{ plan: ValidationPlan }>> {
  if (!(await resolveValidateAccess(workshopId))) {
    return { success: false, error: 'Access denied' };
  }
  const parsed = validationPlanSchema.safeParse(plan);
  if (!parsed.success) {
    return { success: false, error: 'Invalid validation plan' };
  }
  const next = parsed.data;
  try {
    await updateValidateArtifact(workshopId, (current) => {
      const plans = current.validationPlans ?? [];
      const idx = plans.findIndex((p) => p.id === next.id);
      const updated =
        idx >= 0
          ? plans.map((p, i) => (i === idx ? next : p))
          : [...plans, next];
      return { ...current, validationPlans: updated };
    });
    return { success: true, data: { plan: next } };
  } catch (err) {
    return { success: false, error: errMessage(err) };
  }
}

/**
 * Record a real-world result for a plan and compute the score/verdict server-side
 * (authoritative). Requires the plan to already have a committed signal.
 */
export async function recordValidationResult(
  workshopId: string,
  planId: string,
  actual: number,
  notes?: string
): Promise<ActionResult<{ plan: ValidationPlan }>> {
  if (!(await resolveValidateAccess(workshopId))) {
    return { success: false, error: 'Access denied' };
  }
  if (!Number.isFinite(actual)) {
    return { success: false, error: 'Actual value must be a number' };
  }
  try {
    let savedPlan: ValidationPlan | null = null;
    await updateValidateArtifact(workshopId, (current) => {
      const plans = current.validationPlans ?? [];
      const idx = plans.findIndex((p) => p.id === planId);
      if (idx < 0) throw new Error('Plan not found');
      const plan = plans[idx];
      if (!plan.signal) throw new Error('Plan has no committed signal');

      const { score, verdict } = computeScore(plan.signal, actual);
      const updatedPlan: ValidationPlan = {
        ...plan,
        result: {
          actual,
          score,
          verdict,
          recordedAt: new Date().toISOString(),
          ...(notes ? { notes } : {}),
        },
        progressStep: 'complete',
        updatedAt: new Date().toISOString(),
      };
      savedPlan = updatedPlan;
      return {
        ...current,
        validationPlans: plans.map((p, i) => (i === idx ? updatedPlan : p)),
      };
    });

    revalidatePath(`/workshop/[sessionId]/step/[stepId]`, 'page');
    if (!savedPlan) return { success: false, error: 'Plan not found' };
    return { success: true, data: { plan: savedPlan } };
  } catch (err) {
    return { success: false, error: errMessage(err) };
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}
