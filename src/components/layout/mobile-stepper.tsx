/**
 * Mobile Stepper
 * Compact horizontal progress indicator for mobile
 * Tap to expand to full step list using Sheet
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Check, Eye, Lock } from 'lucide-react';
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
import { StepSnapshotDialog } from '@/components/dialogs/step-snapshot-dialog';

interface MobileStepperProps {
  sessionId: string;
  workshopSteps: Array<{
    stepId: string;
    status: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
    snapshotUrl?: string | null;
  }>;
  isPaywallLocked?: boolean;
}

export function MobileStepper({ sessionId, workshopSteps, isPaywallLocked }: MobileStepperProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Determine current step from pathname
  const stepMatch = pathname.match(/\/workshop\/[^/]+\/step\/(\d+)/);
  const currentStep = stepMatch ? parseInt(stepMatch[1], 10) : 1;

  // Create status lookup map
  const statusLookup = new Map(workshopSteps.map(s => [s.stepId, s.status]));
  const snapshotLookup = new Map(workshopSteps.map(s => [s.stepId, s.snapshotUrl]));
  const [viewingSnapshot, setViewingSnapshot] = useState<{ stepName: string; snapshotUrl: string } | null>(null);

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button suppressHydrationWarning className="flex w-full items-center justify-between border-b bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">
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
            const isCurrent = step.order === currentStep;
            const isAccessible = status !== 'not_started';
            const isLocked = isPaywallLocked && step.order >= 8;

            const content = (
              <>
                {/* Step indicator */}
                <div
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium',
                    isComplete &&
                      'bg-primary text-primary-foreground',
                    isCurrent &&
                      !isComplete &&
                      'border-2 border-primary bg-background text-primary',
                    !isComplete &&
                      !isCurrent &&
                      'border bg-background text-muted-foreground',
                    isLocked && !isComplete && !isCurrent &&
                      'border bg-background text-muted-foreground opacity-60',
                  )}
                >
                  {isLocked ? (
                    <Lock className="h-3 w-3" />
                  ) : isComplete ? (
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
                  <div className="text-sm text-muted-foreground">
                    {step.description}
                  </div>
                </div>
              </>
            );

            const snapshot = snapshotLookup.get(step.id);

            return isAccessible ? (
              <div key={step.id} className="relative">
                <Link
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
                {isComplete && snapshot && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setViewingSnapshot({ stepName: step.name, snapshotUrl: snapshot });
                    }}
                    className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title={`View ${step.name} snapshot`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
              </div>
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

    {viewingSnapshot && (
      <StepSnapshotDialog
        open={!!viewingSnapshot}
        onOpenChange={(open) => { if (!open) setViewingSnapshot(null); }}
        stepName={viewingSnapshot.stepName}
        snapshotUrl={viewingSnapshot.snapshotUrl}
      />
    )}
    </>
  );
}
