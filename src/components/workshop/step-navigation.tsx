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
import { ChevronLeft, ChevronRight, RotateCcw, Plus, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { advanceToNextStep } from '@/actions/workshop-actions';
import { STEPS } from '@/lib/workshop/step-metadata';
import { toast } from 'sonner';

interface StepNavigationProps {
  sessionId: string;
  workshopId: string;
  currentStepOrder: number;
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
}

export function StepNavigation({
  sessionId,
  workshopId,
  currentStepOrder,
  artifactConfirmed = false,
  stepExplicitlyConfirmed = false,
  stepStatus,
  isAdmin,
  onReset,
  onToggleGuideEditor,
  isGuideEditing,
  onAddGuide,
  onSaveDefaultView,
}: StepNavigationProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
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

      // Find current and next step definitions
      const currentStep = STEPS.find((s) => s.order === currentStepOrder);
      const nextStep = STEPS.find((s) => s.order === currentStepOrder + 1);

      if (!currentStep || !nextStep) {
        console.error('Step definitions not found');
        return;
      }

      // Atomically mark current complete, next in_progress, then redirect.
      // advanceToNextStep calls redirect() internally — the idiomatic Next.js
      // pattern for server action navigation (router.push doesn't work after
      // server actions with revalidatePath).
      await advanceToNextStep(
        workshopId,
        currentStep.id,
        nextStep.id,
        sessionId
      );
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

  const handleBack = () => {
    // Guard: prevent navigation from first step
    if (isFirstStep) return;

    // Navigate to previous step (no database state change needed)
    router.push(`/workshop/${sessionId}/step/${currentStepOrder - 1}`);
  };

  return (
    <div className="flex items-center justify-between border-t bg-background px-6 py-4">
      {/* Left: Back + Admin controls */}
      <div className="flex items-center gap-3">
        {!isFirstStep && (
          <Button variant="ghost" onClick={handleBack} disabled={isNavigating}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}

        {/* Admin controls toggle + revealed actions */}
        {isAdmin && onToggleGuideEditor && (
          <>
            <div className="flex items-center gap-2 ml-6">
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
              <div className="flex items-center gap-1.5 ml-1">
                {onReset && (
                  <Button
                    onClick={onReset}
                    variant="destructive"
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
                {usage && (
                  <span className="ml-2 font-mono text-xs text-amber-600 dark:text-amber-400">
                    {usage.callCount} calls · {usage.totalInputTokens.toLocaleString()}↑ {usage.totalOutputTokens.toLocaleString()}↓ · ${usage.totalCostDollars.toFixed(4)}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Next/advance button or forward navigation */}
      {!isLastStep && stepExplicitlyConfirmed ? (
        <Button
          onClick={handleNext}
          disabled={isNavigating}
          size="lg"
          className={cn(!isNavigating && 'btn-shimmer')}
        >
          {isNavigating ? 'Advancing...' : 'Next'}
          {!isNavigating && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
      ) : !isLastStep && !isCompleted ? (
        <Button
          onClick={handleNext}
          disabled={isNavigating || !artifactConfirmed}
          variant={artifactConfirmed ? 'default' : 'outline'}
        >
          {isNavigating ? 'Advancing...' : 'Next'}
          {!isNavigating && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
      ) : isCompleted && !isLastStep ? (
        <Button
          variant="ghost"
          onClick={() => router.push(`/workshop/${sessionId}/step/${currentStepOrder + 1}`)}
          disabled={isNavigating}
        >
          Next Step
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <div /> /* Spacer for last step */
      )}
    </div>
  );
}
