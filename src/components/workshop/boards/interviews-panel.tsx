'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { BOARDS } from '@/lib/engine/boards';
import { endInterview } from '@/actions/board';
import { useBoard, itemsIn } from './board-context';
import { BoardFrame, Sticky, Zone } from './sticky';

/**
 * Research. Interviewees on the left (who to talk to, which are practice),
 * notes on the right split into what real people said and what came out
 * of practice interviews. Practice is labelled everywhere it appears.
 */
export function InterviewsPanel({ onAskToInterview }: { onAskToInterview: (name: string) => void }) {
  const { state, workshopId, onChange } = useBoard();
  const [pending, start] = useTransition();
  const people = itemsIn(state, 'interviewees', 'list');
  const active = state.interview;

  return (
    <div className="space-y-4">
      <BoardFrame
        title={BOARDS.interviewees.label}
        hint="Practice means Wanda plays the part; only real people count as evidence"
        actions={
          active ? (
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await endInterview(workshopId);
                  if (r.success) onChange(r.data.state);
                  else toast.error(r.error);
                })
              }
            >
              End interview
            </Button>
          ) : null
        }
      >
        <div className="p-3" data-zone-container="list">
          {people.length === 0 ? (
            <p className="text-xs text-muted-foreground">Wanda suggests people from your stakeholder map once you pick practice or real interviews.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {people.map((p) => {
                const isActive = active?.itemId === p.id;
                const done = p.meta?.done === true;
                const kind = p.meta?.kind === 'real' ? 'real' : 'practice';
                return (
                  <li key={p.id} className={cn('rounded-md border p-2.5', isActive ? 'border-olive-500 bg-olive-50/60 dark:bg-neutral-olive-900/40' : 'border-border bg-background')}>
                    <div className="flex items-start justify-between gap-2">
                      <Sticky item={p} className="border-0 bg-transparent p-0 text-sm shadow-none" badge={<span className={cn('rounded-sm px-1 py-0.5', kind === 'practice' ? 'bg-muted' : 'bg-olive-100 text-olive-900 dark:bg-neutral-olive-800 dark:text-olive-200')}>{kind}</span>} />
                    </div>
                    {typeof p.meta?.tension === 'string' && <p className="mt-1 text-[11px] text-muted-foreground">{p.meta.tension}</p>}
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      {isActive ? (
                        <span className="flex items-center gap-1 font-medium text-olive-700 dark:text-olive-300">
                          <Icon name="activity" className="h-3 w-3" /> In conversation · {active.questions} of 4 questions
                        </span>
                      ) : done ? (
                        <span className="text-muted-foreground">Interviewed</span>
                      ) : kind === 'practice' ? (
                        <button type="button" className="text-foreground underline-offset-2 hover:underline" onClick={() => onAskToInterview(p.text.split(',')[0].trim())}>
                          Start practice interview
                        </button>
                      ) : (
                        <span className="text-muted-foreground">Add what they said as notes</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </BoardFrame>

      <BoardFrame title={BOARDS.insights.label} hint="One note per thing you learned">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
          <Zone board="insights" id="real" label="From real people" hint="evidence" items={itemsIn(state, 'insights', 'real')} max={BOARDS.insights.maxPerZone} meta={{ source: 'me' }} />
          <Zone board="insights" id="synthetic" label="From practice interviews" hint="hypotheses, not evidence" tone="tint" items={itemsIn(state, 'insights', 'synthetic')} max={BOARDS.insights.maxPerZone} />
        </div>
      </BoardFrame>
    </div>
  );
}
