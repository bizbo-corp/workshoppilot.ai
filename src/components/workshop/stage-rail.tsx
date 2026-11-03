import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { STAGES, STAGE_ORDER } from '@/lib/engine/stages';
import type { StageId } from '@/lib/engine/types';

export function StageRail({ title, current, completed }: { title: string; current: StageId; completed: StageId[] }) {
  return (
    <div className="flex items-center gap-4 border-b border-border bg-card px-4 py-2">
      <Link href="/dashboard" className="text-muted-foreground hover:text-foreground" aria-label="Back to dashboard">
        <Icon name="arrow-left" className="h-4 w-4" />
      </Link>
      <div className="min-w-0 flex-1 truncate text-sm font-medium">{title}</div>
      <ol className="hidden items-center gap-1 sm:flex">
        {STAGE_ORDER.map((id, i) => {
          const done = completed.includes(id);
          const active = id === current;
          return (
            <li key={id} className="flex items-center gap-1">
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
                  active && 'bg-primary text-primary-foreground',
                  done && !active && 'text-olive-700 dark:text-olive-300',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {done ? <Icon name="check" className="h-3 w-3" /> : <span className="tabular-nums">{i}</span>}
                {STAGES[id].label}
              </span>
              {i < STAGE_ORDER.length - 1 && <span className="h-px w-3 bg-border" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
