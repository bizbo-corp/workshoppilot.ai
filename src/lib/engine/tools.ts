import { tool } from 'ai';
import { z } from 'zod';
import { createPrefixedId } from '@/lib/ids';
import { BOARDS, isZone } from './boards';
import { STAGES, fieldKey, isStageDone, missingFields, nextStage } from './stages';
import { IDEA_TYPES, STAGE_IDS } from '@/lib/engine/ids';
import { BOARD_IDS, type EventPayload, type WorkshopState } from './types';

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

export function facilitatorTools(ctx: ToolContext) {
  return {
    set_field: tool({
      description: 'Record a value for one of the current stage\'s fields. Call again to update it.',
      inputSchema: z.object({
        field: z.string().describe('Field id from the stage, e.g. "challenge"'),
        value: z.string().min(1).max(2000),
      }),
      execute: async ({ field, value }) => {
        const state = ctx.getState();
        const def = STAGES[state.stage].fields.find((f) => f.id === field);
        if (!def) return { ok: false, error: `Unknown field "${field}" for ${state.stage}. Fields: ${STAGES[state.stage].fields.map((f) => f.id).join(', ')}` };
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
        meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      }),
      execute: async ({ board, zone, text, meta }) => {
        const state = ctx.getState();
        if (!STAGES[state.stage].boards.includes(board)) return { ok: false, error: `${board} is not used in ${state.stage}` };
        if (!isZone(board, zone)) return { ok: false, error: `Unknown zone "${zone}". Zones: ${BOARDS[board].zones.map((z) => z.id).join(', ')}` };
        const inZone = state.boards[board].filter((i) => i.zone === zone);
        if (inZone.length >= BOARDS[board].maxPerZone) return { ok: false, error: `${zone} is full (${BOARDS[board].maxPerZone}). Update an existing item instead.` };
        const dup = inZone.find((i) => i.text.trim().toLowerCase() === text.trim().toLowerCase());
        if (dup) return { ok: true, id: dup.id, note: 'already there' };
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
        meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
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
      description: 'Remove a board item by id. Only remove items you added, or ones the user asked to remove.',
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

    complete_stage: tool({
      description: 'Finish the current stage and move to the next. Refused until the required fields are set.',
      inputSchema: z.object({
        summary: z.string().min(20).max(1200).describe('Two to four lines on what this stage produced, for later stages to read.'),
      }),
      execute: async ({ summary }) => {
        const state = ctx.getState();
        if (!isStageDone(state)) return { ok: false, error: `Not yet. Still needed: ${missingFields(state).map((f) => f.id).join(', ')}` };
        const next = nextStage(state.stage);
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

/** Stage and field ids as the UI needs them. */
export const STAGE_ID_LIST = STAGE_IDS;
export { fieldKey };
