'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProgressStep } from '@/lib/schemas';
import { RAIL_SECTIONS, SECTION_LABELS, sectionStatus } from './sections';

/** Compact horizontal progress indicator across the five planning sections. */
export function ProgressRail({ progress }: { progress: ProgressStep }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Validation progress">
      {RAIL_SECTIONS.map((section, i) => {
        const status = sectionStatus(section, progress);
        return (
          <li key={section} className="flex items-center gap-1.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  status === 'done' && 'bg-primary text-primary-foreground',
                  status === 'active' && 'bg-primary/15 text-primary ring-2 ring-primary/30',
                  status === 'locked' && 'bg-muted text-foreground/70'
                )}
              >
                {status === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-sm font-medium lg:inline',
                  status === 'locked' ? 'text-foreground/70' : 'text-foreground'
                )}
              >
                {SECTION_LABELS[section]}
              </span>
            </div>
            {i < RAIL_SECTIONS.length - 1 && (
              <span
                className={cn(
                  'h-px w-4 shrink-0',
                  status === 'done' ? 'bg-primary/40' : 'bg-border'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
