/**
 * Upgrade Dialog
 * Inline paywall dialog shown when user attempts to proceed past Step 6 without credits.
 * Uses outcome-framed copy to communicate value, not just the gate.
 * Two CTA paths:
 *   - hasCredits=true: "Use 1 Credit to Unlock" → consumeCredit() + advanceToNextStep()
 *   - hasCredits=false: "Get 1 Credit" → /pricing?return_to=...
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { consumeCredit } from '@/actions/billing-actions';
import { advanceToNextStep } from '@/actions/workshop-actions';
import { STEPS } from '@/lib/workshop/step-metadata';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  sessionId: string;
  currentStepOrder: number;
  hasCredits: boolean;
  creditBalance: number;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  workshopId,
  sessionId,
  currentStepOrder,
  hasCredits,
  creditBalance,
}: UpgradeDialogProps) {
  const [isConsuming, setIsConsuming] = useState(false);

  async function handleUseCredit() {
    setIsConsuming(true);
    try {
      const credit = await consumeCredit(workshopId);
      if (
        credit.status === 'consumed' ||
        credit.status === 'already_unlocked' ||
        credit.status === 'grandfathered' ||
        credit.status === 'paywall_disabled'
      ) {
        // Credit consumed — re-call advanceToNextStep; gate now passes, redirect fires
        const currentStep = STEPS.find((s) => s.order === currentStepOrder);
        const nextStep = STEPS.find((s) => s.order === currentStepOrder + 1);
        if (currentStep && nextStep) {
          await advanceToNextStep(workshopId, currentStep.id, nextStep.id, sessionId);
        }
      } else if (credit.status === 'insufficient_credits') {
        toast.error('No credits available.');
      } else if (credit.status === 'error') {
        toast.error(credit.message ?? 'Something went wrong.');
      }
    } catch (error) {
      // Must rethrow NEXT_REDIRECT for navigation to work
      const digest = (error as Record<string, unknown>)?.digest;
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
      toast.error('Failed to unlock workshop. Please try again.');
    } finally {
      setIsConsuming(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* Lock icon in olive circle */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-900/50">
            <Lock className="h-6 w-6 text-olive-700 dark:text-olive-400" />
          </div>

          {/* Outcome-framed headline */}
          <DialogTitle className="text-center text-xl font-semibold">
            Your Build Pack is 4 steps away
          </DialogTitle>

          {/* Progress context */}
          <DialogDescription className="text-center text-sm text-muted-foreground">
            You&apos;ve completed 6 of 10 steps — you&apos;ve done the hard part. Unlock
            the creation phase to turn your insights into a complete Build Pack.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-1.5 px-1">
          <div className="w-full h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-olive-600 dark:bg-olive-500"
              style={{ width: '60%' }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">6 of 10 steps complete</p>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          {hasCredits ? (
            <>
              {/* Credit balance note */}
              <div className="rounded-md border bg-muted/40 px-4 py-2.5 text-center text-sm text-muted-foreground">
                You have {creditBalance} credit{creditBalance !== 1 ? 's' : ''} available
              </div>

              {/* Primary CTA: consume credit */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleUseCredit}
                disabled={isConsuming}
              >
                {isConsuming ? 'Unlocking...' : 'Use 1 Credit to Unlock'}
              </Button>
            </>
          ) : (
            <>
              {/* Primary CTA: go to pricing */}
              <Link
                href={`/pricing?return_to=${encodeURIComponent(`/workshop/${sessionId}/step/7`)}`}
                className={cn(buttonVariants({ size: 'lg' }), 'w-full text-center')}
              >
                Get 1 Credit — $79
              </Link>

              {/* Secondary option */}
              <p className="text-xs text-muted-foreground text-center">
                Or save with the 3-credit pack — $149
              </p>
            </>
          )}

          {/* Always: dismiss option */}
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Save and decide later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
