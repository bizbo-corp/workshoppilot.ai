/**
 * Mobile Stepper
 * Compact horizontal progress indicator for mobile
 * Tap to expand to full step list using Sheet
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { STEPS, type StepDefinition } from '@/lib/workshop/step-metadata';
import { cn } from '@/lib/utils';

interface MobileStepperProps {
  sessionId: string;
  workshopSteps: Array<{
    stepId: string;
    status: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  }>;
}

export function MobileStepper({ sessionId, workshopSteps }: MobileStepperProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Determine current step from pathname
  const stepMatch = pathname.match(/\/workshop\/[^/]+\/step\/(\d+)/);
  const currentStep = stepMatch ? parseInt(stepMatch[1], 10) : 1;

  // Create status lookup map
  const statusLookup = new Map(workshopSteps.map(s => [s.stepId, s.status]));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button suppressHydrationWarning className="flex w-full items-center justify-between border-b bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {STEPS[currentStep - 1]?.name}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </SheetTrigger>

      <SheetContent side="top" className="h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Workshop Steps</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {STEPS.map((step) => {
            const status = statusLookup.get(step.id) || 'not_started';
            const isComplete = status === 'complete';
            const needsRegen = status === 'needs_regeneration';
            const isCurrent = step.order === currentStep;
            const isAccessible = status !== 'not_started';

            const content = (
              <>
                {/* Step indicator */}
                <div
                  className={cn(
                    'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    isComplete &&
                      'bg-primary text-primary-foreground',
                    needsRegen &&
                      'border-2 border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
                    isCurrent &&
                      !needsRegen &&
                      'border-2 border-primary bg-background text-primary',
                    !isComplete &&
                      !isCurrent &&
                      !needsRegen &&
                      'border bg-background text-muted-foreground'
                  )}
                >
                  {isComplete ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    step.order
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 space-y-1">
                  <div
                    className={cn(
                      'font-medium',
                      isCurrent && 'text-primary',
                      needsRegen && 'text-amber-600 dark:text-amber-400',
                      !isCurrent && !needsRegen && 'text-foreground'
                    )}
                  >
                    {step.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.description}
                  </div>
                </div>
              </>
            );

            return isAccessible ? (
              <Link
                key={step.id}
                href={`/workshop/${sessionId}/step/${step.order}`}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 transition-colors',
                  isCurrent && 'border-primary bg-primary/5',
                  !isCurrent && 'hover:bg-muted/50'
                )}
              >
                {content}
              </Link>
            ) : (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 cursor-not-allowed opacity-50'
                )}
              >
                {content}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
