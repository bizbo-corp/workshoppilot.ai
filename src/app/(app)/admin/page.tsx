import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { requireAdmin } from '@/lib/auth/current-user';
import { CREDIT_UNIT_CENTS, MIN_MARGIN_MULTIPLE, getJobConfig, AI_JOBS } from '@/lib/ai/jobs';
import { cn } from '@/lib/utils';
import { RunDummyWorkshopButton } from '@/components/admin/run-dummy-button';

export const dynamic = 'force-dynamic';

interface JobRow {
  job: string;
  calls: number;
  cost_cents: number;
  credits: number;
  avg_ms: number;
  failures: number;
}

/**
 * Cost and margin, straight from ai_calls. Paid jobs show revenue (credits
 * sold at the smallest pack's unit price) against model cost; anything
 * under the margin rule goes red.
 */
export default async function AdminPage() {
  await requireAdmin();

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [jobs, totals, runs] = await Promise.all([
    db.execute(sql`
      select job, count(*)::int as calls, coalesce(sum(cost_cents),0)::float as cost_cents, coalesce(sum(credits_charged),0)::int as credits,
             coalesce(avg(duration_ms),0)::int as avg_ms, count(*) filter (where not ok)::int as failures
      from v2.ai_calls where created_at > ${since} group by job order by cost_cents desc`),
    db.execute(sql`
      select
        (select count(*) from v2.users where deleted_at is null)::int as users,
        (select count(*) from v2.workshops where test_run_id is null and deleted_at is null)::int as workshops,
        (select count(*) from v2.workshops where test_run_id is null and completed_at is not null)::int as completed,
        (select coalesce(sum(delta),0) from v2.credit_ledger where kind='purchase')::int as credits_sold,
        (select coalesce(sum(-delta),0) from v2.credit_ledger where kind='spend')::int as credits_spent,
        (select coalesce(sum(cost_cents),0) from v2.ai_calls where workshop_id in (select id from v2.workshops where test_run_id is null))::float as real_cost_cents,
        (select coalesce(avg(c),0) from (select sum(cost_cents) c from v2.ai_calls a join v2.workshops w on w.id=a.workshop_id where w.test_run_id is null and w.completed_at is not null group by a.workshop_id) t)::float as cost_per_completed`),
    db.execute(sql`select id, seed, status, triggered_by, created_at, finished_at, scenario->>'ideaType' as idea_type, report->>'summary' as summary from v2.test_runs order by created_at desc limit 12`),
  ]);
  const t = totals.rows[0] as Record<string, number>;
  const rows = jobs.rows as unknown as JobRow[];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Accounts" value={t.users} />
        <Stat label="Workshops" value={`${t.workshops} (${t.completed} finished)`} />
        <Stat label="Credits sold / spent" value={`${t.credits_sold} / ${t.credits_spent}`} />
        <Stat label="AI cost per finished workshop" value={`${(t.cost_per_completed ?? 0).toFixed(1)}c`} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">AI jobs, last 30 days</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-1">Job</th>
              <th>Model</th>
              <th className="text-right">Calls</th>
              <th className="text-right">Cost</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Margin</th>
              <th className="text-right">Avg ms</th>
              <th className="text-right">Failed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {AI_JOBS.map((job) => {
              const r = rows.find((x) => x.job === job);
              const cfg = getJobConfig(job);
              const revenue = (r?.credits ?? 0) * CREDIT_UNIT_CENTS;
              const margin = r && r.cost_cents > 0 ? revenue / r.cost_cents : null;
              const paid = cfg.credits > 0;
              const bad = paid && margin != null && margin < MIN_MARGIN_MULTIPLE;
              return (
                <tr key={job} className={cn(bad && 'text-destructive')}>
                  <td className="py-1.5 font-medium">{job}</td>
                  <td className="text-muted-foreground">{cfg.model}</td>
                  <td className="text-right tabular-nums">{r?.calls ?? 0}</td>
                  <td className="text-right tabular-nums">{(r?.cost_cents ?? 0).toFixed(2)}c</td>
                  <td className="text-right tabular-nums">{paid ? `${revenue.toFixed(0)}c` : 'free'}</td>
                  <td className="text-right tabular-nums">{paid ? (margin == null ? '—' : `${margin.toFixed(1)}x`) : ''}</td>
                  <td className="text-right tabular-nums">{r?.avg_ms ?? 0}</td>
                  <td className="text-right tabular-nums">{r?.failures ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Revenue values credits at {CREDIT_UNIT_CENTS}c each (the smallest pack). The rule is {MIN_MARGIN_MULTIPLE}x cost or better on every paid job.</p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-medium">Dummy workshops</h2>
          <RunDummyWorkshopButton />
        </div>
        {runs.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(runs.rows as Record<string, string | null>[]).map((r) => (
              <li key={r.id!} className="flex flex-wrap items-center gap-3 py-2">
                <span className={cn('rounded-full px-2 py-0.5 text-xs', r.status === 'passed' ? 'bg-olive-100 text-olive-800 dark:bg-neutral-olive-800 dark:text-olive-200' : r.status === 'failed' || r.status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>{r.status}</span>
                <span className="font-mono text-xs text-muted-foreground">{r.seed}</span>
                <span>{r.idea_type}</span>
                <span className="text-muted-foreground">{r.triggered_by}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
