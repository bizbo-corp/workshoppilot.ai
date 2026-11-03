import { stepCountIs, type LanguageModel } from 'ai';
import { and, asc, eq, gt } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshopEvents } from '@/db/schema';
import { aiStream } from '@/lib/ai/gateway';
import { buildMessages, buildSystemPrompt } from './context';
import { reduce } from './reducer';
import { append, loadWorkshop } from './store';
import { facilitatorTools } from './tools';
import type { EngineEvent, EventPayload, WorkshopState } from './types';

/** A turn may call tools then speak; six steps is plenty. */
export const FACILITATE_STOP = stepCountIs(6);

export interface FacilitateInput {
  workshopId: string;
  userId: string;
  trigger: 'chat' | 'canvas' | 'greeting';
  /** For trigger 'chat': the user's new message. Appended before the model runs. */
  text?: string;
  /** Test override. */
  model?: LanguageModel;
}

/**
 * One facilitator turn. Appends the user's message (if any), builds the
 * context from state, streams the reply with tools wired to the event log,
 * and records the reply as a chat.ai event when the stream finishes.
 *
 * Returns the AI SDK stream result; the route turns it into a response.
 */
export async function facilitate(input: FacilitateInput) {
  const loaded = await loadWorkshop(input.workshopId);
  if (!loaded) throw new Error('Workshop not found');
  let state: WorkshopState = loaded.state;

  if (input.trigger === 'chat' && input.text?.trim()) {
    ({ state } = await append({ workshopId: input.workshopId, actor: 'user', actorId: input.userId, payload: { type: 'chat.user', text: input.text.trim() } }, state));
  }

  const sinceAi = await eventsSince(input.workshopId, state.aiSeenSeq);

  const suggestions: string[] = [];
  const emit = async (payload: EventPayload) => {
    ({ state } = await append({ workshopId: input.workshopId, actor: 'ai', actorId: 'facilitate', payload }, state));
  };
  const tools = facilitatorTools({ getState: () => state, emit, suggestions });

  const system = buildSystemPrompt(state);
  const messages = buildMessages(state, sinceAi, { trigger: input.trigger });

  const result = aiStream(
    { job: 'facilitate', workshopId: input.workshopId, userId: input.userId, model: input.model },
    {
      system,
      messages,
      tools,
      maxOutputTokens: 900,
      stopWhen: FACILITATE_STOP,
    },
  );

  // Record the reply once the whole multi-step run has finished.
  const finished = result.text.then(async (text) => {
    const clean = text.trim();
    if (!clean || clean === '(quiet)') {
      // Mark the canvas changes as seen even when the AI chose silence.
      ({ state } = await append({ workshopId: input.workshopId, actor: 'ai', actorId: 'facilitate', payload: { type: 'ai.seen', seq: state.seq } }, state));
      return null;
    }
    ({ state } = await append(
      { workshopId: input.workshopId, actor: 'ai', actorId: 'facilitate', payload: { type: 'chat.ai', text: clean, suggestions: suggestions.length ? [...suggestions] : undefined } },
      state,
    ));
    return state;
  });

  return { result, finished, getState: () => state };
}


async function eventsSince(workshopId: string, seq: number): Promise<EngineEvent[]> {
  const rows = await db
    .select()
    .from(workshopEvents)
    .where(and(eq(workshopEvents.workshopId, workshopId), gt(workshopEvents.seq, seq)))
    .orderBy(asc(workshopEvents.seq));
  return rows.map((row) => ({
    seq: row.seq,
    actor: row.actor,
    actorId: row.actorId,
    payload: { ...(row.payload as object), type: row.type } as EventPayload,
    createdAt: row.createdAt,
  }));
}

/** Exposed for tests: fold a payload into a state without the database. */
export function applyLocal(state: WorkshopState, payload: EventPayload, actor: EngineEvent['actor'] = 'ai'): WorkshopState {
  return reduce(state, { seq: state.seq + 1, actor, actorId: null, payload, createdAt: new Date() });
}
