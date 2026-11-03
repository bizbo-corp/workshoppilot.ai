import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { testRuns, users, workshops, workshopMembers, workshopEvents } from '@/db/schema';
import { aiObject } from '@/lib/ai/gateway';
import { BOARDS } from '@/lib/engine/boards';
import { IDEA_TYPES } from '@/lib/engine/ids';
import { facilitate } from '@/lib/engine/facilitate';
import { append, loadWorkshop } from '@/lib/engine/store';
import { STAGES, STAGE_ORDER, missingFields } from '@/lib/engine/stages';
import { createPrefixedId } from '@/lib/ids';
import type { BoardId, WorkshopState } from '@/lib/engine/types';

/**
 * Random dummy workshops: a generated scenario, a simulated user with a
 * behaviour, the real facilitator and real models. Seeded, so a failing
 * run can be replayed; judged, so a bad reply is a failure not a vibe.
 */

export const scenarioSchema = z.object({
  idea: z.string().describe('One or two sentences, the way a real person types it: specific, a little messy.'),
  ideaType: z.enum(IDEA_TYPES),
  sector: z.string(),
  persona: z.object({ name: z.string(), role: z.string(), voice: z.string().describe('How they write: terse, chatty, hedging, confident…') }),
  behaviour: z.enum(['chat_only', 'canvas_heavy', 'terse', 'rambling', 'off_topic_once', 'changes_mind', 'switches_type']),
  evidence: z.string().describe('What real evidence this person actually has, if any. Often none.'),
});
export type Scenario = z.infer<typeof scenarioSchema>;

const BEHAVIOUR_NOTES: Record<Scenario['behaviour'], string> = {
  chat_only: 'You only ever type in the chat.',
  canvas_heavy: 'Whenever the facilitator mentions a board, you prefer to add two or three items to it yourself (use the add_item tool) and say little.',
  terse: 'Replies under 15 words. Never volunteer.',
  rambling: 'Replies of 80 to 150 words with tangents about your week.',
  off_topic_once: 'Exactly once, around your fourth turn, ask something unrelated (the weather, a joke). Then carry on.',
  changes_mind: 'Around your fifth turn, change who the idea is for and say so plainly.',
  switches_type: 'Around your fourth turn, reveal the idea is really a service or a process, not an app, and insist.',
};

/** Deterministic-ish PRNG so the same seed asks the model for the same scenario shape. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export async function generateScenario(seed: string): Promise<Scenario> {
  const rnd = mulberry32(hashSeed(seed));
  const ideaType = IDEA_TYPES[Math.floor(rnd() * 4)]; // the four primary lenses
  const behaviours = Object.keys(BEHAVIOUR_NOTES) as Scenario['behaviour'][];
  const behaviour = behaviours[Math.floor(rnd() * behaviours.length)];
  const sectors = ['vet clinics', 'mobile trades', 'school admin', 'small cafes', 'physiotherapy', 'community sports clubs', 'freight dispatch', 'wedding planning', 'allotment societies', 'B2B accounting'];
  const sector = sectors[Math.floor(rnd() * sectors.length)];
  return aiObject(
    { job: 'test_scenario' },
    {
      system: 'You invent realistic people with half-formed ideas for a design-thinking workshop. Vary the writing voice. Most people have no real evidence yet; a few have one or two conversations.',
      schema: scenarioSchema,
      messages: [{ role: 'user', content: `Seed ${seed}. Idea type: ${ideaType}. Sector: ${sector}. Behaviour: ${behaviour}. Invent the person and their idea.` }],
    },
  );
}

const userTurnSchema = z.object({
  action: z.enum(['say', 'add_item', 'finish']),
  text: z.string().describe('What you say, or the item text'),
  board: z.string().optional(),
  zone: z.string().optional(),
});

async function ensureRunnerUser(): Promise<string> {
  const clerkUserId = 'user_dummy_runner';
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(users).values({ clerkUserId, email: 'dummy@workshoppilot.local', name: 'Dummy runner' }).returning({ id: users.id });
  return created.id;
}

export interface RunReport {
  pass: boolean;
  summary: string;
  stagesCompleted: string[];
  turns: number;
  ideaTypeMatched: boolean;
  lowReplies: { turn: string; reply: string; note: string }[];
  costCents: number;
  errors: string[];
}

const judgeSchema = z.object({
  relevance: z.number().min(1).max(5),
  evidence: z.number().min(1).max(5),
  note: z.string(),
});

export async function runDummyWorkshop(opts: { seed?: string; triggeredBy?: string; maxTurns?: number } = {}): Promise<{ runId: string; seed: string; report: RunReport; workshopId: string }> {
  const seed = opts.seed ?? createPrefixedId('seed').slice(5, 13);
  const maxTurns = opts.maxTurns ?? 24;
  const [run] = await db.insert(testRuns).values({ seed, status: 'running', triggeredBy: opts.triggeredBy ?? 'nightly' }).returning({ id: testRuns.id });
  const errors: string[] = [];
  const lowReplies: RunReport['lowReplies'] = [];
  let workshopId = '';
  let turns = 0;
  let costCents = 0;

  try {
    const scenario = await generateScenario(seed);
    await db.update(testRuns).set({ scenario }).where(eq(testRuns.id, run.id));

    const userId = await ensureRunnerUser();
    const [w] = await db.insert(workshops).values({ ownerId: userId, title: scenario.idea.slice(0, 60), idea: scenario.idea, testRunId: run.id }).returning();
    workshopId = w.id;
    await db.insert(workshopMembers).values({ workshopId, userId, role: 'owner' });
    await db.insert(workshopEvents).values({ workshopId, seq: 1, actor: 'user', actorId: userId, type: 'workshop.created', payload: { idea: scenario.idea } });

    const turn = async (trigger: 'chat' | 'canvas' | 'greeting', text?: string) => {
      const { result, finished } = await facilitate({ workshopId, userId, trigger, text });
      for await (const _ of result.textStream) void _;
      const state = await finished;
      return state ? state.messages[state.messages.length - 1]?.text ?? '' : '(quiet)';
    };

    const userSystem = `You are ${scenario.persona.name}, ${scenario.persona.role} in ${scenario.sector}. You brought this idea to an AI-facilitated workshop: "${scenario.idea}". Voice: ${scenario.persona.voice}. ${BEHAVIOUR_NOTES[scenario.behaviour]} Real evidence you have: ${scenario.evidence}. Never invent evidence you do not have; if asked, admit it. When the facilitator shows a draft you broadly agree with, say so plainly ("yes, happy with that"). Board items are short, under 150 characters. Reply with one action.`;

    let lastReply = await turn('greeting');
    const transcript: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'assistant', content: lastReply }];

    while (turns < maxTurns) {
      const loaded = await loadWorkshop(workshopId);
      if (!loaded) break;
      const state = loaded.state;
      if (state.completedStages.includes('deliver')) break;

      // Simulated user decides what to do.
      const stage = STAGES[state.stage];
      const boardsHint = stage.boards.length ? `Boards open now: ${stage.boards.join(', ')} (zones: ${stage.boards.map((b) => `${b}=${zoneIds(b).join('/')}`).join('; ')}).` : 'No boards in this stage.';
      const u = await aiObject(
        { job: 'test_user', workshopId, userId },
        { system: userSystem, schema: userTurnSchema, messages: [...transcript.slice(-10), { role: 'user', content: `[Stage: ${stage.label}. ${boardsHint} Respond to the facilitator's last message.]` }] },
      );
      turns++;

      if (u.action === 'finish') break;
      if (u.action === 'add_item' && u.board && u.zone && stage.boards.includes(u.board as BoardId) && zoneIds(u.board as BoardId).includes(u.zone)) {
        const item = { id: createPrefixedId('itm'), board: u.board as BoardId, zone: u.zone, text: u.text.slice(0, 300), createdBy: 'user' as const };
        await append({ workshopId, actor: 'user', actorId: userId, payload: { type: 'board.item_added', item } }, state);
        lastReply = await turn('canvas');
        transcript.push({ role: 'user', content: `[added to ${u.board}/${u.zone}: ${u.text}]` });
      } else {
        lastReply = await turn('chat', u.text);
        transcript.push({ role: 'user', content: u.text });
      }
      if (lastReply !== '(quiet)') transcript.push({ role: 'assistant', content: lastReply });

      // Greeting when a stage just completed.
      const after = await loadWorkshop(workshopId);
      if (after && after.state.lastAiStage !== after.state.stage) {
        lastReply = await turn('greeting');
        transcript.push({ role: 'assistant', content: lastReply });
      }

      // Judge the reply.
      if (lastReply && lastReply !== '(quiet)') {
        const j = await aiObject(
          { job: 'eval_judge', workshopId, userId },
          {
            system: 'Score one facilitator reply, 1 to 5. relevance: does it respond specifically to what the user just said or did? evidence: does it credit only evidence the user actually has, naming beliefs as beliefs? One-line note on the biggest problem or "fine".',
            schema: judgeSchema,
            messages: [{ role: 'user', content: `The idea as typed: ${scenario.idea}\n\nEverything the user has said so far:\n${transcript.filter((t) => t.role === 'user').map((t) => `- ${t.content}`).join('\n') || '- (nothing yet)'}\n\nUser (${scenario.behaviour}, real evidence they have: ${scenario.evidence}) just said: ${transcript.filter((t) => t.role === 'user').slice(-1)[0]?.content ?? '[opened]'}\n\nFacilitator: ${lastReply}` }],
          },
        );
        if (j.relevance < 3 || j.evidence < 3) lowReplies.push({ turn: transcript.filter((t) => t.role === 'user').slice(-1)[0]?.content ?? '[opened]', reply: lastReply, note: j.note });
      }
    }

    const final = await loadWorkshop(workshopId);
    const state: WorkshopState | undefined = final?.state;
    const [{ cost }] = (await db.execute(sql`select coalesce(sum(cost_cents),0)::float as cost from v2.ai_calls where workshop_id = ${workshopId}`)).rows as { cost: number }[];
    costCents = cost;

    const stagesCompleted = state?.completedStages ?? [];
    const ideaTypeMatched = !state?.ideaType || state.ideaType === scenario.ideaType || scenario.behaviour === 'switches_type';
    const stuck = state && !stagesCompleted.includes('deliver') ? `stuck in ${state.stage}, missing ${missingFields(state).map((f) => f.id).join(', ') || 'nothing'}` : null;
    const pass = stagesCompleted.length >= 2 && lowReplies.length <= 1 && ideaTypeMatched && errors.length === 0;
    const summary = `${scenario.ideaType} / ${scenario.behaviour}: ${stagesCompleted.length}/${STAGE_ORDER.length} stages in ${turns} turns, ${lowReplies.length} weak replies, ${costCents.toFixed(1)}c${stuck ? `; ${stuck}` : ''}${ideaTypeMatched ? '' : `; type guessed ${state?.ideaType}`}`;
    const report: RunReport = { pass, summary, stagesCompleted, turns, ideaTypeMatched, lowReplies, costCents, errors };
    await db.update(testRuns).set({ status: pass ? 'passed' : 'failed', report: report as unknown as Record<string, unknown>, workshopId, finishedAt: new Date() }).where(eq(testRuns.id, run.id));
    return { runId: run.id, seed, report, workshopId };
  } catch (err) {
    errors.push(String(err));
    const report: RunReport = { pass: false, summary: `error: ${String(err).slice(0, 200)}`, stagesCompleted: [], turns, ideaTypeMatched: false, lowReplies, costCents, errors };
    await db.update(testRuns).set({ status: 'error', report: report as unknown as Record<string, unknown>, workshopId: workshopId || null, finishedAt: new Date() }).where(eq(testRuns.id, run.id));
    return { runId: run.id, seed, report, workshopId };
  }
}

function zoneIds(board: BoardId): string[] {
  return BOARDS[board].zones.map((z) => z.id);
}
