/**
 * Upgrade Dialog
 * Inline paywall dialog shown when user attempts to proceed past Step 7 without credits.
 * Emphasizes the visual/creative nature of upcoming steps (Ideation, Concept Dev, Validate)
 * to entice users after they've completed the analytical work.
 * Two CTA paths:
 *   - hasCredits=true: "Use 1 Credit to Unlock" -> consumeCredit() + advanceToNextStep()
 *   - hasCredits=false: "Get 1 Credit" -> /pricing?return_to=...
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Palette, Zap, FileText } from 'lucide-react';
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
import { CreativeStepsPreview } from './creative-steps-preview';

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          {/* Sparkle icon in amber circle */}
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Excitement-framed headline */}
          <DialogTitle className="text-center text-xl font-semibold">
            Now for the fun part
          </DialogTitle>

          {/* Context copy */}
          <DialogDescription className="text-center text-sm text-muted-foreground">
            You&apos;ve done the hard thinking — great work! Unlock the creative phase to bring your ideas to life with visual brainstorming, sketching, and concept development.
          </DialogDescription>
        </DialogHeader>

        {/* Visual preview of creative steps */}
        <CreativeStepsPreview />

        {/* What's ahead - mini step preview */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 p-2.5 text-center">
            <Palette className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-medium leading-tight">Ideation</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Mind maps & Crazy 8s sketching</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 p-2.5 text-center">
            <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-medium leading-tight">Concepts</p>
            <p className="text-[10px] text-muted-foreground leading-tight">SWOT analysis & elevator pitch</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 p-2.5 text-center">
            <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-medium leading-tight">Build Pack</p>
            <p className="text-[10px] text-muted-foreground leading-tight">PRD, stories & tech specs</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 px-1">
          <div className="w-full h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-amber-500 dark:bg-amber-400"
              style={{ width: '70%' }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">7 of 10 steps complete — 3 to go</p>
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
                href={`/pricing?return_to=${encodeURIComponent(`/workshop/${sessionId}/step/8`)}`}
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
