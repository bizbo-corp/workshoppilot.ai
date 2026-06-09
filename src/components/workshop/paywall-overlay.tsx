'use client';

/**
 * PaywallOverlay
 *
 * Rendered by the StepPage Server Component when a user reaches Step 8-10 on a
 * workshop that has not been unlocked and is not grandfathered.
 *
 * Branches by workshop.facilitatorMode + workshop.tier:
 *   - Solo workshop, balance > 0     → "Use 1 Credit to Unlock"
 *   - Solo workshop, balance = 0     → $99 Solo button + small "team upsell" link
 *   - Team workshop, no payment      → primary "$299 Team" button (full team purchase)
 *
 * White Glove is intentionally not surfaced inline (too high friction at unlock
 * moment); it lives on the pricing page and a dedicated upgrade affordance.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getCredits, consumeCredit, createCheckoutUrl } from '@/actions/billing-actions';
import { Surface } from '@/components/ui/surface';
import { CreativeStepsPreview } from './creative-steps-preview';

interface PaywallOverlayProps {
  sessionId: string;
  workshopId: string;
  stepNumber: number;
  facilitatorMode: 'solo' | 'team';
  tier: 'solo' | 'team' | 'white_glove' | null;
}

const VALUE_ITEMS = [
  {
    icon: 'palette' as const,
    title: 'Visual Ideation',
    description: 'Mind maps and Crazy 8s rapid sketching',
  },
  {
    icon: 'zap' as const,
    title: 'Concept Development',
    description: 'SWOT analysis, elevator pitches, and concept cards',
  },
  {
    icon: 'file-text' as const,
    title: 'Build Pack Output',
    description: 'Complete PRD, user stories, and tech specs',
  },
];

export function PaywallOverlay({ sessionId, workshopId, facilitatorMode }: PaywallOverlayProps) {
  const router = useRouter();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConsuming, setIsConsuming] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Solo workshops can use credit balance; team workshops cannot (team is per-workshop).
  const canUseCredits = facilitatorMode === 'solo';

  useEffect(() => {
    if (!canUseCredits) {
      setIsLoading(false);
      return;
    }
    getCredits().then((balance) => {
      setCreditBalance(balance);
      setIsLoading(false);
    });
  }, [canUseCredits]);

  async function handleUseCredit() {
    setIsConsuming(true);
    try {
      const result = await consumeCredit(workshopId);
      if (
        result.status === 'consumed' ||
        result.status === 'already_unlocked' ||
        result.status === 'grandfathered' ||
        result.status === 'paywall_disabled'
      ) {
        router.refresh();
      } else if (result.status === 'insufficient_credits') {
        toast.error('No credits available. Please purchase to continue.');
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

  async function handleCheckout(sku: 'solo' | 'team' | 'white_glove') {
    setIsCheckingOut(true);
    try {
      const result = await createCheckoutUrl({
        sku,
        workshopId: sku === 'solo' ? undefined : workshopId,
        returnUrl: `/workshop/${sessionId}/step/ideation`,
      });
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

  function handleBackToReframe() {
    router.push(`/workshop/${sessionId}/step/reframe`);
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />

      <Surface variant="panel" className="relative z-10 flex max-w-lg flex-col items-center gap-5 bg-background/95 p-8 shadow-2xl backdrop-blur-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <Icon name="sparkles" className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold">
            {facilitatorMode === 'team' ? 'Unlock the Build Pack for your team' : 'Time to get creative'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {facilitatorMode === 'team'
              ? "You've completed the discovery — now unlock visual ideation, voting, and the full Build Pack for your whole team."
              : "You've completed the research and analysis — amazing work! Now unlock the creative phase where you'll sketch, brainstorm, and develop your ideas visually."}
          </p>
        </div>

        <CreativeStepsPreview />

        <div className="w-full space-y-2">
          {VALUE_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
              <Icon name={item.icon} className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium leading-tight">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2.5">
          {/* ── Team workshop: single $299 CTA ──────────────────────────── */}
          {facilitatorMode === 'team' && (
            <button
              onClick={() => handleCheckout('team')}
              disabled={isCheckingOut}
              className="w-full rounded-lg border border-olive-500/50 bg-olive-50/30 dark:bg-olive-950/20 p-4 text-left hover:bg-olive-50/60 dark:hover:bg-olive-950/30 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-wait"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon name="users" className="h-4 w-4 text-olive-600 dark:text-olive-400" />
                  <div>
                    <p className="text-sm font-semibold">Unlock for your team</p>
                    <p className="text-xs text-muted-foreground">Up to 15 participants, real-time canvas</p>
                  </div>
                </div>
                <span className="text-lg font-bold">$299</span>
              </div>
            </button>
          )}

          {/* ── Solo workshop: credit-or-buy ─────────────────────────── */}
          {facilitatorMode === 'solo' && !isLoading && creditBalance !== null && creditBalance > 0 && (
            <>
              <div className="w-full rounded-lg border bg-muted/50 px-4 py-2.5 text-center">
                <span className="text-sm font-medium">
                  You have <span className="text-foreground">{creditBalance} {creditBalance === 1 ? 'credit' : 'credits'}</span> available
                </span>
              </div>
              <Button onClick={handleUseCredit} disabled={isConsuming} className="w-full" size="lg">
                {isConsuming ? 'Unlocking...' : 'Use 1 Credit to Unlock'}
              </Button>
            </>
          )}

          {facilitatorMode === 'solo' && !isLoading && (creditBalance === null || creditBalance === 0) && (
            <>
              <button
                onClick={() => handleCheckout('solo')}
                disabled={isCheckingOut}
                className="w-full rounded-lg border p-4 text-left hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-wait"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Solo Workshop</p>
                    <p className="text-xs text-muted-foreground">Unlock this workshop</p>
                  </div>
                  <span className="text-lg font-bold">$99</span>
                </div>
              </button>

              <button
                onClick={() => handleCheckout('team')}
                disabled={isCheckingOut}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center underline cursor-pointer disabled:opacity-50"
              >
                Need to run with a team? Get the Team Workshop for $299
              </button>
            </>
          )}

          {facilitatorMode === 'solo' && isLoading && (
            <div className="w-full rounded-lg border bg-muted/50 px-4 py-2.5 text-center">
              <span className="text-sm text-muted-foreground">Checking credit balance...</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Icon name="shield" className="h-3 w-3" />
            Secure checkout via Stripe
          </div>

          <Button onClick={handleBackToReframe} variant="ghost" className="w-full" size="default">
            Back to Step 6
          </Button>
        </div>
      </Surface>
    </div>
  );
}
