'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { startDummyWorkshop } from '@/actions/admin';

export function RunDummyWorkshopButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await startDummyWorkshop();
          if (r.success) toast.success(`Run ${r.data.seed} ${r.data.pass ? 'passed' : 'failed'}: ${r.data.summary}`);
          else toast.error(r.error);
          router.refresh();
        })
      }
    >
      {pending ? <Icon name="spinner" className="h-4 w-4 animate-spin" /> : <Icon name="shuffle" className="h-4 w-4" />}
      Run a dummy workshop
    </Button>
  );
}
