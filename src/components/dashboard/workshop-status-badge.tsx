'use client';

import { CheckCircle2, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkshopStatus = 'completed' | 'active' | 'stalled';

interface WorkshopStatusBadgeProps {
  status: WorkshopStatus;
}

export function WorkshopStatusBadge({ status }: WorkshopStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'completed' && 'bg-olive-100 text-olive-700 dark:bg-olive-900/40 dark:text-olive-400',
        status === 'active' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
        status === 'stalled' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
      )}
    >
      {status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'active' && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" /></span>}
      {status === 'stalled' && <Pause className="h-3 w-3" />}
      {status === 'completed' ? 'Completed' : status === 'active' ? 'Active' : 'Stalled'}
    </span>
  );
}
