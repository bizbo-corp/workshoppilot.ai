/**
 * Prompt evals: run saved cases through the real facilitator and have a
 * judge score every reply. Spends real money (a few cents a case).
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/eval.ts            # all cases
 *   npx dotenv -e .env.local -- npx tsx scripts/eval.ts digital    # cases matching "digital"
 *
 * Each reply is scored 1 to 5 on four things, and a case fails if any
 * reply scores under 3 on relevance or evidence. Results land in
 * evals/results/<timestamp>.json and a one-line summary prints per case.
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client';
import { users, workshops, workshopMembers, workshopEvents } from '../src/db/schema';
import { aiObject } from '../src/lib/ai/gateway';
import { facilitate } from '../src/lib/engine/facilitate';
import { append, loadWorkshop } from '../src/lib/engine/store';
import { createPrefixedId } from '../src/lib/ids';
import { STAGES } from '../src/lib/engine/stages';
import type { BoardId } from '../src/lib/engine/types';

const caseSchema = z.object({
  id: z.string(),
  idea: z.string(),
  expectIdeaType: z.string().optional(),
  turns: z.array(
    z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('chat'), text: z.string() }),
      z.object({ kind: z.literal('canvas'), board: z.string(), zone: z.string(), text: z.string() }),
    ]),
  ),
});
type Case = z.infer<typeof caseSchema>;

const scoreSchema = z.object({
  relevance: z.number().min(1).max(5).describe('Does the reply respond to what the user just said or did, specifically?'),
  onGoal: z.number().min(1).max(5).describe('Does it move the current stage toward its goal, with one question at most?'),
  tone: z.number().min(1).max(5).describe('Sharp consultant: direct, short, no padding, no repeating the user back.'),
  evidence: z.number().min(1).max(5).describe('Credits only evidence the user actually gave; names beliefs as beliefs; never invents research.'),
  note: z.string().describe('One line: the single biggest problem, or "fine".'),
});

const JUDGE_SYSTEM = `You judge one reply from an AI workshop facilitator. You see the stage goal, what the user just did (a message, or a change on the board), and the reply. Score 1 to 5 on each dimension. Be strict: a 5 is what a top human facilitator would say. A reply that ignores a board change the user just made scores 1 on relevance. A reply that treats the user's belief as proven scores 1 on evidence.`;

async function ensureEvalUser(): Promise<string> {
  const clerkUserId = 'user_eval_runner';
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(users).values({ clerkUserId, email: 'eval@workshoppilot.local', name: 'Eval runner' }).returning({ id: users.id });
  return created.id;
}

async function runCase(c: Case, userId: string) {
  const [w] = await db.insert(workshops).values({ ownerId: userId, title: c.id, idea: c.idea, testRunId: 'eval' }).returning();
  await db.insert(workshopMembers).values({ workshopId: w.id, userId, role: 'owner' });
  await db.insert(workshopEvents).values({ workshopId: w.id, seq: 1, actor: 'user', actorId: userId, type: 'workshop.created', payload: { idea: c.idea } });

  const replies: { turn: string; stage: string; reply: string; scores?: z.infer<typeof scoreSchema> }[] = [];
  let costCents = 0;

  const turn = async (trigger: 'chat' | 'canvas' | 'greeting', text?: string, label = '') => {
    const { result, finished } = await facilitate({ workshopId: w.id, userId, trigger, text });
    // Consume the stream so tools run and the reply is recorded.
    for await (const _ of result.textStream) void _;
    const state = await finished;
    const reply = state ? state.messages[state.messages.length - 1]?.text ?? '' : '(quiet)';
    const usage = await result.totalUsage;
    costCents += ((usage.inputTokens ?? 0) * 0.1 + (usage.outputTokens ?? 0) * 0.5) / 10_000;
    const stage = state?.stage ?? 'setup';
    replies.push({ turn: label || text || trigger, stage, reply });
    return reply;
  };

  await turn('greeting', undefined, '[open]');
  for (const t of c.turns) {
    if (t.kind === 'chat') {
      await turn('chat', t.text);
    } else {
      const item = { id: createPrefixedId('itm'), board: t.board as BoardId, zone: t.zone, text: t.text, createdBy: 'user' as const };
      await append({ workshopId: w.id, actor: 'user', actorId: userId, payload: { type: 'board.item_added', item } });
      await turn('canvas', undefined, `[board] ${t.board}/${t.zone}: ${t.text}`);
    }
    // The app greets when a stage completes; do the same here, and judge the
    // hand-off and the greeting as one reply, which is how the user reads them.
    const after = await loadWorkshop(w.id);
    if (after && after.state.lastAiStage !== after.state.stage) {
      const handoff = replies.pop();
      await turn('greeting', undefined, `[open ${after.state.stage}]`);
      const greeting = replies.pop();
      if (handoff && greeting) replies.push({ turn: handoff.turn, stage: greeting.stage, reply: `${handoff.reply}\n\n${greeting.reply}` });
    }
  }

  // Judge every reply.
  for (const r of replies) {
    if (r.reply === '(quiet)') continue;
    r.scores = await aiObject(
      { job: 'eval_judge', workshopId: w.id, userId },
      {
        system: JUDGE_SYSTEM,
        schema: scoreSchema,
        messages: [{ role: 'user', content: `Stage goal: ${STAGES[r.stage as keyof typeof STAGES].goal}\n\nWhat the user just did: ${r.turn}\n\nFacilitator reply:\n${r.reply}` }],
      },
    );
  }

  const [final] = await db.select({ ideaType: workshops.ideaType, stage: workshops.stage }).from(workshops).where(eq(workshops.id, w.id));
  const worst = (k: keyof z.infer<typeof scoreSchema>) => Math.min(...replies.filter((r) => r.scores).map((r) => r.scores![k] as number));
  const pass = worst('relevance') >= 3 && worst('evidence') >= 3 && (!c.expectIdeaType || final.ideaType === c.expectIdeaType);

  return { id: c.id, workshopId: w.id, pass, ideaType: final.ideaType, expectIdeaType: c.expectIdeaType, stageReached: final.stage, costCents: Number(costCents.toFixed(3)), worst: { relevance: worst('relevance'), onGoal: worst('onGoal'), tone: worst('tone'), evidence: worst('evidence') }, replies };
}

async function main() {
  const filter = process.argv[2];
  const dir = path.join(process.cwd(), 'evals', 'cases');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && (!filter || f.includes(filter)));
  const userId = await ensureEvalUser();
  const results = [];
  for (const f of files) {
    const c = caseSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    process.stdout.write(`${c.id} … `);
    const r = await runCase(c, userId);
    results.push(r);
    console.log(`${r.pass ? 'PASS' : 'FAIL'} type=${r.ideaType} stage=${r.stageReached} worst=${JSON.stringify(r.worst)} cost=${r.costCents}c`);
    for (const rep of r.replies) if (rep.scores && (rep.scores.relevance < 3 || rep.scores.evidence < 3)) console.log(`   low: "${rep.turn.slice(0, 60)}" -> ${rep.scores.note}`);
  }
  const out = path.join(process.cwd(), 'evals', 'results');
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(results, null, 2));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed. ${file}`);
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
