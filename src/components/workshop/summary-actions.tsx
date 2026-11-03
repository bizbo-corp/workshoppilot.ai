'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { buildBuildPack, buildSummary, buyVerdict, recordResult } from '@/actions/reports';

interface Props {
  workshopId: string;
  hasSummary: boolean;
  hasVerdict: boolean;
  hasPack: boolean;
  credits: number;
  verdictCredits: number;
  verdictStale: boolean;
}

export function SummaryActions({ workshopId, hasSummary, hasVerdict, hasPack, credits, verdictCredits, verdictStale }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  // The free summary builds itself on first visit.
  useEffect(() => {
    if (hasSummary || busy) return;
    setBusy('summary');
    start(async () => {
      const r = await buildSummary(workshopId);
      if (!r.success) toast.error(r.error);
      setBusy(null);
      router.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSummary]);

  function run(name: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(name);
    start(async () => {
      const r = await fn();
      if (!r.success) toast.error(r.error ?? 'Something went wrong');
      setBusy(null);
      router.refresh();
    });
  }

  const canAfford = credits >= verdictCredits;

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
      {busy === 'summary' && (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon name="spinner" className="h-4 w-4 animate-spin" /> Writing your summary
        </span>
      )}
      {!hasVerdict && (
        <>
          <div className="text-sm">
            <div className="font-medium">{verdictStale ? 'The workshop changed since your Verdict' : 'Get the Verdict'}</div>
            <div className="text-muted-foreground">The honest read, the riskiest assumption, a designed test and your armed score. {verdictCredits} credits.</div>
          </div>
          {canAfford ? (
            <Button variant="primary" disabled={pending} onClick={() => run('verdict', () => buyVerdict(workshopId))}>
              {busy === 'verdict' ? <Icon name="spinner" className="h-4 w-4 animate-spin" /> : null}
              {verdictStale ? 'Refresh the Verdict' : 'Get the Verdict'}
            </Button>
          ) : (
            <Button asChild variant="primary">
              <Link href={`/credits?return_to=/w/${workshopId}/summary`}>Buy credits ({credits} of {verdictCredits})</Link>
            </Button>
          )}
        </>
      )}
      {hasVerdict && !hasPack && (
        <>
          <div className="text-sm">
            <div className="font-medium">Build Pack</div>
            <div className="text-muted-foreground">The document for whoever builds or runs it next. Included with the Verdict.</div>
          </div>
          <Button variant="primary" disabled={pending} onClick={() => run('pack', () => buildBuildPack(workshopId))}>
            {busy === 'pack' ? <Icon name="spinner" className="h-4 w-4 animate-spin" /> : null}
            Write the Build Pack
          </Button>
        </>
      )}
      {hasVerdict && hasPack && <span className="text-sm text-muted-foreground">Verdict and Build Pack are below. Log your result when the test has run.</span>}
    </section>
  );
}

export function ResultForm({ workshopId, unit, metric }: { workshopId: string; unit: string; metric: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [actual, setActual] = useState('');
  const [note, setNote] = useState('');

  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(actual);
        if (Number.isNaN(n)) return toast.error('Enter a number');
        start(async () => {
          const r = await recordResult({ workshopId, actual: n, note: note || undefined });
          if (!r.success) toast.error(r.error);
          router.refresh();
        });
      }}
    >
      <label className="text-sm">
        <span className="block text-xs text-muted-foreground">{metric} ({unit})</span>
        <input value={actual} onChange={(e) => setActual(e.target.value)} inputMode="decimal" className="mt-1 w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="0" />
      </label>
      <label className="min-w-[14rem] flex-1 text-sm">
        <span className="block text-xs text-muted-foreground">What happened (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
      </label>
      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        Log the result
      </Button>
    </form>
  );
}
