'use client';

import { useState } from 'react';
import {
  Check,
  Loader2,
  PencilLine,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StickyNoteColor } from '@/stores/canvas-store';

/** Sticky-note pastel backgrounds + matching dark text, by color key. */
const CARD_BG: Partial<Record<StickyNoteColor, string>> = {
  yellow: 'bg-[var(--sticky-note-yellow)]',
  pink: 'bg-[var(--sticky-note-pink)]',
  blue: 'bg-[var(--sticky-note-blue)]',
  green: 'bg-[var(--sticky-note-green)]',
  red: 'bg-[var(--sticky-note-red)]',
};
const CARD_TEXT: Partial<Record<StickyNoteColor, string>> = {
  yellow: 'text-[var(--sticky-note-yellow-text)]',
  pink: 'text-[var(--sticky-note-pink-text)]',
  blue: 'text-[var(--sticky-note-blue-text)]',
  green: 'text-[var(--sticky-note-green-text)]',
  red: 'text-[var(--sticky-note-red-text)]',
};

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Sparkles;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="rounded-md p-1 opacity-70 transition-colors hover:bg-black/10 hover:opacity-100 disabled:opacity-40 dark:hover:bg-white/15"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function SetupCard({
  color,
  emoji,
  label,
  value,
  placeholder,
  busy,
  onChange,
  onConfirm,
  onPolish,
  onElaborate,
  onRegenerate,
  onReset,
  children,
}: {
  color: StickyNoteColor;
  emoji: string;
  label: string;
  value: string;
  placeholder?: string;
  /** True while an AI action for this card is in flight. */
  busy?: boolean;
  onChange: (text: string) => void;
  /** Confirm this card — regenerates the other cards' suggestions. */
  onConfirm?: () => void;
  /** Tighten wording, same meaning. */
  onPolish?: () => void;
  /** Revise in a user-typed direction. */
  onElaborate?: (instructions: string) => void;
  /** Brand-new content (also "Smart suggest" when the card is empty). */
  onRegenerate?: () => void;
  /** Clear the card. */
  onReset?: () => void;
  children?: React.ReactNode;
}) {
  const filled = value.trim().length > 0;
  const [elaborateOpen, setElaborateOpen] = useState(false);
  const [elaborateText, setElaborateText] = useState('');

  const submitElaborate = () => {
    const v = elaborateText.trim();
    if (!v) return;
    onElaborate?.(v);
    setElaborateText('');
    setElaborateOpen(false);
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-lg p-4 shadow-md',
        CARD_BG[color],
        CARD_TEXT[color],
      )}
    >
      {/* Action toolbar — top-right corner. Fades in on hover / focus, always
          shown while busy. Order: reset, polish, elaborate, auto-generate. */}
      <div
        className={cn(
          'absolute right-2 top-2 z-10 flex items-center gap-0.5 transition-opacity',
          busy
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" />
        ) : filled ? (
          <>
            {onPolish && <ToolButton icon={Sparkles} label="Polish wording" onClick={onPolish} />}
            {onElaborate && (
              <ToolButton
                icon={PencilLine}
                label="Elaborate — steer the change"
                onClick={() => setElaborateOpen((o) => !o)}
              />
            )}
            {onRegenerate && (
              <ToolButton icon={RefreshCw} label="Auto-generate (brand new)" onClick={onRegenerate} />
            )}
          </>
        ) : (
          onRegenerate && (
            <ToolButton
              icon={RefreshCw}
              label="Smart suggest — write something brand new"
              onClick={onRegenerate}
            />
          )
        )}
      </div>

      <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">
        <span aria-hidden>{emoji}</span>
        {label}
      </span>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-50"
      />

      {/* Inline "elaborate" steer field */}
      {elaborateOpen && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            autoFocus
            value={elaborateText}
            onChange={(e) => setElaborateText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitElaborate();
              } else if (e.key === 'Escape') {
                setElaborateOpen(false);
                setElaborateText('');
              }
            }}
            placeholder="How should I change it? e.g. make it more B2B"
            className="min-w-0 flex-1 rounded-md border border-black/15 bg-white/60 px-2 py-1 text-xs outline-none placeholder:opacity-50 dark:border-white/20 dark:bg-white/10"
          />
          <button
            type="button"
            onClick={submitElaborate}
            disabled={!elaborateText.trim()}
            className="shrink-0 rounded-md bg-black/15 px-2 py-1 text-xs font-medium transition-colors hover:bg-black/25 disabled:opacity-40 dark:bg-white/20 dark:hover:bg-white/30"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setElaborateOpen(false);
              setElaborateText('');
            }}
            title="Cancel"
            aria-label="Cancel"
            className="shrink-0 rounded-md p-1 opacity-70 transition-colors hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/15"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {children}

      {/* Footer — reset bottom-left (hover-reveal), Confirm bottom-right. */}
      {filled && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              disabled={busy}
              title="Reset (clear)"
              aria-label="Reset (clear)"
              className="rounded-md p-1 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100 group-focus-within:opacity-100 disabled:opacity-40 dark:hover:bg-white/15"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span />
          )}
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              title="Confirm — refresh suggestions for the other cards"
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium opacity-70 transition-colors hover:bg-black/5 hover:opacity-100 disabled:opacity-40 dark:hover:bg-white/10"
            >
              <Check className="h-3.5 w-3.5" />
              Confirm
            </button>
          )}
        </div>
      )}
    </div>
  );
}
