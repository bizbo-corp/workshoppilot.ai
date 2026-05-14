'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteWorkshops } from '@/actions/workshop-actions';

/**
 * Auto-opens on the first load of a team-mode workshop's Step 1 page (when ?fc=1 is set).
 * The facilitator confirms they're running the workshop. If they pick "I'm not the facilitator",
 * we soft-delete the workshop and return them to the dashboard — they can re-create it with
 * the right options.
 */
interface FacilitatorConfirmationModalProps {
  workshopId: string;
}

export function FacilitatorConfirmationModal({ workshopId }: FacilitatorConfirmationModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();
  const [canceling, setCanceling] = useState(false);

  // The modal is open as long as ?fc=1 is in the URL and the user hasn't dismissed it.
  const open = !dismissed && searchParams.get('fc') === '1';

  function clearFcParam() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('fc');
    const qs = next.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  function handleConfirm() {
    setDismissed(true);
    clearFcParam();
  }

  async function handleDecline() {
    setCanceling(true);
    try {
      await deleteWorkshops([workshopId]);
      toast.success('Workshop cancelled');
      startTransition(() => {
        router.push('/dashboard');
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not cancel workshop');
      setCanceling(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) handleConfirm(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <AlertDialogTitle>You&apos;re facilitating this workshop</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left">
            <span className="block">
              As the facilitator, you&apos;ll frame the challenge in Step 1 before inviting
              participants. Once you publish the challenge, participants join straight at
              Step 2.
            </span>
            <span className="block">Ready to get started?</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(e) => {
              e.preventDefault();
              if (canceling) return;
              void handleDecline();
            }}
            disabled={canceling}
          >
            {canceling ? 'Cancelling…' : "I'm not the facilitator"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            I&apos;m the facilitator — continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
