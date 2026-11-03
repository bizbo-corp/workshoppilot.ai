'use server';

import { z } from 'zod';
import { createPrefixedId } from '@/lib/ids';
import { requireMember } from '@/lib/workshops/access';
import { append, loadWorkshop } from '@/lib/engine/store';
import { BOARDS, isZone } from '@/lib/engine/boards';
import { STAGES, fieldKey } from '@/lib/engine/stages';
import { stageBoards } from '@/lib/engine/tools';
import { BOARD_IDS, type WorkshopState } from '@/lib/engine/types';
import { IDEA_TYPES } from '@/lib/engine/ids';
import type { ActionResult } from './types';

/**
 * The user's hands on the board and the fields. Every action is one event;
 * the AI sees them as "what the user did since I last spoke".
 */

const addSchema = z.object({
  workshopId: z.string(),
  board: z.enum(BOARD_IDS),
  zone: z.string(),
  text: z.string().min(1).max(300),
  imageUrl: z.string().url().optional(),
});

export async function addBoardItem(input: z.infer<typeof addSchema>): Promise<ActionResult<{ id: string; state: WorkshopState }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid item' };
  const { workshopId, board, zone, text, imageUrl } = parsed.data;
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  if (!stageBoards(loaded.state).includes(board)) return { success: false, error: 'That board is not open in this stage' };
  if (!isZone(board, zone)) return { success: false, error: 'Unknown zone' };
  if (loaded.state.boards[board].filter((i) => i.zone === zone).length >= BOARDS[board].maxPerZone) return { success: false, error: 'That zone is full' };
  const item = { id: createPrefixedId('itm'), board, zone, text: text.trim(), createdBy: 'user' as const, imageUrl };
  const { state } = await append({ workshopId, actor: 'user', actorId: user.id, payload: { type: 'board.item_added', item } }, loaded.state);
  return { success: true, data: { id: item.id, state } };
}

const updateSchema = z.object({
  workshopId: z.string(),
  id: z.string(),
  text: z.string().min(1).max(300).optional(),
  zone: z.string().optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function updateBoardItem(input: z.infer<typeof updateSchema>): Promise<ActionResult<{ state: WorkshopState }>> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid change' };
  const { workshopId, id, text, zone, meta } = parsed.data;
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  const item = Object.values(loaded.state.boards).flat().find((i) => i.id === id);
  if (!item) return { success: false, error: 'No such item' };
  if (zone && !isZone(item.board, zone)) return { success: false, error: 'Unknown zone' };
  const { state } = await append({ workshopId, actor: 'user', actorId: user.id, payload: { type: 'board.item_updated', id, patch: { text: text?.trim(), zone, meta } } }, loaded.state);
  return { success: true, data: { state } };
}

export async function removeBoardItem(workshopId: string, id: string): Promise<ActionResult<{ state: WorkshopState }>> {
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  if (!Object.values(loaded.state.boards).flat().some((i) => i.id === id)) return { success: false, error: 'No such item' };
  const { state } = await append({ workshopId, actor: 'user', actorId: user.id, payload: { type: 'board.item_removed', id } }, loaded.state);
  return { success: true, data: { state } };
}

export async function setFieldValue(workshopId: string, field: string, value: string): Promise<ActionResult<{ state: WorkshopState }>> {
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  const stage = loaded.state.stage;
  if (!STAGES[stage].fields.some((f) => f.id === field)) return { success: false, error: 'Unknown field' };
  const clean = value.trim().slice(0, 2000);
  const payload = clean ? { type: 'field.set' as const, stage, field, value: clean } : { type: 'field.cleared' as const, stage, field };
  const { state } = await append({ workshopId, actor: 'user', actorId: user.id, payload }, loaded.state);
  void fieldKey;
  return { success: true, data: { state } };
}

export async function setIdeaType(workshopId: string, ideaType: string): Promise<ActionResult<{ state: WorkshopState }>> {
  const parsed = z.enum(IDEA_TYPES).safeParse(ideaType);
  if (!parsed.success) return { success: false, error: 'Unknown idea type' };
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  const { state } = await append({ workshopId, actor: 'user', actorId: user.id, payload: { type: 'idea_type.set', ideaType: parsed.data, confidence: 1, source: 'user' } }, loaded.state);
  return { success: true, data: { state } };
}

/** The user opens an activity from the rail. */
export async function setActivity(workshopId: string, activity: string): Promise<ActionResult<{ state: WorkshopState }>> {
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  if (!STAGES[loaded.state.stage].activities.some((a) => a.id === activity)) return { success: false, error: 'Unknown activity' };
  let state = loaded.state;
  if (state.interview) ({ state } = await append({ workshopId, actor: 'user', actorId: user.id, payload: { type: 'interview.ended' } }, state));
  ({ state } = await append({ workshopId, actor: 'user', actorId: user.id, payload: { type: 'activity.entered', stage: state.stage, activity } }, state));
  return { success: true, data: { state } };
}

/** The user leaves a practice interview from the banner. */
export async function endInterview(workshopId: string): Promise<ActionResult<{ state: WorkshopState }>> {
  const { user } = await requireMember(workshopId);
  const loaded = await loadWorkshop(workshopId);
  if (!loaded) return { success: false, error: 'Not found' };
  if (!loaded.state.interview) return { success: true, data: { state: loaded.state } };
  const { state } = await append({ workshopId, actor: 'user', actorId: user.id, payload: { type: 'interview.ended' } }, loaded.state);
  return { success: true, data: { state } };
}
