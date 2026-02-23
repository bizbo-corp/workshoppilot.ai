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

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, RotateCcw, Plus, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { advanceToNextStep } from '@/actions/workshop-actions';
import { STEPS } from '@/lib/workshop/step-metadata';

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
      // redirect() throws NEXT_REDIRECT which is caught here — this is normal.
      // Only log real errors.
      if (error instanceof Error && !error.message.includes('NEXT_REDIRECT')) {
        console.error('Failed to advance to next step:', error);
      }
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
            <div className="flex items-center gap-2 ml-1">
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
                    variant="ghost"
                    size="sm"
                    disabled={isNavigating}
                    className="text-muted-foreground hover:text-destructive"
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
                    Add Guide
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
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Next/advance button or forward navigation */}
      {!isLastStep && !isCompleted ? (
        <Button
          onClick={handleNext}
          disabled={isNavigating || !artifactConfirmed}
          variant={artifactConfirmed ? 'default' : 'outline'}
          size={stepExplicitlyConfirmed ? 'lg' : 'default'}
          className={cn(stepExplicitlyConfirmed && !isNavigating && 'btn-shimmer')}
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
