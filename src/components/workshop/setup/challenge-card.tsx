'use client';

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The generated "Workshop Challenge" card. Hidden by the parent until the user
 * hits Done; shows a loading state while Wanda drafts the statement, then the
 * editable HMW text. The headline uses the design-system serif for a graphic feel.
 */
export function ChallengeCard({
  value,
  generating,
  onChange,
  onRegenerate,
}: {
  value: string;
  generating: boolean;
  onChange: (text: string) => void;
  onRegenerate: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-lg p-5 shadow-md',
        'bg-[var(--sticky-note-green)] text-[var(--sticky-note-green-text)]',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-serif text-xl leading-tight tracking-tight sm:text-2xl">
          Workshop Challenge
        </span>
        {!generating && value.trim().length > 0 && (
          <button
            type="button"
            onClick={onRegenerate}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium opacity-70 transition-opacity hover:opacity-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </button>
        )}
      </div>

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
    </div>
  );
}
