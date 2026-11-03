import { tool } from 'ai';
import { z } from 'zod';
import { createPrefixedId } from '@/lib/ids';
import { BOARDS, isZone } from './boards';
import { STAGES, currentActivity, fieldKey, isStageDone, missingFields, nextStage } from './stages';
import { IDEA_TYPES, STAGE_IDS } from '@/lib/engine/ids';
import { BOARD_IDS, type BoardId, type EventPayload, type WorkshopState } from './types';

/**
 * The AI's hands. Each tool validates against the stage and the board
 * definitions, then hands typed events to `emit`, which the chat route
 * wires to the store. The tools never touch the database themselves, so
 * tests run them against an in-memory state.
 */
export interface ToolContext {
  getState: () => WorkshopState;
  emit: (payload: EventPayload) => Promise<void>;
  /** Collected one-tap replies; the route attaches them to the chat.ai event. */
  suggestions: string[];
}

/** Boards the current stage may touch: any of its activities' boards. */
export function stageBoards(state: WorkshopState): BoardId[] {
  const ids = STAGES[state.stage].activities.map((a) => a.board).filter((b): b is BoardId => !!b);
  return [...new Set(ids)];
}

const metaSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional();

export function facilitatorTools(ctx: ToolContext) {
  return {
    set_field: tool({
      description: "Record a value for one of the current stage's fields. Call again to update it.",
      inputSchema: z.object({
        field: z.string().describe('Field id from the stage, e.g. "challenge"'),
        value: z.string().min(1).max(2000),
      }),
      execute: async ({ field, value }) => {
        const state = ctx.getState();
        const def = STAGES[state.stage].fields.find((f) => f.id === field && !f.hidden);
        if (!def) return { ok: false, error: `Unknown field "${field}" for ${state.stage}. Fields: ${STAGES[state.stage].fields.filter((f) => !f.hidden).map((f) => f.id).join(', ')}` };
        await ctx.emit({ type: 'field.set', stage: state.stage, field, value: value.trim() });
        return { ok: true, field, missing: missingFields(ctx.getState()).map((f) => f.id) };
      },
    }),

    add_board_item: tool({
      description: 'Add one item to a board zone in this stage.',
      inputSchema: z.object({
        board: z.enum(BOARD_IDS),
        zone: z.string(),
        text: z.string().min(1).max(300),
        meta: metaSchema,
      }),
      execute: async ({ board, zone, text, meta }) => {
        const state = ctx.getState();
        if (!stageBoards(state).includes(board)) return { ok: false, error: `${board} is not used in ${state.stage}. Boards here: ${stageBoards(state).join(', ')}` };
        if (!isZone(board, zone)) return { ok: false, error: `Unknown zone "${zone}". Zones: ${BOARDS[board].zones.map((z) => z.id).join(', ')}` };
        const inZone = state.boards[board].filter((i) => i.zone === zone);
        if (inZone.length >= BOARDS[board].maxPerZone) return { ok: false, error: `${zone} is full (${BOARDS[board].maxPerZone}). Update an existing item instead.` };
        const dup = state.boards[board].find((i) => i.text.trim().toLowerCase() === text.trim().toLowerCase());
        if (dup) return { ok: true, id: dup.id, note: 'already on the board' };
        const item = { id: createPrefixedId('itm'), board, zone, text: text.trim(), createdBy: 'ai' as const, meta };
        await ctx.emit({ type: 'board.item_added', item });
        return { ok: true, id: item.id };
      },
    }),

    update_board_item: tool({
      description: 'Change the text, zone or meta of an existing board item by id.',
      inputSchema: z.object({
        id: z.string(),
        text: z.string().min(1).max(300).optional(),
        zone: z.string().optional(),
        meta: metaSchema,
      }),
      execute: async ({ id, text, zone, meta }) => {
        const state = ctx.getState();
        const item = Object.values(state.boards).flat().find((i) => i.id === id);
        if (!item) return { ok: false, error: `No item ${id}` };
        if (zone && !isZone(item.board, zone)) return { ok: false, error: `Unknown zone "${zone}"` };
        await ctx.emit({ type: 'board.item_updated', id, patch: { text: text?.trim(), zone, meta } });
        return { ok: true };
      },
    }),

    remove_board_item: tool({
      description: 'Remove a board item by id. Only remove items you added, duplicates, or ones the user asked to remove.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const item = Object.values(ctx.getState().boards).flat().find((i) => i.id === id);
        if (!item) return { ok: false, error: `No item ${id}` };
        await ctx.emit({ type: 'board.item_removed', id });
        return { ok: true };
      },
    }),

    set_idea_type: tool({
      description: 'Your best guess at what kind of thing the idea is. The user can correct it.',
      inputSchema: z.object({
        ideaType: z.enum(IDEA_TYPES),
        confidence: z.number().min(0).max(1),
      }),
      execute: async ({ ideaType, confidence }) => {
        await ctx.emit({ type: 'idea_type.set', ideaType, confidence, source: 'ai' });
        return { ok: true };
      },
    }),

    set_activity: tool({
      description: 'Move the workshop to another activity within the current stage (forward when one is done, or back if the user asks).',
      inputSchema: z.object({ activity: z.string().describe('Activity id from the stage, e.g. "interviews"') }),
      execute: async ({ activity }) => {
        const state = ctx.getState();
        const def = STAGES[state.stage].activities.find((a) => a.id === activity);
        if (!def) return { ok: false, error: `Unknown activity "${activity}". Activities: ${STAGES[state.stage].activities.map((a) => a.id).join(', ')}` };
        if (state.interview) await ctx.emit({ type: 'interview.ended' });
        await ctx.emit({ type: 'activity.entered', stage: state.stage, activity });
        return { ok: true, activity, note: `Now facilitating "${def.label}". Follow its script from the top: open it in one or two lines and start.` };
      },
    }),

    start_interview: tool({
      description: 'Begin a practice interview: you will play this interviewee until end_interview.',
      inputSchema: z.object({ itemId: z.string().describe('The interviewees board item id') }),
      execute: async ({ itemId }) => {
        const state = ctx.getState();
        const item = state.boards.interviewees.find((i) => i.id === itemId);
        if (!item) return { ok: false, error: `No interviewee ${itemId}. Interviewees: ${state.boards.interviewees.map((i) => `${i.id} ${i.text}`).join('; ') || 'none yet'}` };
        const name = item.text.split(',')[0].trim();
        await ctx.emit({ type: 'interview.started', itemId, name });
        return { ok: true, name, note: `You are now ${item.text}. Introduce yourself in character in two or three sentences with one vivid detail, then offer three questions as suggested replies.` };
      },
    }),

    end_interview: tool({
      description: 'Leave character and return to facilitating.',
      inputSchema: z.object({}),
      execute: async () => {
        const state = ctx.getState();
        if (!state.interview) return { ok: true, note: 'No interview was running.' };
        const done = state.boards.interviewees.find((i) => i.id === state.interview!.itemId);
        if (done) await ctx.emit({ type: 'board.item_updated', id: done.id, patch: { meta: { done: true, questions: state.interview.questions } } });
        await ctx.emit({ type: 'interview.ended' });
        return { ok: true, note: 'Back in facilitator voice.' };
      },
    }),

    complete_stage: tool({
      description: 'Finish the current stage and move to the next. Refused until the required fields are set.',
      inputSchema: z.object({
        summary: z.string().min(20).max(1200).describe('Two to four lines on what this stage produced, for later stages to read.'),
      }),
      execute: async ({ summary }) => {
        const state = ctx.getState();
        if (!isStageDone(state)) return { ok: false, error: `Not yet. Still needed: ${missingFields(state).map((f) => f.id).join(', ')}` };
        const next = nextStage(state.stage);
        if (state.interview) await ctx.emit({ type: 'interview.ended' });
        await ctx.emit({ type: 'stage.completed', stage: state.stage, summary: summary.trim() });
        if (next) await ctx.emit({ type: 'stage.entered', stage: next });
        return { ok: true, next: next ?? 'finished', note: next ? `Two lines at most: one on what they built (do not restate the fields), one previewing ${STAGES[next].label}. No question. The next stage opens with its own.` : 'The workshop is finished. Point them to the summary.' };
      },
    }),

    suggest_replies: tool({
      description: 'Offer two or three short replies the user could tap instead of typing.',
      inputSchema: z.object({ replies: z.array(z.string().min(1).max(80)).min(2).max(3) }),
      execute: async ({ replies }) => {
        ctx.suggestions.splice(0, ctx.suggestions.length, ...replies);
        return { ok: true };
      },
    }),
  };
}

export type FacilitatorTools = ReturnType<typeof facilitatorTools>;

export const STAGE_ID_LIST = STAGE_IDS;
export { fieldKey, currentActivity };
