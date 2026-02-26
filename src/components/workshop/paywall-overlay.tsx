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
import { Lock, Lightbulb, Zap, FileText, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getCredits, consumeCredit } from '@/actions/billing-actions';

interface PaywallOverlayProps {
  sessionId: string;
  workshopId: string;
  stepNumber: number;
}

const VALUE_ITEMS = [
  {
    icon: Lightbulb,
    title: 'Reframe Your Challenge',
    description: 'Transform insights into powerful "How Might We" statements',
  },
  {
    icon: Palette,
    title: 'AI-Powered Ideation',
    description: 'Generate and sketch ideas with Crazy 8s visual brainstorming',
  },
  {
    icon: Zap,
    title: 'Concept Development',
    description: 'Develop your best ideas into concrete, testable concepts',
  },
  {
    icon: FileText,
    title: 'Build Pack Output',
    description: 'Get a complete PRD, user stories, and tech specs for your dev team',
  },
];

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
      {/* Semi-transparent backdrop — lets the step layout show through */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />

      {/* Overlay card */}
      <div className="relative z-10 flex max-w-lg flex-col items-center gap-5 rounded-xl border bg-background/95 p-8 shadow-2xl backdrop-blur-sm">
        {/* Lock icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-900/50">
          <Lock className="h-8 w-8 text-olive-700 dark:text-olive-400" />
        </div>

        {/* Heading */}
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold">Unlock Steps 7-10</h2>
          <p className="text-sm text-muted-foreground">
            You&apos;ve completed the discovery phase. Use a credit to unlock the creation phase and turn your insights into action.
          </p>
        </div>

        {/* Value proposition */}
        <div className="w-full grid grid-cols-2 gap-3">
          {VALUE_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3">
              <item.icon className="h-4 w-4 text-olive-600 dark:text-olive-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium leading-tight">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Credit balance display */}
        <div className="w-full rounded-lg border bg-muted/50 px-4 py-2.5 text-center">
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
        <div className="flex w-full flex-col gap-2.5">
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
                From $79 for one workshop credit
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
