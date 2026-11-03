'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import type { BoardItem } from '@/lib/engine/types';
import { useBoard } from './board-context';

/**
 * One item on a board. Click to edit, Enter to save, the corner button to
 * remove. AI-added items are tinted so the user can tell whose words they
 * are. `data-*` attributes let the geometry test check layout.
 */
export function Sticky({ item, tone = 'yellow', className, children }: { item: BoardItem; tone?: 'yellow' | 'blue' | 'green' | 'pink' | 'white'; className?: string; children?: ReactNode }) {
  const { update, remove } = useBoard();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  function save() {
    setEditing(false);
    const t = text.trim();
    if (!t || t === item.text) {
      setText(item.text);
      return;
    }
    update(item.id, { text: t });
  }

  const bg =
    item.createdBy === 'ai'
      ? 'bg-[var(--sticky-note-white)] dark:bg-neutral-olive-800'
      : {
          yellow: 'bg-[var(--sticky-note-yellow)] text-[var(--sticky-note-yellow-text)]',
          blue: 'bg-[var(--sticky-note-blue)] text-neutral-olive-950',
          green: 'bg-[var(--sticky-note-green)] text-neutral-olive-950',
          pink: 'bg-[var(--sticky-note-pink)] text-neutral-olive-950',
          white: 'bg-[var(--sticky-note-white)] text-neutral-olive-950',
        }[tone];

  return (
    <div
      data-item-id={item.id}
      data-zone={item.zone}
      data-board={item.board}
      data-created-by={item.createdBy}
      className={cn('group relative rounded-md px-2.5 py-2 text-xs leading-snug shadow-sm', bg, item.createdBy === 'ai' && 'border border-dashed border-olive-300 dark:border-neutral-olive-600', className)}
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
        <button type="button" className="block w-full text-left" onClick={() => setEditing(true)} title="Click to edit">
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="mb-1.5 w-full rounded object-cover" />
          )}
          {item.text}
        </button>
      )}
      {children}
      <button
        type="button"
        aria-label="Remove"
        onClick={() => remove(item.id)}
        className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive group-hover:flex"
      >
        <Icon name="minus" className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

/** A small "+" that turns into a textarea; Enter adds the item. */
export function AddSticky({ board, zone, label, full, placeholder = 'Type, then Enter' }: { board: BoardItem['board']; zone: string; label: string; full: boolean; placeholder?: string }) {
  const { add } = useBoard();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  function commit() {
    const t = text.trim();
    setOpen(false);
    setText('');
    if (t) add(board, zone, t);
  }

  if (full) return null;
  if (!open)
    return (
      <button
        type="button"
        aria-label={`Add to ${label}`}
        onClick={() => setOpen(true)}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      >
        <Icon name="plus" className="h-3.5 w-3.5" />
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
      className="w-full min-w-[9rem] resize-none rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    />
  );
}

export function BoardFrame({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-border bg-card', className)} data-board-frame={title}>
      <header className="flex items-baseline justify-between border-b border-border px-4 py-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </header>
      {children}
    </section>
  );
}
