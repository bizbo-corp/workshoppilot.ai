import { and, asc, eq, gt } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, workshopEvents, type Workshop } from '@/db/schema';
import { initialState, type EngineEvent, type EventPayload, type WorkshopState } from './types';
import { reduce, replay } from './reducer';

/**
 * Persistence for the event log and its projection.
 *
 * append() writes an event with the next seq and folds it into
 * workshops.state in the same call. Two writers racing for the same seq hit
 * the unique index; the loser retries once with a fresh seq, so the log
 * stays gap-free and in order.
 */

function rowToEvent(row: typeof workshopEvents.$inferSelect): EngineEvent {
  return {
    seq: row.seq,
    actor: row.actor,
    actorId: row.actorId,
    payload: { ...(row.payload as object), type: row.type } as EventPayload,
    createdAt: row.createdAt,
  };
}

export async function loadWorkshop(workshopId: string): Promise<{ workshop: Workshop; state: WorkshopState } | null> {
  const [workshop] = await db.select().from(workshops).where(eq(workshops.id, workshopId)).limit(1);
  if (!workshop) return null;

  // Fold any events newer than the stored projection (a crash between the
  // event insert and the state update leaves at most a few).
  let state = (Object.keys(workshop.state).length ? (workshop.state as unknown as WorkshopState) : initialState(workshop.idea));
  const newer = await db
    .select()
    .from(workshopEvents)
    .where(and(eq(workshopEvents.workshopId, workshopId), gt(workshopEvents.seq, workshop.stateSeq)))
    .orderBy(asc(workshopEvents.seq));
  if (newer.length) state = replay(newer.map(rowToEvent), state);
  return { workshop, state };
}

/** Rebuild the projection from the whole log; used by tests and repairs. */
export async function rebuildState(workshopId: string): Promise<WorkshopState> {
  const rows = await db
    .select()
    .from(workshopEvents)
    .where(eq(workshopEvents.workshopId, workshopId))
    .orderBy(asc(workshopEvents.seq));
  const state = replay(rows.map(rowToEvent));
  await db.update(workshops).set({ state: state as unknown as Record<string, unknown>, stateSeq: state.seq, stage: state.stage, ideaType: state.ideaType, updatedAt: new Date() }).where(eq(workshops.id, workshopId));
  return state;
}

export interface AppendInput {
  workshopId: string;
  actor: EngineEvent['actor'];
  actorId?: string | null;
  payload: EventPayload;
}

/** Append one event and update the projection. Returns the new state. */
export async function append(input: AppendInput, current?: WorkshopState): Promise<{ state: WorkshopState; event: EngineEvent }> {
  const base = current ?? (await loadWorkshop(input.workshopId))?.state;
  if (!base) throw new Error(`Workshop ${input.workshopId} not found`);

  const { type, ...rest } = input.payload;
  for (let attempt = 0; attempt < 2; attempt++) {
    const seq = base.seq + 1 + attempt;
    try {
      const [row] = await db
        .insert(workshopEvents)
        .values({ workshopId: input.workshopId, seq, actor: input.actor, actorId: input.actorId ?? null, type, payload: rest as Record<string, unknown> })
        .returning();
      const event = rowToEvent(row);
      const state = reduce(base, event);
      await db
        .update(workshops)
        .set({ state: state as unknown as Record<string, unknown>, stateSeq: state.seq, stage: state.stage, ideaType: state.ideaType, updatedAt: new Date(), completedAt: state.completedStages.includes('deliver') ? new Date() : null })
        .where(eq(workshops.id, input.workshopId));
      return { state, event };
    } catch (err) {
      if (attempt === 0 && isUniqueViolation(err)) {
        // Someone else wrote this seq. Reload and retry once.
        const fresh = await loadWorkshop(input.workshopId);
        if (fresh) return append(input, fresh.state);
      }
      throw err;
    }
  }
  throw new Error('unreachable');
}

/** Append several events in order, each seeing the previous one's state. */
export async function appendAll(workshopId: string, actor: EngineEvent['actor'], actorId: string | null, payloads: EventPayload[], current?: WorkshopState) {
  let state = current;
  for (const payload of payloads) {
    ({ state } = await append({ workshopId, actor, actorId, payload }, state));
  }
  return state!;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505';
}
