'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { startWorkshop } from '@/actions/workshop-setup-actions';

interface StartWorkshopButtonProps {
  workshopId: string;
}

/**
 * Facilitator-only — fires startWorkshop, then navigates.
 * The matching Liveblocks broadcast is wired in the multiplayer-room listener
 * (separate task) so participants in the lobby follow automatically.
 */
export function StartWorkshopButton({ workshopId }: StartWorkshopButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await startWorkshop(workshopId);
        if (result.alreadyStarted) {
          toast.info('Workshop already started');
        } else {
          toast.success('Workshop started');
        }
        router.push(result.nextUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not start workshop';
        toast.error(msg);
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending} size="lg">
      <Play className="mr-2 h-4 w-4" />
      {isPending ? 'Starting…' : 'Start workshop'}
    </Button>
  );
}
