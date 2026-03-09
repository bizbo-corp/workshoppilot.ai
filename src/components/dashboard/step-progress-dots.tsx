'use client';

import { STEPS } from '@/lib/workshop/step-metadata';
import { cn } from '@/lib/utils';

interface StepStatus {
  stepId: string;
  status: string;
}

interface StepProgressDotsProps {
  steps: StepStatus[];
  compact?: boolean;
}

function getDotColor(status: string): string {
  switch (status) {
    case 'complete':
    case 'needs_regeneration':
      return 'bg-green-600 dark:bg-green-500';
    case 'in_progress':
      return 'bg-amber-500';
    default:
      return 'bg-neutral-olive-300 dark:bg-neutral-olive-600';
  }
}

export function StepProgressDots({ steps, compact = false }: StepProgressDotsProps) {
  const stepMap = new Map(steps.map((s) => [s.stepId, s.status]));
  const dotSize = compact ? 'size-1.5' : 'size-2';

  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-1.5')}>
      {STEPS.map((step) => {
        const status = stepMap.get(step.id) || 'not_started';
        const stepDef = STEPS.find((s) => s.id === step.id);
        return (
          <div
            key={step.id}
            className={cn('rounded-full', dotSize, getDotColor(status))}
            title={stepDef ? `${stepDef.name}: ${status.replace('_', ' ')}` : status}
          />
        );
      })}
    </div>
  );
}
