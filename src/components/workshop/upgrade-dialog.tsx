/**
 * Upgrade Dialog
 * Inline paywall dialog shown when user attempts to proceed past Step 7 without credits.
 * Emphasizes the visual/creative nature of upcoming steps (Ideation, Concept Dev, Validate)
 * to entice users after they've completed the analytical work.
 * Two CTA paths:
 *   - hasCredits=true: "Use 1 Credit to Unlock" -> consumeCredit() + advanceToNextStep()
 *   - hasCredits=false: Inline pricing tiers -> createCheckoutUrl() -> Stripe Checkout
 */

'use client';

import { useState } from 'react';
import { Sparkles, Palette, Zap, FileText, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { consumeCredit, createCheckoutUrl } from '@/actions/billing-actions';
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
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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

  async function handleCheckout(tier: 'single' | 'pack') {
    setIsCheckingOut(true);
    try {
      const result = await createCheckoutUrl(tier, `/workshop/${sessionId}/step/8`);
      if ('url' in result) {
        window.location.href = result.url;
      } else {
        toast.error(result.error);
        setIsCheckingOut(false);
      }
    } catch {
      toast.error('Failed to start checkout. Please try again.');
      setIsCheckingOut(false);
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
              {/* Inline pricing tiers */}
              <div className="space-y-2.5">
                {/* Single credit */}
                <button
                  onClick={() => handleCheckout('single')}
                  disabled={isCheckingOut}
                  className="w-full rounded-lg border p-4 text-left hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-wait"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">1 Workshop Credit</p>
                      <p className="text-xs text-muted-foreground">Unlock this workshop</p>
                    </div>
                    <span className="text-lg font-bold">$99</span>
                  </div>
                </button>

                {/* 3-credit pack */}
                <button
                  onClick={() => handleCheckout('pack')}
                  disabled={isCheckingOut}
                  className="w-full rounded-lg border border-olive-500/50 bg-olive-50/30 dark:bg-olive-950/20 p-4 text-left hover:bg-olive-50/60 dark:hover:bg-olive-950/30 transition-colors relative disabled:opacity-50 cursor-pointer disabled:cursor-wait"
                >
                  <span className="absolute -top-2.5 right-3 text-[10px] font-semibold bg-olive-100 dark:bg-olive-900 text-olive-700 dark:text-olive-300 rounded-full px-2 py-0.5">
                    Save $98
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">3 Workshop Credits</p>
                      <p className="text-xs text-muted-foreground">$66 per workshop</p>
                    </div>
                    <span className="text-lg font-bold">$199</span>
                  </div>
                </button>
              </div>

              {/* Trust signal */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Shield className="h-3 w-3" />
                Secure checkout via Stripe · Credits never expire
              </div>
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
