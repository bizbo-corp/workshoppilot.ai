/**
 * Step Navigation
 * Next/Back buttons for advancing through workshop steps
 * Features:
 * - Next button: marks current step complete, next step in_progress
 * - Back button: navigates to previous step (no state change)
 * - Loading state prevents double-clicks
 * - Hidden on first/last steps appropriately
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { advanceToNextStep } from '@/actions/workshop-actions';
import { STEPS } from '@/lib/workshop/step-metadata';

interface StepNavigationProps {
  sessionId: string;
  workshopId: string;
  currentStepOrder: number;
}

export function StepNavigation({
  sessionId,
  workshopId,
  currentStepOrder,
}: StepNavigationProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const isFirstStep = currentStepOrder === 1;
  const isLastStep = currentStepOrder === STEPS.length;

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
      {/* Left: Back button (hidden on step 1) */}
      {!isFirstStep ? (
        <Button variant="ghost" onClick={handleBack} disabled={isNavigating}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      ) : (
        <div /> /* Spacer */
      )}

      {/* Right: Next button (hidden on step 10) */}
      {!isLastStep ? (
        <Button onClick={handleNext} disabled={isNavigating}>
          {isNavigating ? 'Advancing...' : 'Next'}
          {!isNavigating && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
      ) : (
        <div /> /* Spacer */
      )}
    </div>
  );
}
