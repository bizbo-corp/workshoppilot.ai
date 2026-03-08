'use client';

/**
 * PaywallOverlay
 *
 * Rendered by the StepPage Server Component when a user directly navigates
 * to Step 8-10 on a workshop that has not been unlocked and is not grandfathered.
 *
 * Emphasizes the visual/creative nature of the remaining steps to entice
 * users who have completed the analytical phase (Steps 1-7).
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
import { Sparkles, Palette, Zap, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getCredits, consumeCredit } from '@/actions/billing-actions';
import { CreativeStepsPreview } from './creative-steps-preview';

interface PaywallOverlayProps {
  sessionId: string;
  workshopId: string;
  stepNumber: number;
}

const VALUE_ITEMS = [
  {
    icon: Palette,
    title: 'Visual Ideation',
    description: 'Mind maps and Crazy 8s rapid sketching',
  },
  {
    icon: Zap,
    title: 'Concept Development',
    description: 'SWOT analysis, elevator pitches, and concept cards',
  },
  {
    icon: FileText,
    title: 'Build Pack Output',
    description: 'Complete PRD, user stories, and tech specs',
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
    router.push(`/pricing?return_to=${encodeURIComponent(`/workshop/${sessionId}/step/8`)}`);
  }

  function handleBackToStep7() {
    router.push(`/workshop/${sessionId}/step/7`);
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Semi-transparent backdrop — lets the step layout show through */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />

      {/* Overlay card */}
      <div className="relative z-10 flex max-w-lg flex-col items-center gap-5 rounded-xl border bg-background/95 p-8 shadow-2xl backdrop-blur-sm">
        {/* Sparkle icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <Sparkles className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Heading */}
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold">Time to get creative</h2>
          <p className="text-sm text-muted-foreground">
            You&apos;ve completed the research and analysis — amazing work! Now unlock the creative phase where you&apos;ll sketch, brainstorm, and develop your ideas visually.
          </p>
        </div>

        {/* Visual preview of creative steps */}
        <CreativeStepsPreview />

        {/* Value proposition */}
        <div className="w-full space-y-2">
          {VALUE_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
              <item.icon className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
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
            onClick={handleBackToStep7}
            variant="ghost"
            className="w-full"
            size="default"
          >
            Back to Step 7
          </Button>
        </div>
      </div>
    </div>
  );
}
