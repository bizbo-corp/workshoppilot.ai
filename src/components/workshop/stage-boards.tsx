'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { BOARDS } from '@/lib/engine/boards';
import { STAGES, fieldKey } from '@/lib/engine/stages';
import { IDEA_TYPE_LABELS, getLens } from '@/lib/engine/lenses';
import type { BoardId, BoardItem, WorkshopState } from '@/lib/engine/types';
import { IDEA_TYPES } from '@/lib/engine/ids';
import { addBoardItem, removeBoardItem, setFieldValue, setIdeaType, updateBoardItem } from '@/actions/board';

interface Props {
  workshopId: string;
  state: WorkshopState;
  onChange: (next: WorkshopState) => void;
}

/**
 * Everything the user can touch for the current stage: the fields the AI
 * is filling, the idea type chooser in Setup, and the boards. Plain zones
 * with stickies for now; Phase 4 gives the rings and the strip their real
 * layouts.
 */
export function StageBoards({ workshopId, state, onChange }: Props) {
  const stage = STAGES[state.stage];
  return (
    <div className="space-y-6">
      <FieldsPanel workshopId={workshopId} state={state} onChange={onChange} />
      {state.stage === 'setup' && <IdeaTypeChooser workshopId={workshopId} state={state} onChange={onChange} />}
      {stage.boards.map((b) => (
        <Board key={b} board={b} workshopId={workshopId} state={state} onChange={onChange} />
      ))}
    </div>
  );
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
        {stage.fields.map((f) => {
          const value = state.fields[fieldKey(state.stage, f.id)];
          const isEditing = editing === f.id;
          return (
            <li key={f.id} className="px-4 py-3">
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

function Board({ board, workshopId, state, onChange }: Props & { board: BoardId }) {
  const def = BOARDS[board];
  const lens = getLens(state.ideaType);
  const items = state.boards[board];
  const zoneLabel = (zoneId: string, fallback: string) => {
    if (board === 'journey_strip' && lens) {
      const i = Number(zoneId.slice(1)) - 1;
      return lens.journeyMomentLabels[i] ?? fallback;
    }
    return fallback;
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{def.label}</div>
      <div
        className={cn(
          'grid gap-px bg-border',
          def.zones.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : def.zones.length <= 6 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4',
          board === 'journey_strip' && 'sm:grid-cols-5',
        )}
      >
        {def.zones.map((z) => (
          <Zone
            key={z.id}
            board={board}
            zone={z.id}
            label={zoneLabel(z.id, z.label)}
            items={items.filter((i) => i.zone === z.id)}
            full={items.filter((i) => i.zone === z.id).length >= def.maxPerZone}
            workshopId={workshopId}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

function Zone({ board, zone, label, items, full, workshopId, onChange }: { board: BoardId; zone: string; label: string; items: BoardItem[]; full: boolean; workshopId: string; onChange: (s: WorkshopState) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [, start] = useTransition();

  function add() {
    const t = text.trim();
    setAdding(false);
    setText('');
    if (!t) return;
    start(async () => {
      const r = await addBoardItem({ workshopId, board, zone, text: t });
      if (r.success) onChange(r.data.state);
      else toast.error(r.error);
    });
  }

  return (
    <div className="min-h-[7rem] bg-card p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {!full && !adding && (
          <button type="button" aria-label={`Add to ${label}`} onClick={() => setAdding(true)} className="text-muted-foreground hover:text-foreground">
            <Icon name="plus" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Sticky key={it.id} item={it} workshopId={workshopId} onChange={onChange} />
        ))}
        {adding && (
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={add}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                add();
              }
              if (e.key === 'Escape') {
                setAdding(false);
                setText('');
              }
            }}
            rows={2}
            placeholder="Type, then Enter"
            className="w-full min-w-[8rem] resize-none rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        )}
      </div>
    </div>
  );
}

function Sticky({ item, workshopId, onChange }: { item: BoardItem; workshopId: string; onChange: (s: WorkshopState) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [, start] = useTransition();
  const dip = item.meta?.dip === true;
  const shortlisted = item.meta?.shortlisted === true;

  function save() {
    setEditing(false);
    const t = text.trim();
    if (!t || t === item.text) return;
    start(async () => {
      const r = await updateBoardItem({ workshopId, id: item.id, text: t });
      if (r.success) onChange(r.data.state);
      else toast.error(r.error);
    });
  }

  function remove() {
    start(async () => {
      const r = await removeBoardItem(workshopId, item.id);
      if (r.success) onChange(r.data.state);
      else toast.error(r.error);
    });
  }

  return (
    <div
      data-item-id={item.id}
      data-zone={item.zone}
      className={cn(
        'group relative max-w-[14rem] rounded-md border px-2 py-1.5 text-xs shadow-sm',
        item.createdBy === 'ai' ? 'border-olive-200 bg-olive-50 dark:border-neutral-olive-700 dark:bg-neutral-olive-900' : 'border-border bg-background',
        dip && 'ring-2 ring-destructive/50',
        shortlisted && 'ring-2 ring-olive-500/60',
      )}
    >
      {editing ? (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') setEditing(false);
          }}
          rows={2}
          className="w-full resize-none bg-transparent outline-none"
        />
      ) : (
        <button type="button" className="block w-full text-left" onClick={() => setEditing(true)}>
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="mb-1 max-h-32 rounded" />
          )}
          {item.text}
        </button>
      )}
      <button
        type="button"
        aria-label="Remove"
        onClick={remove}
        className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground group-hover:flex"
      >
        <Icon name="minus" className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
