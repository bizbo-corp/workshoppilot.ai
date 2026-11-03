'use server';

import { requireMember } from '@/lib/workshops/access';
import { append, loadWorkshop } from '@/lib/engine/store';
import { withCredits, InsufficientCreditsError } from '@/lib/credits/ledger';
import { getJobConfig } from '@/lib/ai/jobs';
import { generateImageFor } from '@/lib/ai/images';
import { getLens } from '@/lib/engine/lenses';
import type { WorkshopState } from '@/lib/engine/types';
import type { ActionResult } from './types';

/**
 * Paid sketch clean-up: turns the rough drawing on an idea slot into a
 * clean concept image. Charges credits first; refunds if the model fails.
 */
export async function cleanUpSketch(workshopId: string, itemId: string): Promise<ActionResult<{ state: WorkshopState; url: string }>> {
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  const item = Object.values(loaded.state.boards).flat().find((i) => i.id === itemId);
  if (!item) return { success: false, error: 'No such item' };
  if (!item.imageUrl) return { success: false, error: 'Upload a sketch first' };

  const lens = getLens(loaded.state.ideaType);
  const credits = getJobConfig('clean_sketch').credits;
  const prompt = `Redraw this rough sketch as a clean, confident concept illustration for a ${lens?.label.toLowerCase() ?? 'new'} idea: "${item.text}". Keep exactly the same layout and elements; tidy the lines, align things, make text legible. Flat line art with one accent colour on white. No extra elements.`;

  try {
    const { url } = await withCredits(
      { userId: user.id, amount: credits, kind: 'spend', description: 'Sketch clean-up', reference: `clean:${itemId}:${Date.now()}`, workshopId },
      () => generateImageFor('clean_sketch', { workshopId, userId: user.id, prompt, sourceImageUrl: item.imageUrl, creditsCharged: credits }),
    );
    const { state } = await append({ workshopId, actor: 'user', actorId: user.id, payload: { type: 'board.item_updated', id: itemId, patch: { imageUrl: url, meta: { cleanedFrom: item.imageUrl.slice(0, 200), cleaned: true } } } }, loaded.state);
    return { success: true, data: { state, url } };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) return { success: false, error: `Clean-up is ${err.needed} credits; you have ${err.balance}.` };
    console.error('[clean-sketch]', err);
    return { success: false, error: 'The clean-up failed. Your credits were returned.' };
  }
}
