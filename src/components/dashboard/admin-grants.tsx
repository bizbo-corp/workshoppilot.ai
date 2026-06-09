'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heading, Caption, Code } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import {
  adminGrantCredits,
  adminUpgradeWorkshopTier,
} from '@/actions/admin-actions';

export function AdminGrants() {
  const router = useRouter();
  const [creditPending, startCreditTransition] = useTransition();
  const [tierPending, startTierTransition] = useTransition();

  const [amount, setAmount] = useState('1');
  const [email, setEmail] = useState('');

  const [workshopId, setWorkshopId] = useState('');
  const [tier, setTier] = useState<'team' | 'white_glove'>('team');

  function handleGrantCredits() {
    const parsed = parseInt(amount, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error('Amount must be a positive number');
      return;
    }
    startCreditTransition(async () => {
      const result = await adminGrantCredits({
        amount: parsed,
        email: email.trim() || undefined,
      });
      if (result.status === 'success') {
        toast.success(
          `Granted ${parsed} credit${parsed === 1 ? '' : 's'} to ${result.targetEmail} (balance: ${result.newBalance})`
        );
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleUpgradeWorkshop() {
    if (!workshopId.trim()) {
      toast.error('Workshop ID required');
      return;
    }
    startTierTransition(async () => {
      const result = await adminUpgradeWorkshopTier({
        workshopId: workshopId.trim(),
        tier,
      });
      if (result.status === 'success') {
        toast.success(`Upgraded ${result.workshopId} to ${result.tier}`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  const selectClass = cn(
    'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Heading level={4}>Grant solo credits</Heading>
        <div className="grid gap-2 sm:grid-cols-[100px_1fr_auto]">
          <Input
            type="number"
            min={1}
            max={50}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={creditPending}
            aria-label="Credit amount"
          />
          <Input
            type="email"
            placeholder="Leave blank to credit your account"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={creditPending}
            aria-label="Recipient email"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleGrantCredits}
            disabled={creditPending}
          >
            {creditPending ? 'Granting…' : 'Grant credits'}
          </Button>
        </div>
        <Caption>
          Writes a <Code>credit_transactions</Code> ledger row (description: &ldquo;Admin grant&rdquo;) so the books stay honest.
        </Caption>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <Heading level={4}>Upgrade a workshop</Heading>
        <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
          <Input
            type="text"
            placeholder="wsh_…"
            value={workshopId}
            onChange={(e) => setWorkshopId(e.target.value)}
            disabled={tierPending}
            aria-label="Workshop ID"
          />
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as 'team' | 'white_glove')}
            disabled={tierPending}
            aria-label="Target tier"
            className={selectClass}
          >
            <option value="team">team</option>
            <option value="white_glove">white_glove</option>
          </select>
          <Button
            variant="primary"
            size="sm"
            onClick={handleUpgradeWorkshop}
            disabled={tierPending}
          >
            {tierPending ? 'Upgrading…' : 'Upgrade workshop'}
          </Button>
        </div>
        <Caption>
          Bypasses the Stripe path. Sets tier, facilitator mode, multiplayer type, and seeds the Liveblocks session if missing.
        </Caption>
      </div>
    </div>
  );
}
