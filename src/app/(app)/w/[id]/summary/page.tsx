import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { requireMember, ForbiddenError } from '@/lib/workshops/access';
import { loadWorkshop } from '@/lib/engine/store';
import { STAGES, STAGE_ORDER, fieldKey } from '@/lib/engine/stages';
import { latestReport, VERDICT_CREDITS } from '@/lib/reports/generate';
import { stateHash } from '@/lib/reports/brief';
import type { Verdict } from '@/lib/reports/schemas';
import { VERDICT_LABELS } from '@/lib/reports/score';
import type { ScoreVerdict } from '@/lib/reports/schemas';
import { ScoreRing } from '@/components/workshop/score-ring';
import { SummaryActions, ResultForm } from '@/components/workshop/summary-actions';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

/**
 * The wrap-up page: free summary, the armed Validation Score, the paid
 * Verdict and Build Pack, and the result form that fills the score.
 */
export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let credits = 0;
  try {
    ({ user: { creditBalance: credits } } = await requireMember(id));
  } catch (err) {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  }
  const loaded = await loadWorkshop(id);
  if (!loaded) notFound();
  const { state, workshop } = loaded;
  const finished = state.completedStages.includes('deliver');
  const hash = stateHash(state);

  const [summary, verdictRow, pack] = await Promise.all([latestReport(id, 'summary'), latestReport(id, 'verdict'), latestReport(id, 'build_pack')]);
  const verdict = verdictRow ? (verdictRow.content as unknown as Verdict) : null;
  const verdictStale = !!verdictRow && verdictRow.stateHash !== hash;
  const result = parseResult(state.fields[fieldKey('deliver', 'result')]);

  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Workshop summary</div>
          <h1 className="text-2xl font-semibold tracking-tight">{workshop.title}</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/w/${id}`}>Back to the workshop</Link>
        </Button>
      </header>

      {!finished && <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">Finish Deliver to unlock the summary and the Verdict.</p>}

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-medium">Validation Score</h2>
        <ScoreRing score={result?.score ?? null} target={verdict?.signal.target} kill={verdict?.signal.kill} unit={verdict?.signal.unit} />
        {result && (
          <p className="mt-3 text-sm">
            <span className="font-medium">{VERDICT_LABELS[result.verdict]}.</span> You logged {result.actual} {verdict?.signal.unit}. {result.note}
          </p>
        )}
        {verdict && !result && finished && <ResultForm workshopId={id} unit={verdict.signal.unit} metric={verdict.signal.metric} />}
      </section>

      {finished && (
        <SummaryActions workshopId={id} hasSummary={!!summary && summary.stateHash === hash} hasVerdict={!!verdict && !verdictStale} hasPack={!!pack && pack.stateHash === hash} credits={credits} verdictCredits={VERDICT_CREDITS} verdictStale={verdictStale} />
      )}

      {summary?.markdown && (
        <section className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{summary.markdown}</ReactMarkdown>
        </section>
      )}

      {verdictRow?.markdown && (
        <section className="rounded-lg border border-olive-300 bg-olive-50/50 p-5 dark:border-neutral-olive-600 dark:bg-neutral-olive-900/40">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{verdictRow.markdown}</ReactMarkdown>
          </div>
        </section>
      )}

      {pack?.markdown && (
        <section className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{pack.markdown}</ReactMarkdown>
        </section>
      )}

      <section className="space-y-6 border-t border-border pt-6">
        <h2 className="text-lg font-medium">The record</h2>
        {STAGE_ORDER.filter((s) => state.completedStages.includes(s)).map((s) => (
          <div key={s} className="space-y-2">
            <h3 className="font-medium">{STAGES[s].label}</h3>
            {state.stageSummaries[s] && <p className="text-sm text-muted-foreground">{state.stageSummaries[s]}</p>}
            <dl className="space-y-1.5">
              {STAGES[s].fields
                .filter((f) => state.fields[fieldKey(s, f.id)])
                .map((f) => (
                  <div key={f.id}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                    <dd className="text-sm">{state.fields[fieldKey(s, f.id)]}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </section>
    </article>
  );
}

function parseResult(raw: string | undefined): { actual: number; score: number; verdict: ScoreVerdict; note: string } | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    return typeof r.score === 'number' ? r : null;
  } catch {
    return null;
  }
}
