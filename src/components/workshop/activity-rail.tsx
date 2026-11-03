'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { STAGES, STAGE_ORDER, currentActivity } from '@/lib/engine/stages';
import type { StageId, WorkshopState } from '@/lib/engine/types';

/**
 * The map of the workshop: five stages, each with its activities, with a
 * tick for what is done and a marker for where you are. Activities in the
 * current stage are clickable; earlier and later stages are read-only.
 */
export function ActivityRail({ state, title, onOpenActivity, onViewActivity, viewing, collapsed, onToggle }: { state: WorkshopState; title: string; onOpenActivity: (id: string) => void; onViewActivity: (stage: StageId, id: string) => void; viewing: { stage: StageId; activity: string } | null; collapsed: boolean; onToggle: () => void }) {
  const current = currentActivity(state);

  return (
    <aside className={cn('flex h-full flex-col border-r border-border bg-card transition-[width]', collapsed ? 'w-12' : 'w-60')} data-rail>
      <div className={cn('flex items-center gap-2 border-b border-border px-2 py-2', collapsed && 'justify-center')}>
        <Link href="/dashboard" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Back to dashboard">
          <Icon name="arrow-left" className="h-4 w-4" />
        </Link>
        {!collapsed && <div className="min-w-0 flex-1 truncate text-xs font-medium" title={title}>{title}</div>}
        <button type="button" onClick={onToggle} aria-label={collapsed ? 'Expand the map' : 'Collapse the map'} className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:flex">
          <Icon name={collapsed ? 'arrow-right' : 'arrow-left'} className="h-3.5 w-3.5" />
        </button>
      </div>
      <ol className="scroll-quiet min-h-0 flex-1 overflow-y-auto py-2">
        {STAGE_ORDER.map((sid, si) => {
          const stage = STAGES[sid];
          const done = state.completedStages.includes(sid);
          const active = sid === state.stage;
          const future = !done && !active;
          return (
            <li key={sid} className={cn('px-2 py-1.5', future && 'opacity-60')}>
              <div className={cn('flex items-center gap-2 rounded-md px-1.5 py-1', collapsed && 'justify-center')} title={`${stage.label}: ${stage.tagline}`}>
                <StageMark index={si} done={done} active={active} />
                {!collapsed && (
                  <div className="min-w-0">
                    <div className={cn('text-xs font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>{stage.label}</div>
                  </div>
                )}
              </div>
              {!collapsed && (
                <ol className="ml-[1.35rem] mt-0.5 border-l border-border pl-3">
                  {stage.activities.map((a) => {
                    const aDone = done || a.done(state);
                    const isCurrent = active && a.id === current.id && !viewing;
                    const isViewing = viewing?.stage === sid && viewing.activity === a.id;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          disabled={future}
                          onClick={() => (active ? onOpenActivity(a.id) : onViewActivity(sid, a.id))}
                          data-activity={a.id}
                          data-current={isCurrent || undefined}
                          aria-label={`${a.label}${aDone ? ', done' : ''}${isCurrent ? ', current' : ''}`}
                          aria-current={isCurrent ? 'step' : isViewing ? 'true' : undefined}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs',
                            isCurrent || isViewing ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground',
                            !future && !isCurrent && !isViewing && 'hover:bg-accent/60 hover:text-foreground',
                            future && 'cursor-default',
                          )}
                        >
                          <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border', aDone ? 'border-olive-600 bg-olive-600 text-white' : isCurrent ? 'border-foreground' : 'border-border')}>
                            {aDone && <Icon name="check" className="h-2.5 w-2.5" />}
                          </span>
                          <span className="truncate">{a.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
      {!collapsed && (
        <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          {state.completedStages.length} of {STAGE_ORDER.length} stages done
        </div>
      )}
    </aside>
  );
}

function StageMark({ index, done, active }: { index: number; done: boolean; active: boolean }) {
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
        done ? 'bg-olive-600 text-white' : active ? 'bg-foreground text-background' : 'border border-border text-muted-foreground',
      )}
    >
      {done ? <Icon name="check" className="h-3 w-3" /> : index}
    </span>
  );
}

export function stageLabel(id: StageId): string {
  return STAGES[id].label;
}
