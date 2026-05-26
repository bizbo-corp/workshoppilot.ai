/**
 * Step Navigation
 * Next/Back buttons for advancing through workshop steps
 * Features:
 * - Next button: marks current step complete, next step in_progress
 * - Back button: navigates to previous step (no state change)
 * - Admin controls toggle: reveals Reset + Add Sticker when active
 * - Loading state prevents double-clicks
 * - Hidden on first/last steps appropriately
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, RotateCcw, Plus, Camera, CheckCircle2, MessageSquare, Aperture } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { advanceToNextStep } from '@/actions/workshop-actions';
import { STEPS } from '@/lib/workshop/step-metadata';
import { toast } from 'sonner';
import { UpgradeDialog } from '@/components/workshop/upgrade-dialog';
import { DialogueFeedbackDialog } from '@/components/workshop/dialogue-feedback-dialog';
import { WorktreeBadge } from '@/components/dev/worktree-badge';

interface StepNavigationProps {
  sessionId: string;
  workshopId: string;
  currentStepOrder: number;
  /** Drives the paywall/upgrade dialog branching: 'solo' shows credit/$99 path, 'team' shows $299 path. */
  facilitatorMode?: 'solo' | 'team';
  artifactConfirmed?: boolean;
  /** Explicit user confirmation (Accept button click) — controls the shimmer effect */
  stepExplicitlyConfirmed?: boolean;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  isAdmin?: boolean;
  onReset?: () => void;
  onToggleGuideEditor?: () => void;
  isGuideEditing?: boolean;
  onAddGuide?: (position: { x: number; y: number }) => void;
  onSaveDefaultView?: () => void;
  /** Step 10 completion props */
  onCompleteWorkshop?: () => void;
  isCompletingWorkshop?: boolean;
  workshopCompleted?: boolean;
  canCompleteWorkshop?: boolean;
  /** Flush pending canvas changes to DB before navigating away */
  onFlushCanvas?: () => Promise<void>;
  /**
   * When set, disables the Next button regardless of artifactConfirmed and shows the
   * reason as a tooltip. Used by team-mode Step 1 to enforce the invite + schedule wall.
   */
  nextDisabledReason?: string | null;
  /**
   * Override label for the Next button. When set together with `nextOnClick`, the button
   * displays this label and calls the override handler instead of `advanceToNextStep`.
   * Used by team-mode Step 1 to surface the Setup Workshop wizard.
   */
  nextLabelOverride?: string;
  /**
   * Override click handler for the Next button. When set, replaces the default
   * advanceToNextStep call. Receives the click event so the caller can stop propagation.
   */
  nextOnClickOverride?: () => void;
}

export function StepNavigation({
  sessionId,
  workshopId,
  currentStepOrder,
  facilitatorMode = 'solo',
  artifactConfirmed = false,
  stepExplicitlyConfirmed = false,
  stepStatus,
  isAdmin,
  onReset,
  onToggleGuideEditor,
  isGuideEditing,
  onAddGuide,
  onSaveDefaultView,
  onCompleteWorkshop,
  isCompletingWorkshop = false,
  workshopCompleted = false,
  canCompleteWorkshop = false,
  onFlushCanvas,
  nextDisabledReason,
  nextLabelOverride,
  nextOnClickOverride,
}: StepNavigationProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [paywallState, setPaywallState] = useState<{ hasCredits: boolean; creditBalance: number } | null>(null);
  const [usage, setUsage] = useState<{
    callCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalImages: number;
    totalCostDollars: number;
  } | null>(null);
  const isFirstStep = currentStepOrder === 1;
  const isLastStep = currentStepOrder === STEPS.length;
  const isCompleted = stepStatus === 'complete';

  // Poll usage API when admin toggle is on
  useEffect(() => {
    if (!isAdmin || !isGuideEditing) {
      setUsage(null);
      return;
    }

    const fetchUsage = async () => {
      try {
        const res = await fetch(`/api/workshops/${workshopId}/usage`);
        if (res.ok) setUsage(await res.json());
      } catch {
        // Silently ignore fetch errors
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 10_000);
    return () => clearInterval(interval);
  }, [workshopId, isAdmin, isGuideEditing]);

  const handleNext = async () => {
    // Guard: prevent double-clicks and navigation from last step
    if (isNavigating || isLastStep) return;

    try {
      setIsNavigating(true);

      // Flush pending canvas changes before navigating
      try {
        await onFlushCanvas?.();
      } catch (e) {
        console.warn('Canvas flush before next failed:', e);
      }

      // Find current and next step definitions
      const currentStep = STEPS.find((s) => s.order === currentStepOrder);
      const nextStep = STEPS.find((s) => s.order === currentStepOrder + 1);

      if (!currentStep || !nextStep) {
        console.error('Step definitions not found');
        return;
      }

      // STEP_CHANGED broadcast to participants happens server-side inside
      // advanceToNextStep, after the DB status writes commit. Sending it from
      // the client before the action runs lost the race against slow Neon
      // cold starts — participants would arrive while the next step was still
      // `not_started` and bounce off sequential enforcement.

      // Atomically mark current complete, next in_progress, then redirect.
      // advanceToNextStep either calls redirect() (throws NEXT_REDIRECT) for normal
      // navigation, or returns { paywallRequired: true } when the credit gate fires.
      const result = await advanceToNextStep(
        workshopId,
        currentStep.id,
        nextStep.id,
        sessionId
      );

      // If we reach here, redirect() did NOT fire — this is the paywall return
      if ('paywallRequired' in result && result.paywallRequired) {
        setPaywallState({ hasCredits: result.hasCredits, creditBalance: result.creditBalance });
        setShowUpgradeDialog(true);
        setIsNavigating(false);
        return;
      }
    } catch (error) {
      // redirect() throws NEXT_REDIRECT — must rethrow so Next.js handles navigation
      const digest = (error as Record<string, unknown>)?.digest;
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
      console.error('Failed to advance to next step:', error);
      toast.error('Failed to advance — please try again.');
      setIsNavigating(false);
    }
  };

  const handleBack = async () => {
    // Guard: prevent navigation from first step
    if (isFirstStep) return;

    // Flush pending canvas changes before navigating
    try {
      await onFlushCanvas?.();
    } catch (e) {
      console.warn('Canvas flush before back failed:', e);
    }

    // Navigate to previous step (no database state change needed)
    router.push(`/workshop/${sessionId}/step/${currentStepOrder - 1}`);
  };

  return (
    <>
    <div className="relative flex items-center border-t bg-background px-6 py-4">
      {/* Left: Back button + Admin controls */}
      <div className="flex items-center gap-3">
        {!isFirstStep && (
          <Button variant="ghost" onClick={handleBack} disabled={isNavigating}>
            Back
          </Button>
        )}

      {isAdmin && onToggleGuideEditor && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="admin-controls"
              checked={!!isGuideEditing}
              onCheckedChange={() => onToggleGuideEditor()}
              disabled={isNavigating}
            />
            <label
              htmlFor="admin-controls"
              className="text-xs font-medium text-muted-foreground select-none cursor-pointer"
            >
              Admin
            </label>
          </div>

          {isGuideEditing && (
            <>
              {onReset && (
                <Button
                  onClick={onReset}
                  variant="outline"
                  size="sm"
                  disabled={isNavigating}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
              {onAddGuide && (
                <Button
                  onClick={(e) => onAddGuide({ x: e.clientX, y: e.clientY })}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Artifact
                </Button>
              )}
              {onSaveDefaultView && (
                <Button
                  onClick={onSaveDefaultView}
                  variant="outline"
                  size="sm"
                  disabled={isNavigating}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Save Default View
                </Button>
              )}
              <Button
                onClick={async () => {
                  const currentStep = STEPS.find((s) => s.order === currentStepOrder);
                  if (!currentStep) return;
                  setIsCapturing(true);
                  try {
                    const { captureSingleStep } = await import('@/lib/capture/capture-single-step');
                    const imageBase64 = await captureSingleStep(currentStep.id, {});
                    if (imageBase64) {
                      const res = await fetch('/api/upload-step-snapshot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64, workshopId, stepId: currentStep.id }),
                      });
                      if (res.ok) {
                        toast.success('Snapshot captured');
                      } else {
                        toast.error('Snapshot upload failed');
                      }
                    } else {
                      toast.error('No canvas found to capture');
                    }
                  } catch (err) {
                    console.error('[admin-snapshot]', err);
                    toast.error('Snapshot capture failed');
                  } finally {
                    setIsCapturing(false);
                  }
                }}
                variant="outline"
                size="sm"
                disabled={isCapturing}
              >
                <Aperture className={cn("mr-2 h-4 w-4", isCapturing && "animate-spin")} />
                {isCapturing ? 'Capturing...' : 'Snapshot'}
              </Button>
              <Button
                onClick={() => setShowFeedbackDialog(true)}
                variant="outline"
                size="sm"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Feedback
              </Button>
              {usage && (
                <span className="ml-2 whitespace-nowrap font-mono text-xs text-amber-600 dark:text-amber-400">
                  {usage.callCount} calls · {usage.totalInputTokens.toLocaleString()}↑ {usage.totalOutputTokens.toLocaleString()}↓ · ${usage.totalCostDollars.toFixed(4)}
                </span>
              )}
            </>
          )}
        </div>
      )}
      </div>

      {/* Right: Next button */}
      <div className="ml-auto flex items-center gap-3">
        <WorktreeBadge />

      {/* Right: Next/advance button or forward navigation */}
        {!isLastStep && stepExplicitlyConfirmed ? (
          <Button
            onClick={nextOnClickOverride ?? handleNext}
            disabled={isNavigating || !!nextDisabledReason}
            title={nextDisabledReason ?? undefined}
            size="lg"
            className={cn(!isNavigating && !nextDisabledReason && 'btn-shimmer')}
          >
            {isNavigating ? 'Advancing...' : (nextLabelOverride ?? 'Next')}
            {!isNavigating && !nextLabelOverride && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        ) : !isLastStep && !isCompleted ? (
          <Button
            onClick={nextOnClickOverride ?? handleNext}
            disabled={isNavigating || !artifactConfirmed || !!nextDisabledReason}
            title={nextDisabledReason ?? undefined}
            variant={artifactConfirmed && !nextDisabledReason ? 'default' : 'outline'}
          >
            {isNavigating ? 'Advancing...' : (nextLabelOverride ?? 'Next')}
            {!isNavigating && !nextLabelOverride && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        ) : isCompleted && !isLastStep ? (
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                await onFlushCanvas?.();
              } catch (e) {
                console.warn('Canvas flush before forward nav failed:', e);
              }
              router.push(`/workshop/${sessionId}/step/${currentStepOrder + 1}`);
            }}
            disabled={isNavigating}
          >
            Next Step
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : isLastStep && workshopCompleted ? (
          /* Workshop already completed — show non-interactive badge */
          <Button
            variant="outline"
            size="lg"
            disabled
            className="text-olive-700 dark:text-olive-400 border-olive-500/40 bg-olive-500/10 cursor-default"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Workshop Complete
          </Button>
        ) : isLastStep && canCompleteWorkshop ? (
          /* Extraction done, workshop not yet completed */
          <Button
            onClick={onCompleteWorkshop}
            disabled={isCompletingWorkshop}
            size="lg"
            className={cn(!isCompletingWorkshop && 'btn-shimmer')}
          >
            {isCompletingWorkshop ? 'Completing...' : 'Complete Workshop'}
          </Button>
        ) : (
          <div /> /* Spacer for last step (extraction not done yet) */
        )}
      </div>
    </div>

    {showUpgradeDialog && paywallState && (
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        workshopId={workshopId}
        sessionId={sessionId}
        currentStepOrder={currentStepOrder}
        hasCredits={paywallState.hasCredits}
        creditBalance={paywallState.creditBalance}
        facilitatorMode={facilitatorMode}
      />
    )}

    <DialogueFeedbackDialog
      open={showFeedbackDialog}
      onOpenChange={setShowFeedbackDialog}
      workshopId={workshopId}
      sessionId={sessionId}
      currentStepOrder={currentStepOrder}
    />
    </>
  );
}
