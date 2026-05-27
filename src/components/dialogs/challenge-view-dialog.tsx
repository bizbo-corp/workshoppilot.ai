/**
 * Challenge View Dialog
 * Read-only view of the workshop challenge statement, opened from the header
 * control by any participant so they can stay focused on the challenge.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getChallengeForViewer } from '@/actions/challenge-actions';
import type { ChallengeArtifact } from '@/lib/workshop/challenge-artifact';

interface ChallengeViewDialogProps {
  workshopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-olive-200/60 bg-olive-50/40 p-3 dark:border-olive-800/40 dark:bg-olive-900/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}

export function ChallengeViewDialog({ workshopId, open, onOpenChange }: ChallengeViewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeArtifact | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show skeleton while (re)fetching on open
    setLoading(true);
    getChallengeForViewer(workshopId)
      .then((data) => {
        if (!cancelled) setChallenge(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, workshopId]);

  const hmw = challenge?.hmwStatement?.trim() || challenge?.originalIdea?.trim() || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>The Challenge</DialogTitle>
          <DialogDescription>
            What this workshop is working to solve.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : hmw ? (
          <div className="space-y-4">
            <blockquote className="border-l-4 border-primary bg-olive-50/60 px-4 py-3 text-base font-medium leading-relaxed text-foreground dark:bg-olive-900/30">
              {hmw}
            </blockquote>
            {(challenge?.idea || challenge?.problem || challenge?.audience) && (
              <div className="space-y-2">
                {challenge?.idea && <Field label="The Idea" value={challenge.idea} />}
                {challenge?.problem && <Field label="The Problem" value={challenge.problem} />}
                {challenge?.audience && <Field label="The Audience" value={challenge.audience} />}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            The challenge hasn&apos;t been framed yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
