import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reports, type Report, type ReportKind } from '@/db/schema';
import { aiObject } from '@/lib/ai/gateway';
import { getJobConfig } from '@/lib/ai/jobs';
import { getLens } from '@/lib/engine/lenses';
import type { WorkshopState } from '@/lib/engine/types';
import { SOUL } from '@/lib/ai/soul';
import { workshopBrief, stateHash } from './brief';
import { isFakeAiEnabled } from '@/lib/ai/fake-model';
import { FAKE_SUMMARY, FAKE_VERDICT, FAKE_BUILD_PACK } from './fixtures';
import { summarySchema, verdictSchema, buildPackSchema, type Summary, type Verdict, type BuildPack } from './schemas';

/**
 * Report generation. Each kind is cached by the hash of the workshop record
 * it was built from, so reopening the page never spends again, and a
 * changed workshop regenerates.
 */

export async function latestReport(workshopId: string, kind: ReportKind): Promise<Report | null> {
  const [row] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.workshopId, workshopId), eq(reports.kind, kind)))
    .orderBy(desc(reports.createdAt))
    .limit(1);
  return row ?? null;
}

async function cached<T>(workshopId: string, kind: ReportKind, hash: string): Promise<T | null> {
  const row = await latestReport(workshopId, kind);
  return row && row.stateHash === hash ? (row.content as T) : null;
}

async function save(workshopId: string, kind: ReportKind, hash: string, content: object, markdown: string) {
  await db.insert(reports).values({ workshopId, kind, content: content as Record<string, unknown>, markdown, stateHash: hash });
}

const HONESTY = `You are the facilitator from the workshop, now giving the founder the honest read. ${SOUL.split('## Honest Judgment')[1]?.split('## Canvas Awareness')[0] ?? ''}`;

export async function generateSummary(workshopId: string, userId: string, state: WorkshopState): Promise<{ summary: Summary; markdown: string; cached: boolean }> {
  const hash = stateHash(state);
  const hit = await cached<Summary>(workshopId, 'summary', hash);
  if (hit) return { summary: hit, markdown: summaryMarkdown(hit), cached: true };

  const summary = isFakeAiEnabled() ? FAKE_SUMMARY : await aiObject(
    { job: 'summary_report', workshopId, userId },
    {
      system: `You write the one-page summary of a design-thinking workshop. Plain words, no hype, British English, no em dashes. Use only what is in the record; where a field was never agreed, write "not yet decided" for that field. nextSevenDays always has real actions: start the test, book the conversations, build the asset named in the test plan.`,
      schema: summarySchema,
      messages: [{ role: 'user', content: workshopBrief(state) }],
    },
  );
  const markdown = summaryMarkdown(summary);
  await save(workshopId, 'summary', hash, summary, markdown);
  return { summary, markdown, cached: false };
}

export function summaryMarkdown(s: Summary): string {
  return [
    `# ${s.headline}`,
    '',
    `**Challenge.** ${s.challenge}`,
    `**Who.** ${s.persona}`,
    `**The dip.** ${s.dip}`,
    `**Concept.** ${s.concept}`,
    `**Riskiest assumption.** ${s.assumption}`,
    `**The test.** ${s.test}`,
    '',
    '## This week',
    ...s.nextSevenDays.map((l) => `- ${l}`),
  ].join('\n');
}

export async function generateVerdict(workshopId: string, userId: string, state: WorkshopState): Promise<{ verdict: Verdict; markdown: string; cached: boolean }> {
  const hash = stateHash(state);
  const hit = await cached<Verdict>(workshopId, 'verdict', hash);
  if (hit) return { verdict: hit, markdown: verdictMarkdown(hit), cached: true };

  const lens = getLens(state.ideaType);
  const system = `${HONESTY}

You return exactly five dimensions, one each: problem, audience, edge, evidence, cost_to_test.

The cardinal rule: credit only evidence the record shows the user produced. Interview quotes, numbers, things observed count. "The user believes" does not. A dimension with no supporting stage gets empty sources and cannot be solid.

What counts as evidence for a ${lens?.label ?? 'new'} idea: ${lens?.evidenceBar.join('; ') ?? 'demand shown, not claimed'}.
Cheap tests that fit this type: ${lens?.cheapTests.join('; ') ?? 'talk to five people'}.

The signal must be a number a sceptic would accept, with a kill threshold the founder agrees to in advance. Every thin or missing dimension carries a nextTest. End constructive: the founder should know what to do tomorrow and feel the workshop saved them months.`;

  const verdict = isFakeAiEnabled() ? FAKE_VERDICT : await aiObject({ job: 'verdict', workshopId, userId }, { system, schema: verdictSchema, messages: [{ role: 'user', content: workshopBrief(state) }] });
  const markdown = verdictMarkdown(verdict);
  await save(workshopId, 'verdict', hash, verdict, markdown);
  return { verdict, markdown, cached: false };
}

export function verdictMarkdown(v: Verdict): string {
  const names: Record<string, string> = { problem: 'Problem', audience: 'Audience', edge: 'Edge', evidence: 'Evidence', cost_to_test: 'Cost to test' };
  return [
    `# The Verdict`,
    '',
    `**${v.verdictLine}**`,
    '',
    `Readiness: ${v.readiness.replace('_', ' ')}`,
    '',
    '## The honest read',
    ...v.dimensions.flatMap((d) => [`### ${names[d.dimension]}: ${d.strength}`, d.read, d.sources.length ? `*From: ${d.sources.join(', ')}*` : '*Nothing in the workshop supports this yet.*', d.nextTest ? `Next: ${d.nextTest}` : '', '']),
    '## Riskiest assumption',
    v.assumption,
    '',
    '## The test',
    v.cheapestTest,
    '',
    `Metric: ${v.signal.metric}. Target: ${v.signal.target} ${v.signal.unit} in ${v.signal.window}. Kill: ${v.signal.kill} ${v.signal.unit}.`,
  ].join('\n');
}

export async function generateBuildPack(workshopId: string, userId: string, state: WorkshopState, verdict: Verdict): Promise<{ pack: BuildPack; markdown: string; cached: boolean }> {
  const hash = stateHash(state);
  const hit = await cached<BuildPack>(workshopId, 'build_pack', hash);
  if (hit) return { pack: hit, markdown: buildPackMarkdown(hit), cached: true };

  const lens = getLens(state.ideaType);
  const adds = lens?.reportAdds ?? [];
  const system = `You write the Build Pack for a ${lens?.label ?? ''} idea that came out of a design-thinking workshop: the document the founder hands to whoever builds or runs it next. British English, no em dashes, no hype. Use only the record and the verdict; mark anything undecided as "to decide".

Sections to write, in this order: Overview (what, for whom, why now); ${adds.join('; ')}; Risks and open questions; First two weeks. Each section is tight markdown with lists and tables where they help. For a PRD, write user stories and acceptance criteria. For tech specs, name the data the product keeps and the integrations it needs, not a stack. For a service blueprint, write front stage, back stage and support per moment. For a process map, write before and after per step with who does it. For a product brief, write form, materials, must-haves and a rough cost per unit with the assumptions stated.`;

  const pack = isFakeAiEnabled() ? FAKE_BUILD_PACK : await aiObject(
    { job: 'build_pack', workshopId, userId },
    { system, schema: buildPackSchema, messages: [{ role: 'user', content: `${workshopBrief(state)}\n\n== Verdict ==\n${verdictMarkdown(verdict)}` }] },
  );
  const markdown = buildPackMarkdown(pack);
  await save(workshopId, 'build_pack', hash, pack, markdown);
  return { pack, markdown, cached: false };
}

export function buildPackMarkdown(p: BuildPack): string {
  return [`# ${p.title}`, '', ...p.sections.flatMap((s) => [`## ${s.heading}`, '', s.markdown, ''])].join('\n');
}

export const VERDICT_CREDITS = getJobConfig('verdict').credits;
