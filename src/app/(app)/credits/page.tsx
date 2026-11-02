import { requireUser } from '@/lib/auth/current-user';
import { CREDIT_PACKS, formatUsd } from '@/lib/credits/packs';
import { getJobConfig } from '@/lib/ai/jobs';
import { BuyPackButton } from '@/components/billing/buy-pack-button';

export const dynamic = 'force-dynamic';

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ cancelled?: string; return_to?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const verdict = getJobConfig('verdict').credits;
  const sketch = getJobConfig('clean_sketch').credits;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Credits</h1>
        <p className="mt-1 text-muted-foreground">
          The workshop is free. Credits pay for the heavy lifting: a Verdict is {verdict} credits, a sketch clean-up is {sketch}.
          They never expire.
        </p>
        <p className="mt-3 text-sm">
          Balance: <span className="font-medium tabular-nums">{user.creditBalance}</span> credits
        </p>
        {params.cancelled && <p className="mt-2 text-sm text-muted-foreground">Checkout cancelled. Nothing was charged.</p>}
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <li key={pack.id} className="flex flex-col rounded-lg border border-border bg-card p-5">
            <div className="text-sm font-medium text-muted-foreground">{pack.name}</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{pack.credits.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">credits</div>
            <p className="mt-3 flex-1 text-sm">{pack.blurb}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-medium">{formatUsd(pack.amountCents)}</span>
              <BuyPackButton packId={pack.id} returnTo={params.return_to} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
