import { stepCountIs, type LanguageModel } from 'ai';
import { and, asc, eq, gt } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshopEvents } from '@/db/schema';
import { aiStream } from '@/lib/ai/gateway';
import { buildMessages, buildSystemParts } from './context';
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
    // A typed message during a practice interview counts as a question to the interviewee.
    if (state.interview) ({ state } = await append({ workshopId: input.workshopId, actor: 'system', actorId: null, payload: { type: 'interview.question' } }, state));
  }

  const stageAtStart = state.stage;
  const sinceAi = await eventsSince(input.workshopId, state.aiSeenSeq);

  const suggestions: string[] = [];
  // The SDK runs a step's tool calls concurrently; events must land one at a time.
  let queue: Promise<unknown> = Promise.resolve();
  const emit = (payload: EventPayload) => {
    const next = queue.then(async () => {
      ({ state } = await append({ workshopId: input.workshopId, actor: 'ai', actorId: 'facilitate', payload }, state));
    });
    queue = next.catch(() => undefined);
    return next;
  };
  const tools = facilitatorTools({ getState: () => state, emit, suggestions });

  const { stable, volatile } = buildSystemParts(state);
  // The stable prefix carries a cache marker (honoured by Anthropic models,
  // ignored by others); the state description follows it uncached.
  const messages = [
    { role: 'system' as const, content: stable, providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
    { role: 'system' as const, content: volatile },
    ...buildMessages(state, sinceAi, { trigger: input.trigger }),
  ];

  const result = aiStream(
    { job: 'facilitate', workshopId: input.workshopId, userId: input.userId, model: input.model },
    {
      messages,
      tools,
      maxOutputTokens: 2500,
      stopWhen: FACILITATE_STOP,
    },
  );

  // Record the reply once the whole multi-step run has finished. A turn may
  // speak in more than one step (text beside a tool call, then more text), so
  // join every step's text rather than keeping only the last.
  const finished = result.steps.then(async (steps) => {
    const clean = joinStepText(steps.map((s) => s.text));
    if (!clean || clean === '(quiet)') {
      // Mark the canvas changes as seen even when the AI chose silence.
      ({ state } = await append({ workshopId: input.workshopId, actor: 'ai', actorId: 'facilitate', payload: { type: 'ai.seen', seq: state.seq } }, state));
      return null;
    }
    ({ state } = await append(
      { workshopId: input.workshopId, actor: 'ai', actorId: 'facilitate', payload: { type: 'chat.ai', text: clean, suggestions: suggestions.length ? [...suggestions] : undefined, stage: stageAtStart } },
      state,
    ));
    return state;
  });

  return { result, finished, getState: () => state };
}


/**
 * A turn may speak in more than one step. The last step's text is the
 * model's final answer (some models restate or rewrite step-one text after
 * the tool results come back), so it wins; earlier text is kept only when
 * the last step said nothing.
 */
export function joinStepText(texts: string[]): string {
  const trimmed = texts.map((t) => t.trim());
  const last = trimmed[trimmed.length - 1];
  if (last) return last;
  return trimmed.filter(Boolean).join('\n\n');
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
