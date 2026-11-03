'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { STAGES, fieldKey } from '@/lib/engine/stages';
import { stageBoards } from '@/lib/engine/tools';
import { IDEA_TYPE_LABELS, getLens } from '@/lib/engine/lenses';
import type { BoardId, WorkshopState } from '@/lib/engine/types';
import { IDEA_TYPES } from '@/lib/engine/ids';
import { setFieldValue, setIdeaType } from '@/actions/board';
import { BoardProvider } from './boards/board-context';
import { StakeholderRings } from './boards/stakeholder-rings';
import { EmpathyMap } from './boards/empathy-map';
import { JourneyStrip } from './boards/journey-strip';
import { IdeaBoard } from './boards/idea-board';
import { CardBoard } from './boards/card-board';

interface Props {
  workshopId: string;
  state: WorkshopState;
  onChange: (next: WorkshopState) => void;
}

/**
 * Everything the user can touch for the current stage: the fields the AI
 * is filling, the idea type chooser in Setup, and the stage's boards.
 */
export function StageBoards({ workshopId, state, onChange }: Props) {
  const stage = STAGES[state.stage];
  return (
    <BoardProvider workshopId={workshopId} state={state} onChange={onChange}>
      <div className="space-y-6">
        <FieldsPanel workshopId={workshopId} state={state} onChange={onChange} />
        {state.stage === 'setup' && <IdeaTypeChooser workshopId={workshopId} state={state} onChange={onChange} />}
        {stageBoards(state).map((b) => (
          <BoardFor key={b} board={b} />
        ))}
      </div>
    </BoardProvider>
  );
}

function BoardFor({ board }: { board: BoardId }) {
  switch (board) {
    case 'stakeholder_rings':
      return <StakeholderRings />;
    case 'empathy_map':
      return <EmpathyMap />;
    case 'journey_strip':
      return <JourneyStrip />;
    case 'idea_board':
      return <IdeaBoard />;
    case 'concept_card':
      return <CardBoard board="concept_card" hint="One concept, grounded in the research" />;
    case 'test_card':
      return <CardBoard board="test_card" hint="The test that could kill it" />;
    default:
      return null;
  }
}

function FieldsPanel({ workshopId, state, onChange }: Props) {
  const stage = STAGES[state.stage];
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [, start] = useTransition();

  function save(field: string) {
    const value = draft;
    setEditing(null);
    start(async () => {
      const r = await setFieldValue(workshopId, field, value);
      if (r.success) onChange(r.data.state);
      else toast.error(r.error);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">What this stage produces</div>
      <ul className="divide-y divide-border">
        {stage.fields.filter((f) => !f.hidden).map((f) => {
          const value = state.fields[fieldKey(state.stage, f.id)];
          const isEditing = editing === f.id;
          return (
            <li key={f.id} className="px-4 py-3" data-field={f.id} data-filled={value ? 'true' : 'false'}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {value ? <Icon name="check" className="h-3.5 w-3.5 text-olive-600" /> : <span className="h-3.5 w-3.5 rounded-full border border-border" />}
                    {f.label}
                    {!f.required && <span className="text-xs font-normal text-muted-foreground">optional</span>}
                  </div>
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => save(f.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditing(null);
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(f.id);
                      }}
                      rows={3}
                      className="mt-1 w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  ) : (
                    <p className={cn('mt-1 text-sm', value ? '' : 'text-muted-foreground')}>{value || f.description}</p>
                  )}
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Edit ${f.label}`}
                    onClick={() => {
                      setDraft(value ?? '');
                      setEditing(f.id);
                    }}
                  >
                    <Icon name="pencil" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IdeaTypeChooser({ workshopId, state, onChange }: Props) {
  const [, start] = useTransition();
  const lens = getLens(state.ideaType);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What kind of thing is this?</div>
      <p className="mt-1 text-sm text-muted-foreground">
        {state.ideaType
          ? `${state.ideaTypeConfidence && state.ideaTypeConfidence < 0.6 ? 'Best guess: ' : ''}${lens?.label}. Change it if that is wrong.`
          : 'The facilitator will guess; you can set it here.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {IDEA_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={state.ideaType === t}
            onClick={() =>
              start(async () => {
                const r = await setIdeaType(workshopId, t);
                if (r.success) onChange(r.data.state);
                else toast.error(r.error);
              })
            }
            className={cn(
              'rounded-full border px-3 py-1 text-xs',
              state.ideaType === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-accent',
            )}
          >
            {IDEA_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
