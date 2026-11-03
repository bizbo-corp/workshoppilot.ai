import type { StageId, IdeaType } from './ids';

export type { StageId, IdeaType };

/** Boards the stages can show. Each has fixed zones; items sit in a zone. */
export const BOARD_IDS = [
  'stakeholder_rings',
  'interviewees',
  'insights',
  'empathy_map',
  'persona_card',
  'journey_strip',
  'idea_board',
  'concept_card',
  'test_card',
] as const;
export type BoardId = (typeof BOARD_IDS)[number];

export interface BoardItem {
  id: string;
  board: BoardId;
  zone: string;
  text: string;
  /** 'user' or 'ai' */
  createdBy: 'user' | 'ai';
  /** Optional image for sketch uploads on the idea board. */
  imageUrl?: string;
  /** Optional free-form extras (votes, colour). */
  meta?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  /** One-tap replies the AI offered with this message. */
  suggestions?: string[];
  seq: number;
}

/**
 * The projection of the event log that the UI and the AI both read.
 * `fields` are keyed "stage.field"; `boards` hold the items per board.
 */
export interface WorkshopState {
  idea: string;
  stage: StageId;
  /** The activity in focus within the stage; null means the stage's first. */
  activity: string | null;
  /** A practice interview in progress: which interviewee item, and how many questions asked. */
  interview: { itemId: string; name: string; questions: number } | null;
  ideaType: IdeaType | null;
  ideaTypeConfidence: number | null;
  fields: Record<string, string>;
  boards: Record<BoardId, BoardItem[]>;
  messages: ChatMessage[];
  stageSummaries: Partial<Record<StageId, string>>;
  completedStages: StageId[];
  /** seq of the last event the AI produced or saw; canvas changes after it are "news". */
  aiSeenSeq: number;
  /** seq at which the current stage was entered. */
  stageEnteredSeq: number;
  /** Stage the AI was facilitating when it last spoke; it greets when this differs from `stage`. */
  lastAiStage: StageId | null;
  seq: number;
}

/** Typed event payloads. The `type` string is what lands in workshop_events.type. */
export type EventPayload =
  | { type: 'workshop.created'; idea: string }
  | { type: 'chat.user'; text: string }
  | { type: 'chat.ai'; text: string; suggestions?: string[]; stage?: StageId }
  | { type: 'field.set'; stage: StageId; field: string; value: string }
  | { type: 'field.cleared'; stage: StageId; field: string }
  | { type: 'board.item_added'; item: BoardItem }
  | { type: 'board.item_updated'; id: string; patch: Partial<Pick<BoardItem, 'text' | 'zone' | 'meta' | 'imageUrl'>> }
  | { type: 'board.item_removed'; id: string }
  | { type: 'idea_type.set'; ideaType: IdeaType; confidence: number; source: 'ai' | 'user' }
  | { type: 'stage.completed'; stage: StageId; summary: string }
  | { type: 'stage.entered'; stage: StageId }
  | { type: 'activity.entered'; stage: StageId; activity: string }
  | { type: 'interview.started'; itemId: string; name: string }
  | { type: 'interview.question' }
  | { type: 'interview.ended' }
  | { type: 'ai.seen'; seq: number };

export type EventType = EventPayload['type'];

export interface EngineEvent {
  seq: number;
  actor: 'user' | 'ai' | 'system';
  actorId: string | null;
  payload: EventPayload;
  createdAt: Date;
}

export function emptyBoards(): Record<BoardId, BoardItem[]> {
  return {
    stakeholder_rings: [],
    interviewees: [],
    insights: [],
    empathy_map: [],
    persona_card: [],
    journey_strip: [],
    idea_board: [],
    concept_card: [],
    test_card: [],
  };
}

export function initialState(idea = ''): WorkshopState {
  return {
    idea,
    stage: 'setup',
    activity: null,
    interview: null,
    ideaType: null,
    ideaTypeConfidence: null,
    fields: {},
    boards: emptyBoards(),
    messages: [],
    stageSummaries: {},
    completedStages: [],
    aiSeenSeq: 0,
    stageEnteredSeq: 0,
    lastAiStage: null,
    seq: 0,
  };
}
