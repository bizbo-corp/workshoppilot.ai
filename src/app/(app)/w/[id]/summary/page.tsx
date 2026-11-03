import { notFound } from 'next/navigation';
import { requireMember, ForbiddenError } from '@/lib/workshops/access';
import { loadWorkshop } from '@/lib/engine/store';
import { STAGES, STAGE_ORDER, fieldKey } from '@/lib/engine/stages';

export const dynamic = 'force-dynamic';

/** Free one-page wrap-up. Phase 5 adds the generated summary and the paid Verdict. */
export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireMember(id);
  } catch (err) {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  }
  const loaded = await loadWorkshop(id);
  if (!loaded) notFound();
  const { state, workshop } = loaded;

  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Workshop summary</div>
        <h1 className="text-2xl font-semibold tracking-tight">{workshop.title}</h1>
      </header>
      {STAGE_ORDER.filter((s) => state.completedStages.includes(s)).map((s) => (
        <section key={s} className="space-y-2">
          <h2 className="text-lg font-medium">{STAGES[s].label}</h2>
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
        </section>
      ))}
    </article>
  );
}
