'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import type { BoardItem } from '@/lib/engine/types';
import { useBoard } from './board-context';

/**
 * One item on a board. Click to edit, Enter to save, the corner button to
 * remove. Items the facilitator added have a dashed edge so you can tell
 * whose words they are; everything else stays neutral. A `source` badge
 * shows who said it when the item carries one.
 */
export function Sticky({ item, className, children, badge }: { item: BoardItem; className?: string; children?: ReactNode; badge?: ReactNode }) {
  const { update, remove, readOnly } = useBoard();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const source = typeof item.meta?.source === 'string' ? item.meta.source : null;

  function save() {
    setEditing(false);
    const t = text.trim();
    if (!t || t === item.text) {
      setText(item.text);
      return;
    }
    update(item.id, { text: t });
  }

  return (
    <div
      data-item-id={item.id}
      data-zone={item.zone}
      data-board={item.board}
      data-created-by={item.createdBy}
      className={cn(
        'group relative rounded-md border bg-background px-2.5 py-2 text-xs leading-snug text-foreground shadow-xs',
        item.createdBy === 'ai' ? 'border-dashed border-olive-400/70 dark:border-olive-500/50' : 'border-border',
        className,
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
            if (e.key === 'Escape') {
              setText(item.text);
              setEditing(false);
            }
          }}
          rows={2}
          className="w-full resize-none bg-transparent outline-none"
        />
      ) : (
        <button type="button" className="block w-full text-left" onClick={() => !readOnly && setEditing(true)} title={readOnly ? undefined : 'Click to edit'}>
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="mb-1.5 w-full rounded object-cover" />
          )}
          {item.text}
        </button>
      )}
      {(source || badge) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
          {source && <span className="rounded-sm bg-muted px-1 py-0.5">{source}</span>}
          {badge}
        </div>
      )}
      {children}
      {!readOnly && (
      <button
        type="button"
        aria-label="Remove"
        onClick={() => remove(item.id)}
        className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive group-hover:flex"
      >
        <Icon name="minus" className="h-2.5 w-2.5" />
      </button>
      )}
    </div>
  );
}

/** A small "+" that turns into a textarea; Enter adds the item. */
export function AddSticky({ board, zone, label, full, placeholder = 'Type, then Enter', meta }: { board: BoardItem['board']; zone: string; label: string; full: boolean; placeholder?: string; meta?: Record<string, string | number | boolean> }) {
  const { add, readOnly } = useBoard();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  function commit() {
    const t = text.trim();
    setOpen(false);
    setText('');
    if (t) add(board, zone, t, undefined, meta);
  }

  if (full || readOnly) return null;
  if (!open)
    return (
      <button
        type="button"
        aria-label={`Add to ${label}`}
        onClick={() => setOpen(true)}
        className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      >
        <Icon name="plus" className="h-3 w-3" />
      </button>
    );
  return (
    <textarea
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') {
          setOpen(false);
          setText('');
        }
      }}
      rows={2}
      placeholder={placeholder}
      data-add-input={zone}
      className="w-full min-w-[9rem] resize-none rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    />
  );
}

export function BoardFrame({ title, hint, children, className, actions }: { title: string; hint?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn('rounded-lg border border-border bg-card', className)} data-board-frame={title}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

/** A labelled drop zone: label, add button, wrapped items. */
export function Zone({ board, id, label, hint, items, max, className, tone = 'plain', children, meta }: { board: BoardItem['board']; id: string; label: string; hint?: string; items: BoardItem[]; max: number; className?: string; tone?: 'plain' | 'tint'; children?: ReactNode; meta?: Record<string, string | number | boolean> }) {
  return (
    <div data-zone-container={id} className={cn('flex min-h-[7rem] flex-col p-3', tone === 'tint' ? 'bg-muted/40' : 'bg-card', className)}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium leading-tight">{label}</div>
          {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <AddSticky board={board} zone={id} label={label} full={items.length >= max} meta={meta} />
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Sticky key={it.id} item={it} className="max-w-[14rem]" />
        ))}
        {children}
      </div>
      {items.length === 0 && !children && <p className="mt-auto text-[11px] text-muted-foreground/70">Nothing here yet.</p>}
    </div>
  );
}
