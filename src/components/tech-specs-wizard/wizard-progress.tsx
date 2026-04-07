'use client';

import { Progress } from '@/components/ui/progress';
import { WIZARD_PAGES, TOTAL_WIZARD_PAGES } from '@/lib/tech-specs-wizard/wizard-pages';

interface WizardProgressProps {
  currentPage: number;
  isSummary: boolean;
}

export function WizardProgress({ currentPage, isSummary }: WizardProgressProps) {
  const progress = isSummary ? 100 : ((currentPage + 1) / TOTAL_WIZARD_PAGES) * 100;
  const label = isSummary
    ? 'Review & Generate'
    : WIZARD_PAGES[currentPage]?.title ?? '';

  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-1.5" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isSummary ? 'Summary' : `${currentPage + 1} of ${TOTAL_WIZARD_PAGES}`}
          {' — '}
          <span className="font-medium text-foreground">{label}</span>
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
