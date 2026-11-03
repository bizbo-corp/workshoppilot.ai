import Link from 'next/link';
import { listMyWorkshops } from '@/actions/workshops';
import { NewWorkshopForm } from '@/components/workshop/new-workshop-form';
import { STAGES, STAGE_ORDER, currentActivity } from '@/lib/engine/stages';
import type { WorkshopState } from '@/lib/engine/types';
import { upgrade } from '@/lib/engine/reducer';

import { PageContainer } from '@/components/layout/page-container';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const [list, params] = await Promise.all([listMyWorkshops(), searchParams]);
  const active = list.filter((w) => w.status !== 'archived');

  return (
    <PageContainer>
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">What are you thinking of building?</h1>
        <p className="max-w-2xl text-muted-foreground">
          One sentence is enough. The facilitator takes it from there: Discover, Define, Develop, Deliver.
        </p>
        <NewWorkshopForm autoFocus={params.new === '1'} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Your workshops</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Start one above.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {active.map((w) => {
              const state = upgrade(w.state as unknown as WorkshopState);
              const done = state.completedStages.length;
              const finished = done === STAGE_ORDER.length;
              const activity = finished ? null : currentActivity(state, w.stage);
              return (
                <li key={w.id}>
                  <Link href={finished ? `/w/${w.id}/summary` : `/w/${w.id}`} className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent">
                    <div className="font-medium">{w.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {finished ? 'Finished. See the summary and your score' : `${STAGES[w.stage].label} · ${activity?.label}`}
                    </div>
                    <div className="mt-3 flex gap-1" aria-label={`${done} of ${STAGE_ORDER.length} stages done`}>
                      {STAGE_ORDER.map((s) => (
                        <span key={s} className={`h-1 flex-1 rounded-full ${state.completedStages.includes(s) ? 'bg-olive-600' : s === w.stage ? 'bg-foreground/50' : 'bg-border'}`} />
                      ))}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
    </PageContainer>
  );
}
