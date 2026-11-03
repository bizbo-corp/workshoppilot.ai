import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';
import type { LanguageModelV3CallOptions, LanguageModelV3StreamPart, LanguageModelV3Usage } from '@ai-sdk/provider';

/**
 * A scripted facilitator for tests. No network, same answers every run.
 *
 * It reads the state description the real context builder writes into the
 * system prompt and behaves like a well-trained model would:
 * - first step of a turn: fill every required field that is NOT SET, seed
 *   an empty board, set the idea type if unknown; if the user said "yes"
 *   and everything is set, complete the stage
 * - after tool results: say one line and ask one question
 *
 * Enabled with AI_FAKE=true (never on Vercel) so Playwright drives the real
 * app end to end without a model.
 */
export function isFakeAiEnabled(): boolean {
  return process.env.AI_FAKE === 'true' && !process.env.VERCEL_ENV;
}

const USAGE: LanguageModelV3Usage = {
  inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 20, text: 20, reasoning: 0 },
};

interface Plan {
  missingFields: string[];
  emptyBoards: string[];
  ideaTypeUnknown: boolean;
  stageDone: boolean;
  stageLabel: string;
  userSaidYes: boolean;
  hadToolResults: boolean;
  trigger: 'chat' | 'canvas' | 'greeting';
}

function readPlan(options: LanguageModelV3CallOptions): Plan {
  const system = options.prompt.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const stateBlock = system.slice(system.indexOf('# Workshop state'));
  const missingFields = [...stateBlock.matchAll(/^- .+ \((\w+), required\): NOT SET/gm)].map((m) => m[1]);
  const emptyBoards = [...stateBlock.matchAll(/^## .+ \((\w+)\)\nEmpty\./gm)].map((m) => m[1]);
  const stageLabel = stateBlock.match(/## This stage: (\w+)/)?.[1] ?? 'Stage';
  const last = [...options.prompt].reverse().find((m) => m.role === 'user');
  const lastText = last ? JSON.stringify(last.content) : '';
  const hadToolResults = options.prompt.some((m) => m.role === 'tool');
  return {
    missingFields,
    emptyBoards,
    ideaTypeUnknown: system.includes('# Idea type: not yet known'),
    stageDone: stateBlock.includes('All required fields are set'),
    stageLabel,
    userSaidYes: /\b(yes|happy|agreed|go ahead|looks good)\b/i.test(lastText),
    hadToolResults,
    trigger: lastText.includes('[The user has just opened') ? 'greeting' : lastText.includes('working on the board') ? 'canvas' : 'chat',
  };
}

const CANNED: Record<string, string> = {
  challenge: 'How might we help solo mobile groomers never lose a job to a missed call?',
  audience: 'Solo mobile dog groomers',
  why_now: 'Every missed call is about $90 gone and a customer lost to a rival.',
  key_insight: 'Groomers do not want to answer calls; they want the booking to happen without them.',
  evidence_summary: 'Two groomers interviewed by the user said they ignore the phone mid-groom. The rest is the user\'s own belief.',
  persona: 'Jess, 34, solo mobile groomer, eight dogs a day, phone on silent in the van.',
  dip: 'The 7pm call-back when the slot has already gone to someone else.',
  hmw: 'Given that Jess cannot answer mid-groom, how might we help her secure the booking without touching her phone, so she can grow without burning out?',
  concept_name: 'Booked While You Groom',
  concept_pitch: 'For solo groomers, a text-back and self-booking link that fills the slot while they work, so no job is lost to a missed call.',
  assumption: 'Customers who call and get a text with a booking link will book within the hour rather than ring the next groomer.',
  test_plan: 'Forward missed calls to an SMS with a booking link for two weeks. Metric: bookings per missed call. Target: 40%. Kill: under 10%. By 30 November.',
};

const BOARD_SEED: Record<string, { zone: string; text: string }> = {
  stakeholder_rings: { zone: 'core', text: 'Solo mobile groomers' },
  empathy_map: { zone: 'pains', text: 'Calls go to voicemail mid-groom' },
  journey_strip: { zone: 'm1', text: 'Customer rings while Jess is grooming; it goes to voicemail' },
  idea_board: { zone: 's1', text: 'Auto text-back with a booking link' },
  concept_card: { zone: 'name', text: 'Booked While You Groom' },
  test_card: { zone: 'assumption', text: 'Callers will book from a text link within the hour' },
};

function toolCall(id: string, toolName: string, input: unknown): LanguageModelV3StreamPart {
  return { type: 'tool-call', toolCallId: id, toolName, input: JSON.stringify(input) };
}

function text(t: string): LanguageModelV3StreamPart[] {
  return [
    { type: 'text-start', id: 't1' },
    { type: 'text-delta', id: 't1', delta: t },
    { type: 'text-end', id: 't1' },
  ];
}

export function createFakeFacilitator(): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    modelId: 'fake/facilitator',
    doStream: async (options) => {
      const plan = readPlan(options);
      const parts: LanguageModelV3StreamPart[] = [{ type: 'stream-start', warnings: [] }];
      let n = 0;
      const call = (name: string, input: unknown) => parts.push(toolCall(`c${++n}`, name, input));

      // Step one of a turn: tools only. Step two (after tool results): text only.
      if (!plan.hadToolResults) {
        if (plan.trigger === 'canvas') {
          parts.push(...text('(quiet)'));
        } else {
          if (plan.trigger === 'chat') {
            if (plan.ideaTypeUnknown) call('set_idea_type', { ideaType: 'digital_product', confidence: 0.8 });
            for (const f of plan.missingFields) if (CANNED[f]) call('set_field', { field: f, value: CANNED[f] });
            for (const b of plan.emptyBoards) if (BOARD_SEED[b]) call('add_board_item', { board: b, ...BOARD_SEED[b] });
            if (plan.stageDone && plan.userSaidYes) call('complete_stage', { summary: `${plan.stageLabel} done: the fields above were agreed with the user.` });
          }
          call('suggest_replies', { replies: plan.trigger === 'greeting' ? ['Yes, go ahead', 'Tell me more'] : ['Yes, happy with that', 'Change it'] });
          parts.push({ type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: USAGE });
          return { stream: convertArrayToReadableStream(parts) };
        }
      } else {
        const ran = new Set(
          options.prompt
            .filter((m) => m.role === 'tool')
            .flatMap((m) => m.content.map((c) => ('toolName' in c ? c.toolName : '')))
        );
        if (plan.trigger === 'greeting') parts.push(...text(`Welcome to ${plan.stageLabel}. Shall we start?`));
        else if (ran.has('complete_stage')) parts.push(...text(`${plan.stageLabel} is done. On to the next stage.`));
        else if (ran.has('set_field')) parts.push(...text('Drafted. Happy with that, or change something?'));
        else parts.push(...text('Noted. What else?'));
      }
      parts.push({ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE });
      return { stream: convertArrayToReadableStream(parts) };
    },
  });
}
