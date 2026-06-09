'use client';

import * as React from 'react';
import { Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { SectionStatus } from './sections';

/**
 * Shared shell for a validation-flow section.
 * - active: full content shown
 * - done: compact summary + Edit affordance
 * - locked: dimmed, content hidden
 */
export function SectionCard({
  index,
  title,
  status,
  summary,
  onEdit,
  headerRight,
  children,
}: {
  index: number;
  title: string;
  status: SectionStatus;
  /** Compact summary shown when status === 'done'. */
  summary?: React.ReactNode;
  onEdit?: () => void;
  /** Optional control rendered top-right of the header while the section is active. */
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-5 transition-colors',
        status === 'active' && 'border-primary/30 bg-card shadow-sm',
        status === 'done' && 'border-border bg-card/60',
        status === 'locked' && 'border-dashed border-border bg-muted/30 opacity-60'
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-semibold',
            status === 'done'
              ? 'bg-primary text-primary-foreground'
              : status === 'active'
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-foreground/70'
          )}
        >
          {status === 'done' ? <Check className="h-4 w-4" /> : index}
        </span>
        <h3 className="flex-1 text-xl font-semibold tracking-tight">{title}</h3>
        {status === 'active' && headerRight}
        {status === 'done' && onEdit && (
          <Button variant="ghost" size="xs" onClick={onEdit} className="gap-1">
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        )}
      </div>

      {status === 'done' && summary != null && (
        <div className="mt-3 pl-10 text-base text-foreground/70">{summary}</div>
      )}

      {status === 'active' && children != null && (
        <div className="mt-4 pl-10">{children}</div>
      )}
    </section>
  );
}
