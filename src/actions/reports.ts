'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireMember } from '@/lib/workshops/access';
import { loadWorkshop, append } from '@/lib/engine/store';
import { withCredits, InsufficientCreditsError } from '@/lib/credits/ledger';
import { generateBuildPack, generateSummary, generateVerdict, latestReport, VERDICT_CREDITS } from '@/lib/reports/generate';
import { stateHash } from '@/lib/reports/brief';
import { computeScore } from '@/lib/reports/score';
import type { Verdict } from '@/lib/reports/schemas';
import type { ActionResult } from './types';

function finished(state: { completedStages: string[] }) {
  return state.completedStages.includes('deliver');
}

export async function buildSummary(workshopId: string): Promise<ActionResult<{ markdown: string }>> {
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  if (!finished(loaded.state)) return { success: false, error: 'Finish Deliver first' };
  try {
    const { markdown } = await generateSummary(workshopId, user.id, loaded.state);
    revalidatePath(`/w/${workshopId}/summary`);
    return { success: true, data: { markdown } };
  } catch (err) {
    console.error('[summary]', err);
    return { success: false, error: 'The summary did not generate. Try again in a moment.' };
  }
}

/** The paid Verdict. Charges credits first; refunds if generation fails. Cached results are free. */
export async function buyVerdict(workshopId: string): Promise<ActionResult<{ cached: boolean }>> {
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  if (!finished(loaded.state)) return { success: false, error: 'Finish Deliver first' };

  const existing = await latestReport(workshopId, 'verdict');
  if (existing && existing.stateHash === stateHash(loaded.state)) return { success: true, data: { cached: true } };

  try {
    await withCredits(
      { userId: user.id, amount: VERDICT_CREDITS, kind: 'spend', description: 'Verdict', reference: `verdict:${workshopId}:${stateHash(loaded.state)}`, workshopId },
      () => generateVerdict(workshopId, user.id, loaded.state),
    );
    revalidatePath(`/w/${workshopId}/summary`);
    return { success: true, data: { cached: false } };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) return { success: false, error: `You need ${err.needed} credits for the Verdict and have ${err.balance}.` };
    console.error('[verdict]', err);
    return { success: false, error: 'The Verdict did not generate. Your credits were returned.' };
  }
}

/** The Build Pack comes with the Verdict; it needs one to exist. */
export async function buildBuildPack(workshopId: string): Promise<ActionResult<{ markdown: string }>> {
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  const verdict = await latestReport(workshopId, 'verdict');
  if (!verdict) return { success: false, error: 'Get the Verdict first' };
  try {
    const { markdown } = await generateBuildPack(workshopId, user.id, loaded.state, verdict.content as unknown as Verdict);
    revalidatePath(`/w/${workshopId}/summary`);
    return { success: true, data: { markdown } };
  } catch (err) {
    console.error('[build-pack]', err);
    return { success: false, error: 'The Build Pack did not generate. Try again in a moment.' };
  }
}

const resultSchema = z.object({ workshopId: z.string(), actual: z.number().min(0), note: z.string().max(500).optional() });

/** Log the real-world result of the test; this fills the Validation Score. */
export async function recordResult(input: z.infer<typeof resultSchema>): Promise<ActionResult<{ score: number; verdict: string }>> {
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Enter a number' };
  const { workshopId, actual, note } = parsed.data;
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  const verdict = await latestReport(workshopId, 'verdict');
  if (!verdict) return { success: false, error: 'Get the Verdict first so there is a target to score against' };
  const signal = (verdict.content as unknown as Verdict).signal;
  const { score, verdict: scoreVerdict } = computeScore(signal, actual);
  await append({
    workshopId,
    actor: 'user',
    actorId: user.id,
    payload: { type: 'field.set', stage: 'deliver', field: 'result', value: JSON.stringify({ actual, score, verdict: scoreVerdict, note: note ?? '', at: new Date().toISOString() }) },
  }, loaded.state);
  revalidatePath(`/w/${workshopId}/summary`);
  return { success: true, data: { score, verdict: scoreVerdict } };
}
