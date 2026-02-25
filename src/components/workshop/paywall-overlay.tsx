'use client';

/**
 * PaywallOverlay
 *
 * Rendered by the StepPage Server Component when a user directly navigates
 * to Step 7-10 on a workshop that has not been unlocked and is not grandfathered.
 *
 * Fetches the current credit balance on mount to decide which CTA to show:
 * - balance > 0: "Use 1 Credit to Unlock" — calls consumeCredit() server action
 * - balance === 0: "Buy Credits" — navigates to /pricing
 *
 * On successful consumeCredit, calls router.refresh() to re-render the Server
 * Component, which will now see creditConsumedAt set and render the real step.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getCredits, consumeCredit } from '@/actions/billing-actions';

interface PaywallOverlayProps {
  sessionId: string;
  workshopId: string;
  stepNumber: number;
}

export function PaywallOverlay({ sessionId, workshopId, stepNumber }: PaywallOverlayProps) {
  const router = useRouter();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConsuming, setIsConsuming] = useState(false);

  useEffect(() => {
    getCredits().then((balance) => {
      setCreditBalance(balance);
      setIsLoading(false);
    });
  }, []);

  async function handleUseCredit() {
    setIsConsuming(true);
    try {
      const result = await consumeCredit(workshopId);
      if (result.status === 'consumed' || result.status === 'already_unlocked' || result.status === 'grandfathered' || result.status === 'paywall_disabled') {
        // Credit consumed (or workshop already unlocked by another path) — refresh Server Component
        router.refresh();
      } else if (result.status === 'insufficient_credits') {
        toast.error('No credits available. Please purchase credits to continue.');
        setCreditBalance(0);
      } else {
        toast.error(result.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      toast.error('Failed to unlock workshop. Please try again.');
    } finally {
      setIsConsuming(false);
    }
  }

  function handleBuyCredits() {
    router.push('/pricing');
  }

  function handleBackToStep6() {
    router.push(`/workshop/${sessionId}/step/6`);
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Blurred background — decorative locked content hints */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="blur-md opacity-30 h-full w-full">
          <div className="absolute top-8 left-8 h-32 w-64 rounded-lg bg-muted border" />
          <div className="absolute top-8 right-8 h-32 w-48 rounded-lg bg-muted border" />
          <div className="absolute top-48 left-1/4 h-24 w-72 rounded-lg bg-muted border" />
          <div className="absolute top-48 right-1/4 h-24 w-56 rounded-lg bg-muted border" />
          <div className="absolute bottom-24 left-12 h-40 w-80 rounded-lg bg-muted border" />
          <div className="absolute bottom-24 right-12 h-40 w-64 rounded-lg bg-muted border" />
          {/* Gradient blobs */}
          <div className="absolute top-1/4 left-1/3 h-48 w-48 rounded-full bg-primary/10" />
          <div className="absolute bottom-1/3 right-1/4 h-36 w-36 rounded-full bg-primary/8" />
        </div>
      </div>

      {/* Overlay card */}
      <div className="relative z-10 flex max-w-md flex-col items-center gap-6 rounded-xl border bg-background/90 p-8 shadow-lg backdrop-blur-sm">
        {/* Lock icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>

        {/* Heading */}
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold">Unlock Steps 7-10</h2>
          <p className="text-sm text-muted-foreground">
            Use a credit to continue your workshop and access Steps 7 through 10.
          </p>
        </div>

        {/* Credit balance display */}
        <div className="w-full rounded-lg border bg-muted/50 px-4 py-3 text-center">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Checking credit balance...</span>
          ) : creditBalance !== null && creditBalance > 0 ? (
            <span className="text-sm font-medium">
              You have <span className="text-foreground">{creditBalance} {creditBalance === 1 ? 'credit' : 'credits'}</span> available
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No credits available</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex w-full flex-col gap-3">
          {!isLoading && creditBalance !== null && creditBalance > 0 ? (
            <Button
              onClick={handleUseCredit}
              disabled={isConsuming}
              className="w-full"
              size="lg"
            >
              {isConsuming ? 'Unlocking...' : 'Use 1 Credit to Unlock'}
            </Button>
          ) : !isLoading ? (
            <>
              <Button
                onClick={handleBuyCredits}
                className="w-full"
                size="lg"
              >
                Buy Credits
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Starting at $79 for one workshop credit
              </p>
            </>
          ) : null}

          <Button
            onClick={handleBackToStep6}
            variant="ghost"
            className="w-full"
            size="default"
          >
            Back to Step 6
          </Button>
        </div>
      </div>
    </div>
  );
}
