'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { requestChallengeChange } from '@/actions/challenge-approval-actions';

interface LobbyParticipantActionsProps {
  workshopId: string;
  isWaiting: boolean;
  /** Existing change-request note if the participant is already in 'waiting' state. */
  existingNote?: string | null;
}

/**
 * Participant-side lobby actions: the "Request a change" affordance.
 * When the participant has already requested a change, shows their note read-only.
 */
export function LobbyParticipantActions({
  workshopId,
  isWaiting,
  existingNote,
}: LobbyParticipantActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit() {
    const trimmed = note.trim();
    if (trimmed.length < 4) {
      setError('Tell the facilitator a bit more');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await requestChallengeChange(workshopId, trimmed);
        toast.success('Change request sent to the facilitator');
        setOpen(false);
        setNote('');
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not send change request';
        setError(msg);
      }
    });
  }

  if (isWaiting) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
          Your change request is with the facilitator.
        </p>
        {existingNote && (
          <blockquote className="mt-2 border-l-2 border-amber-400/60 pl-3 text-sm italic text-amber-900/80 dark:text-amber-200/80">
            {existingNote}
          </blockquote>
        )}
        <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-200/80">
          We&apos;ll re-prompt you once they republish.
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
      >
        Got concerns about the challenge? Request a change
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a change</DialogTitle>
            <DialogDescription>
              Tell the facilitator what you&apos;d adjust. They&apos;ll see this and can
              revise before kicking off.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="e.g., I'd refine the audience to focus on…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
