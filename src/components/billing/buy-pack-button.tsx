'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { startCreditCheckout } from '@/actions/billing';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export function BuyPackButton({ packId, returnTo }: { packId: string; returnTo?: string }) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <Button
      variant={failed ? 'outline' : 'primary'}
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await startCreditCheckout(packId, returnTo);
          // On success the action redirects and never returns.
          if (result && !result.success) {
            setFailed(true);
            toast.error(result.error);
          }
        })
      }
    >
      {pending ? <Icon name="spinner" className="h-4 w-4 animate-spin" /> : null}
      Buy
    </Button>
  );
}
