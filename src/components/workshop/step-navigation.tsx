/**
 * Step Navigation
 * Next/Back buttons for advancing through workshop steps
 * Features:
 * - Next button: marks current step complete, next step in_progress
 * - Back button: navigates to previous step (no state change)
 * - Revise button: shown on completed steps, triggers cascade invalidation
 * - Loading state prevents double-clicks
 * - Hidden on first/last steps appropriately
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, AlertTriangle, RotateCcw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { advanceToNextStep } from '@/actions/workshop-actions';
import { STEPS } from '@/lib/workshop/step-metadata';
import { useDevOutput } from '@/hooks/use-dev-output';
import { cn } from '@/lib/utils';

interface StepNavigationProps {
  sessionId: string;
  workshopId: string;
  currentStepOrder: number;
  artifactConfirmed?: boolean;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  onRevise?: () => void;
  onReset?: () => void;
}

export function StepNavigation({
  sessionId,
  workshopId,
  currentStepOrder,
  artifactConfirmed = false,
  stepStatus,
  onRevise,
  onReset,
}: StepNavigationProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { isDevMode, devOutputEnabled, toggleDevOutput } = useDevOutput();

  const isFirstStep = currentStepOrder === 1;
  const isLastStep = currentStepOrder === STEPS.length;
  const isCompleted = stepStatus === 'complete';

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

      // Atomically mark current complete and next in_progress
      await advanceToNextStep(
        workshopId,
        currentStep.id,
        nextStep.id,
        sessionId
      );

      // Navigate to next step
      router.push(`/workshop/${sessionId}/step/${currentStepOrder + 1}`);
    } catch (error) {
      console.error('Failed to advance to next step:', error);
    } finally {
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
      {/* Left: Dev toggle, Back and Reset buttons */}
      <div className="flex items-center gap-2">
        {isDevMode && (
          <Button
            onClick={toggleDevOutput}
            variant="ghost"
            size="sm"
            className={cn(
              "text-muted-foreground",
              devOutputEnabled && "text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-950 dark:hover:bg-amber-900"
            )}
            title={devOutputEnabled ? "Hide output panel" : "Show output panel"}
          >
            <Bug className="h-4 w-4" />
          </Button>
        )}
        {!isFirstStep && (
          <Button variant="ghost" onClick={handleBack} disabled={isNavigating}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        {(stepStatus === 'in_progress' || stepStatus === 'needs_regeneration') && onReset && (
          <Button
            onClick={onReset}
            variant="ghost"
            size="sm"
            disabled={isNavigating}
            className="text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {/* Right: Conditional button based on step status */}
      {isCompleted ? (
        // Viewing a completed step: show Revise button (no Next button)
        <Button
          onClick={onRevise}
          disabled={isNavigating}
          variant="outline"
          className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Revise This Step
        </Button>
      ) : !isLastStep ? (
        // In progress or needs_regeneration: show Next button
        <Button
          onClick={handleNext}
          disabled={isNavigating}
          variant={artifactConfirmed ? 'default' : 'outline'}
        >
          {isNavigating ? 'Advancing...' : artifactConfirmed ? 'Next' : 'Skip to Next'}
          {!isNavigating && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
      ) : (
        <div /> /* Spacer for last step */
      )}
    </div>
  );
}
