'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { STAGES, STAGE_ORDER, currentActivity, fieldKey } from '@/lib/engine/stages';
import { IDEA_TYPE_LABELS, getLens } from '@/lib/engine/lenses';
import type { StageId, WorkshopState } from '@/lib/engine/types';
import { IDEA_TYPES } from '@/lib/engine/ids';
import { setFieldValue, setIdeaType } from '@/actions/board';
import { BoardProvider } from './boards/board-context';
import { StakeholderRings } from './boards/stakeholder-rings';
import { EmpathyMap } from './boards/empathy-map';
import { JourneyStrip } from './boards/journey-strip';
import { IdeaBoard } from './boards/idea-board';
import { CardBoard } from './boards/card-board';
import { PersonaCard } from './boards/persona-card';
import { InterviewsPanel } from './boards/interviews-panel';

interface Props {
  workshopId: string;
  state: WorkshopState;
  onChange: (next: WorkshopState) => void;
  onSend: (text: string) => void;
  /** Looking back at an earlier stage's activity, read-only. */
  viewing?: { stage: StageId; activity: string } | null;
  onBackToCurrent?: () => void;
}

/**
 * The right-hand side: one activity at a time. A short header says what
 * this activity is and why it matters, the board for it sits underneath,
 * and the outputs it produces are listed at the bottom so progress is
 * never a mystery.
 */
export function ActivityPane({ workshopId, state, onChange, onSend, viewing, onBackToCurrent }: Props) {
  const stageId = viewing?.stage ?? state.stage;
  const stage = STAGES[stageId];
  const activity = viewing ? (stage.activities.find((a) => a.id === viewing.activity) ?? stage.activities[0]) : currentActivity(state);
  const index = stage.activities.findIndex((a) => a.id === activity.id);
  const fields = stage.fields.filter((f) => !f.hidden && (f.activity === activity.id || (!f.activity && index === stage.activities.length - 1)));
  const readOnly = !!viewing;

  return (
    <BoardProvider workshopId={workshopId} state={state} onChange={onChange} readOnly={readOnly}>
      <div className="space-y-4">
        {viewing && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/60 px-4 py-2 text-xs" data-viewing>
            <span>
              Looking back at <span className="font-medium">{stage.label} · {activity.label}</span>. This stage is done; the boards are read-only here.
            </span>
            <button type="button" onClick={onBackToCurrent} className="shrink-0 rounded-md border border-border bg-background px-2 py-1 hover:bg-accent">
              Back to where I was
            </button>
          </div>
        )}
        <header className="rounded-lg border border-border bg-card px-4 py-3" data-stage={stageId} data-activity={activity.id}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>Stage {STAGE_ORDER.indexOf(stageId)} · {stage.label}</span>
            <span aria-hidden>·</span>
            <span>
              Activity {index + 1} of {stage.activities.length}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{activity.label}</h2>
          <p className="mt-0.5 text-sm text-foreground/90">{activity.what}</p>
          <p className="text-sm text-muted-foreground">{activity.why}</p>
        </header>

        {stageId === 'setup' && !readOnly && <IdeaTypeChooser workshopId={workshopId} state={state} onChange={onChange} />}

        <BoardFor activityId={activity.id} onSend={onSend} />

        {fields.length > 0 && <OutputsPanel workshopId={workshopId} state={state} onChange={onChange} fields={fields} stage={stageId} readOnly={readOnly} />}
      </div>
    </BoardProvider>
  );
}

function BoardFor({ activityId, onSend }: { activityId: string; onSend: (text: string) => void }) {
  switch (activityId) {
    case 'stakeholders':
      return <StakeholderRings />;
    case 'interviews':
      return <InterviewsPanel onAskToInterview={(name) => onSend(`Let's do the practice interview with ${name}.`)} />;
    case 'empathy':
      return <EmpathyMap focus="evidence" />;
    case 'synthesis':
      return <EmpathyMap focus="synthesis" />;
    case 'persona':
      return <PersonaCard />;
    case 'journey':
      return <JourneyStrip />;
    case 'crazy8s':
      return <IdeaBoard mode="ideate" />;
    case 'shortlist':
      return <IdeaBoard mode="shortlist" />;
    case 'concept':
      return <CardBoard board="concept_card" hint="Something you could pitch" />;
    case 'assumption':
      return <CardBoard board="test_card" hint="The belief that, if wrong, kills it" only={['assumption']} />;
    case 'test':
      return <CardBoard board="test_card" hint="Agreed now, scored later" />;
    default:
      return null;
  }
}

function OutputsPanel({ workshopId, state, onChange, fields, stage, readOnly }: Pick<Props, 'workshopId' | 'state' | 'onChange'> & { fields: (typeof STAGES)[keyof typeof STAGES]['fields']; stage: StageId; readOnly: boolean }) {
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
    <div className="rounded-lg border border-border bg-card" data-outputs>
      <div className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What this activity produces</div>
      <ul className="divide-y divide-border">
        {fields.map((f) => {
          const value = state.fields[fieldKey(stage, f.id)];
          const isEditing = editing === f.id;
          return (
            <li key={f.id} className="px-4 py-2.5" data-field={f.id} data-filled={value ? 'true' : 'false'}>
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
                    <p className={cn('mt-0.5 text-sm', value ? '' : 'text-muted-foreground')}>{value || f.description}</p>
                  )}
                </div>
                {!isEditing && !readOnly && (
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

function IdeaTypeChooser({ workshopId, state, onChange }: Pick<Props, 'workshopId' | 'state' | 'onChange'>) {
  const [, start] = useTransition();
  const lens = getLens(state.ideaType);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What kind of thing is this?</div>
      <p className="mt-1 text-sm text-muted-foreground">
        {state.ideaType
          ? `${state.ideaTypeConfidence && state.ideaTypeConfidence < 0.6 ? 'Best guess: ' : ''}${lens?.label}. Change it if that is wrong; it shapes the words, boards and tests from here on.`
          : 'Wanda will guess from what you say; you can set it here.'}
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
            className={cn('rounded-full border px-3 py-1 text-xs', state.ideaType === t ? 'border-foreground bg-foreground text-background' : 'border-border bg-background hover:bg-accent')}
          >
            {IDEA_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
