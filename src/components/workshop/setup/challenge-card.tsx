'use client';

import { useState } from 'react';
import { Loader2, PencilLine, RefreshCw, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      className="rounded-md p-1 opacity-70 transition-colors hover:bg-black/10 hover:opacity-100 disabled:opacity-40"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * The generated "Workshop Challenge" card. Hidden by the parent until the user
 * generates; shows a loading state while Wanda drafts the statement, then the
 * editable HMW text. Carries the same Polish / Elaborate / Regenerate AI actions
 * as the Idea/Problem/Audience cards (top-right, on hover).
 */
export function ChallengeCard({
  value,
  generating,
  busy,
  onChange,
  onPolish,
  onElaborate,
  onRegenerate,
}: {
  value: string;
  generating: boolean;
  /** True while a polish/elaborate/regenerate action is in flight. */
  busy?: boolean;
  onChange: (text: string) => void;
  onPolish?: () => void;
  onElaborate?: (instructions: string) => void;
  onRegenerate?: () => void;
}) {
  const hasText = value.trim().length > 0;
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
        'group relative rounded-lg p-5 shadow-md',
        'bg-[var(--sticky-note-green)] text-[var(--sticky-note-green-text)]',
      )}
    >
      {/* Action toolbar — top-right, on hover (shown only once a challenge exists). */}
      {!generating && hasText && (
        <div
          className={cn(
            'absolute right-3 top-3 z-10 flex items-center gap-0.5 transition-opacity',
            busy
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
          )}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" />
          ) : (
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
                <ToolButton icon={RefreshCw} label="Regenerate (brand new)" onClick={onRegenerate} />
              )}
            </>
          )}
        </div>
      )}

      <span className="mb-3 block font-serif text-xl leading-tight tracking-tight sm:text-2xl">
        Workshop Challenge
      </span>

      {generating ? (
        <div className="space-y-2" aria-live="polite">
          <span className="sr-only">Drafting your challenge statement…</span>
          <span className="block h-4 w-11/12 animate-pulse rounded bg-black/10" />
          <span className="block h-4 w-4/5 animate-pulse rounded bg-black/10" />
          <span className="block h-4 w-2/3 animate-pulse rounded bg-black/10" />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-none bg-transparent text-lg leading-snug outline-none"
        />
      )}

      {/* Inline "elaborate" steer field */}
      {elaborateOpen && (
        <div className="mt-3 flex items-center gap-1.5">
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
            placeholder="How should I change it? e.g. sharpen the outcome"
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
            className="shrink-0 rounded-md p-1 opacity-70 transition-colors hover:bg-black/10 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
