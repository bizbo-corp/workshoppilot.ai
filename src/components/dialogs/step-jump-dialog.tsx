/**
 * Step Jump Dialog
 * "Back to workshop" picker used from the build pack: lists the ten numbered
 * workshop steps with completion status and navigates to the chosen one.
 * Steps that were never started are shown but disabled.
 */

'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { STEPS } from '@/lib/workshop/step-metadata';
import type { StepStatus } from '@/components/layout/build-pack-nav-context';
import { cn } from '@/lib/utils';

interface StepJumpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  steps: Array<{ stepId: string; status: StepStatus }>;
}

export function StepJumpDialog({
  open,
  onOpenChange,
  sessionId,
  steps,
}: StepJumpDialogProps) {
  const statusLookup = new Map(steps.map((s) => [s.stepId, s.status]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Back to workshop</DialogTitle>
          <DialogDescription>
            Choose which step to return to.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          {STEPS.filter((step) => step.id !== 'challenge').map((step) => {
            const status = statusLookup.get(step.id) ?? 'not_started';
            const isComplete = status === 'complete';
            const isAccessible = status !== 'not_started';

            const indicator = (
              <div
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium',
                  isComplete
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-background text-muted-foreground',
                )}
              >
                {isComplete ? <Icon name="check" className="h-3 w-3" /> : step.order}
              </div>
            );

            if (!isAccessible) {
              return (
                <div
                  key={step.id}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 opacity-50"
                >
                  {indicator}
                  <span className="truncate text-sm">{step.name}</span>
                </div>
              );
            }

            return (
              <Link
                key={step.id}
                href={`/workshop/${sessionId}/step/${step.slug}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
              >
                {indicator}
                <span className="flex-1 truncate text-sm">{step.name}</span>
                <Icon
                  name="arrow-right"
                  className="h-4 w-4 text-muted-foreground"
                />
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
