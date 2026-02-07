/**
 * Mobile Stepper
 * Compact horizontal progress indicator for mobile
 * Tap to expand to full step list using Sheet
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  currentStep: number; // 1-10
  sessionId: string;
}

export function MobileStepper({ currentStep, sessionId }: MobileStepperProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex w-full items-center justify-between border-b bg-background px-4 py-3">
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
            const isComplete = step.order < currentStep;
            const isCurrent = step.order === currentStep;

            return (
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
                {/* Step indicator */}
                <div
                  className={cn(
                    'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    isComplete &&
                      'bg-primary text-primary-foreground',
                    isCurrent &&
                      'border-2 border-primary bg-background text-primary',
                    !isComplete &&
                      !isCurrent &&
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
                      !isCurrent && 'text-foreground'
                    )}
                  >
                    {step.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
