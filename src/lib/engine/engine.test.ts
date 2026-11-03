import { describe, it, expect } from 'vitest';
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';
import type { LanguageModelV3StreamPart, LanguageModelV3Usage } from '@ai-sdk/provider';
import { streamText } from 'ai';
import { initialState, type EventPayload, type WorkshopState } from './types';
import { reduce, replay } from './reducer';
import { facilitatorTools } from './tools';
import { buildSystemPrompt, buildMessages, describeCanvasChanges } from './context';
import { isStageDone, missingFields, STAGES, STAGE_ORDER } from './stages';
import { getLens, IDEA_TYPE_LABELS } from './lenses';
import { BOARDS } from './boards';
import { FACILITATE_STOP, joinStepText } from './facilitate';
import { IDEA_TYPES } from '@/lib/engine/ids';

/** In-memory engine: tools emit, reducer folds. */
function harness(state: WorkshopState = initialState('A booking app for mobile dog groomers')) {
  let s = state;
  const log: EventPayload[] = [];
  const suggestions: string[] = [];
  const tools = facilitatorTools({
    getState: () => s,
    emit: async (payload) => {
      log.push(payload);
      s = reduce(s, { seq: s.seq + 1, actor: 'ai', actorId: 'test', payload, createdAt: new Date() });
    },
    suggestions,
  });
  return { tools, log, suggestions, get state() { return s; } };
}

const opts = { toolCallId: 'c1', messages: [] as never[] };
const USAGE: LanguageModelV3Usage = { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 5, text: 5, reasoning: 0 } };

describe('reducer', () => {
  it('replays a log into state', () => {
    const s = replay([
      { seq: 1, actor: 'user', actorId: 'u', createdAt: new Date(), payload: { type: 'workshop.created', idea: 'x' } },
      { seq: 2, actor: 'user', actorId: 'u', createdAt: new Date(), payload: { type: 'chat.user', text: 'hi' } },
      { seq: 3, actor: 'ai', actorId: 'f', createdAt: new Date(), payload: { type: 'chat.ai', text: 'hello', suggestions: ['a', 'b'] } },
      { seq: 4, actor: 'ai', actorId: 'f', createdAt: new Date(), payload: { type: 'field.set', stage: 'setup', field: 'challenge', value: 'How might we…' } },
    ]);
    expect(s.idea).toBe('x');
    expect(s.messages).toHaveLength(2);
    expect(s.messages[1].suggestions).toEqual(['a', 'b']);
    expect(s.fields['setup.challenge']).toBe('How might we…');
    expect(s.aiSeenSeq).toBe(3);
    expect(s.seq).toBe(4);
  });

  it('ignores a duplicate board item id and unknown event types', () => {
    const item = { id: 'i1', board: 'empathy_map' as const, zone: 'pains', text: 'slow', createdBy: 'user' as const };
    let s = reduce(initialState(), { seq: 1, actor: 'user', actorId: null, createdAt: new Date(), payload: { type: 'board.item_added', item } });
    s = reduce(s, { seq: 2, actor: 'user', actorId: null, createdAt: new Date(), payload: { type: 'board.item_added', item } });
    s = reduce(s, { seq: 3, actor: 'user', actorId: null, createdAt: new Date(), payload: { type: 'mystery' } as unknown as EventPayload });
    expect(s.boards.empathy_map).toHaveLength(1);
    expect(s.seq).toBe(3);
  });
});

describe('stages and lenses', () => {
  it('every idea type has a lens and a label', () => {
    for (const t of IDEA_TYPES) {
      expect(getLens(t)).toBeTruthy();
      expect(IDEA_TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it('every stage board exists and every stage has a required field', () => {
    for (const id of STAGE_ORDER) {
      for (const b of STAGES[id].boards) expect(BOARDS[b]).toBeDefined();
      expect(STAGES[id].fields.some((f) => f.required)).toBe(true);
    }
  });
});

describe('facilitator tools', () => {
  it('refuses to complete a stage until required fields are set', async () => {
    const h = harness();
    const r1 = await h.tools.complete_stage.execute!({ summary: 'We sharpened the idea into a challenge about dog groomers losing jobs.' }, opts);
    expect(r1).toMatchObject({ ok: false });
    expect(missingFields(h.state).map((f) => f.id)).toEqual(['challenge', 'audience']);

    await h.tools.set_field.execute!({ field: 'challenge', value: 'How might we help mobile groomers never lose a job to a missed call?' }, opts);
    await h.tools.set_field.execute!({ field: 'audience', value: 'Solo mobile dog groomers' }, opts);
    expect(isStageDone(h.state)).toBe(true);

    const r2 = await h.tools.complete_stage.execute!({ summary: 'Challenge: never lose a job to a missed call. Audience: solo mobile groomers.' }, opts);
    expect(r2).toMatchObject({ ok: true, next: 'discover' });
    expect(h.state.stage).toBe('discover');
    expect(h.state.completedStages).toEqual(['setup']);
    expect(h.state.stageSummaries.setup).toContain('missed call');
  });

  it('rejects unknown fields, wrong-stage boards and unknown zones', async () => {
    const h = harness();
    expect(await h.tools.set_field.execute!({ field: 'nope', value: 'x' }, opts)).toMatchObject({ ok: false });
    expect(await h.tools.add_board_item.execute!({ board: 'empathy_map', zone: 'pains', text: 'x' }, opts)).toMatchObject({ ok: false });
    const s = reduce(h.state, { seq: 99, actor: 'ai', actorId: null, createdAt: new Date(), payload: { type: 'stage.entered', stage: 'discover' } });
    const h2 = harness(s);
    expect(await h2.tools.add_board_item.execute!({ board: 'empathy_map', zone: 'nowhere', text: 'x' }, opts)).toMatchObject({ ok: false });
    const ok = await h2.tools.add_board_item.execute!({ board: 'empathy_map', zone: 'pains', text: 'Calls go to voicemail mid-groom' }, opts);
    expect(ok).toMatchObject({ ok: true });
    expect(h2.state.boards.empathy_map[0].createdBy).toBe('ai');
  });

  it('dedupes identical items in a zone and caps the zone', async () => {
    const s = reduce(initialState(), { seq: 1, actor: 'ai', actorId: null, createdAt: new Date(), payload: { type: 'stage.entered', stage: 'discover' } });
    const h = harness(s);
    const a = await h.tools.add_board_item.execute!({ board: 'stakeholder_rings', zone: 'core', text: 'Groomer' }, opts);
    const b = await h.tools.add_board_item.execute!({ board: 'stakeholder_rings', zone: 'core', text: 'groomer ' }, opts);
    expect((b as { id: string }).id).toBe((a as { id: string }).id);
    for (let i = 0; i < 10; i++) await h.tools.add_board_item.execute!({ board: 'stakeholder_rings', zone: 'core', text: `Person ${i}` }, opts);
    expect(h.state.boards.stakeholder_rings.filter((i) => i.zone === 'core')).toHaveLength(BOARDS.stakeholder_rings.maxPerZone);
  });

  it('collects suggested replies', async () => {
    const h = harness();
    await h.tools.suggest_replies.execute!({ replies: ['Yes', 'Not quite'] }, opts);
    expect(h.suggestions).toEqual(['Yes', 'Not quite']);
  });
});

describe('context', () => {
  it('puts the stable parts first and the state last', () => {
    const sys = buildSystemPrompt(initialState('x'));
    expect(sys.indexOf('sharp consultant')).toBeLessThan(sys.indexOf('# Current stage'));
    expect(sys.indexOf('# Current stage')).toBeLessThan(sys.indexOf('# Workshop state'));
    expect(sys).toContain('NOT SET');
  });

  it('names the lens once the idea type is known', () => {
    const s = reduce(initialState('x'), { seq: 1, actor: 'ai', actorId: null, createdAt: new Date(), payload: { type: 'idea_type.set', ideaType: 'process_change', confidence: 0.8, source: 'ai' } });
    expect(buildSystemPrompt(s)).toContain('Process change');
  });

  it('tells the AI what the user did on the canvas since it last spoke', () => {
    const note = describeCanvasChanges([
      { seq: 5, actor: 'user', actorId: 'u', createdAt: new Date(), payload: { type: 'board.item_added', item: { id: 'i', board: 'empathy_map', zone: 'pains', text: 'No signal in rural areas', createdBy: 'user' } } },
      { seq: 6, actor: 'ai', actorId: 'f', createdAt: new Date(), payload: { type: 'board.item_added', item: { id: 'j', board: 'empathy_map', zone: 'gains', text: 'x', createdBy: 'ai' } } },
    ]);
    expect(note).toContain('No signal in rural areas');
    expect(note).not.toContain('gains');
    const msgs = buildMessages(initialState('x'), [], { trigger: 'greeting' });
    expect(msgs[0].role).toBe('user');
  });
});

describe('a full facilitator turn with a mock model', () => {
  it('calls a tool then speaks, and the state reflects both', async () => {
    const h = harness(reduce(initialState('A booking app for mobile dog groomers'), { seq: 1, actor: 'user', actorId: 'u', createdAt: new Date(), payload: { type: 'chat.user', text: 'Groomers miss calls while working and lose the job.' } }));
    const model = new MockLanguageModelV3({
      doStream: async ({ prompt }) => {
        const sawToolResult = JSON.stringify(prompt).includes('"tool-result"');
        const parts: LanguageModelV3StreamPart[] = sawToolResult
          ? [
              { type: 'text-start' as const, id: 't' },
              { type: 'text-delta' as const, id: 't', delta: 'Drafted the challenge. What would you change?' },
              { type: 'text-end' as const, id: 't' },
              { type: 'finish' as const, finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
            ]
          : [
              { type: 'tool-call' as const, toolCallId: 'c1', toolName: 'set_field', input: JSON.stringify({ field: 'challenge', value: 'How might we help groomers keep every booking?' }) },
              { type: 'finish' as const, finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: USAGE },
            ];
        return { stream: convertArrayToReadableStream<LanguageModelV3StreamPart>([{ type: 'stream-start', warnings: [] }, ...parts]) };
      },
    });
    const result = streamText({ model, system: buildSystemPrompt(h.state), messages: buildMessages(h.state, [], { trigger: 'chat' }), tools: h.tools, stopWhen: FACILITATE_STOP });
    const text = await result.text;
    expect(text).toContain('What would you change');
    expect(h.state.fields['setup.challenge']).toContain('groomers');
    expect(h.log.map((e) => e.type)).toEqual(['field.set']);
  });
});

describe('joinStepText', () => {
  it('keeps text from every step once', () => {
    expect(joinStepText(['Drafted it.', '', 'What would you change?'])).toBe('Drafted it.\n\nWhat would you change?');
  });
  it('drops a step that repeats an earlier one', () => {
    expect(joinStepText(['Good call. Owners matter.', 'Good call. Owners matter.'])).toBe('Good call. Owners matter.');
    expect(joinStepText(['Good call.', 'Good call. Owners matter too.'])).toBe('Good call. Owners matter too.');
  });
});
