'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StickyNoteColor } from '@/stores/canvas-store';

/** Sticky-note pastel backgrounds + matching dark text, by color key. */
const CARD_BG: Partial<Record<StickyNoteColor, string>> = {
  yellow: 'bg-[var(--sticky-note-yellow)]',
  pink: 'bg-[var(--sticky-note-pink)]',
  blue: 'bg-[var(--sticky-note-blue)]',
  green: 'bg-[var(--sticky-note-green)]',
};
const CARD_TEXT: Partial<Record<StickyNoteColor, string>> = {
  yellow: 'text-[var(--sticky-note-yellow-text)]',
  pink: 'text-[var(--sticky-note-pink-text)]',
  blue: 'text-[var(--sticky-note-blue-text)]',
  green: 'text-[var(--sticky-note-green-text)]',
};

export function SetupCard({
  color,
  emoji,
  label,
  value,
  placeholder,
  onChange,
  onCommit,
  children,
}: {
  color: StickyNoteColor;
  emoji: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (text: string) => void;
  /** Called on blur — used by the parent to refresh contextual suggestions. */
  onCommit?: () => void;
  children?: React.ReactNode;
}) {
  const filled = value.trim().length > 0;

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg p-4 shadow-md',
        CARD_BG[color],
        CARD_TEXT[color],
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">
          <span aria-hidden>{emoji}</span>
          {label}
        </span>
        {filled && <Check className="h-4 w-4 opacity-70" aria-label="Filled" />}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        placeholder={placeholder}
        rows={4}
        className="w-full flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-50"
      />

      {children}
    </div>
  );
}
