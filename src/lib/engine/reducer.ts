import { initialState, type EngineEvent, type WorkshopState } from './types';
import { fieldKey } from './stages';

/** Keep this many chat messages in the projection; older ones live in the log. */
const MAX_MESSAGES = 60;

/**
 * Fold one event into the state. Pure: never mutates the input. Unknown
 * event types are ignored so an old log never breaks a new reducer.
 */
export function reduce(state: WorkshopState, event: EngineEvent): WorkshopState {
  const p = event.payload;
  const next: WorkshopState = { ...state, seq: event.seq };

  switch (p.type) {
    case 'workshop.created':
      return { ...next, idea: p.idea };

    case 'chat.user':
      return { ...next, messages: pushMessage(state.messages, { id: `m${event.seq}`, role: 'user', text: p.text, seq: event.seq }) };

    case 'chat.ai':
      return {
        ...next,
        aiSeenSeq: event.seq,
        messages: pushMessage(state.messages, { id: `m${event.seq}`, role: 'ai', text: p.text, suggestions: p.suggestions, seq: event.seq }),
      };

    case 'field.set':
      return { ...next, fields: { ...state.fields, [fieldKey(p.stage, p.field)]: p.value } };

    case 'field.cleared': {
      const fields = { ...state.fields };
      delete fields[fieldKey(p.stage, p.field)];
      return { ...next, fields };
    }

    case 'board.item_added': {
      const list = state.boards[p.item.board];
      if (list.some((i) => i.id === p.item.id)) return next;
      return { ...next, boards: { ...state.boards, [p.item.board]: [...list, p.item] } };
    }

    case 'board.item_updated': {
      const boards = { ...state.boards };
      for (const key of Object.keys(boards) as (keyof typeof boards)[]) {
        const idx = boards[key].findIndex((i) => i.id === p.id);
        if (idx >= 0) {
          const item = boards[key][idx];
          boards[key] = boards[key].map((i, n) =>
            n === idx ? { ...item, ...p.patch, meta: p.patch.meta ? { ...item.meta, ...p.patch.meta } : item.meta } : i,
          );
          return { ...next, boards };
        }
      }
      return next;
    }

    case 'board.item_removed': {
      const boards = { ...state.boards };
      for (const key of Object.keys(boards) as (keyof typeof boards)[]) {
        if (boards[key].some((i) => i.id === p.id)) {
          boards[key] = boards[key].filter((i) => i.id !== p.id);
          return { ...next, boards };
        }
      }
      return next;
    }

    case 'idea_type.set':
      return { ...next, ideaType: p.ideaType, ideaTypeConfidence: p.source === 'user' ? 1 : p.confidence };

    case 'stage.completed':
      return {
        ...next,
        stageSummaries: { ...state.stageSummaries, [p.stage]: p.summary },
        completedStages: state.completedStages.includes(p.stage) ? state.completedStages : [...state.completedStages, p.stage],
      };

    case 'stage.entered':
      return { ...next, stage: p.stage, stageEnteredSeq: event.seq };

    case 'ai.seen':
      return { ...next, aiSeenSeq: p.seq };

    default:
      return next;
  }
}

export function replay(events: EngineEvent[], seed: WorkshopState = initialState()): WorkshopState {
  return events.reduce(reduce, seed);
}

function pushMessage(list: WorkshopState['messages'], m: WorkshopState['messages'][number]) {
  const out = [...list, m];
  return out.length > MAX_MESSAGES ? out.slice(out.length - MAX_MESSAGES) : out;
}
