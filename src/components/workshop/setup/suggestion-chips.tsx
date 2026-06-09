'use client';

import { cn } from '@/lib/utils';
import { SuggestionPill } from '@/components/ui/suggestion-pill';

/**
 * Example chips beneath a setup card. The parent (WorkshopSetup) owns the data.
 *
 * - variant="stack": long idea/problem suggestions — full-width, left-aligned,
 *   gently rounded cards so multi-line text reads cleanly (no pill "blob").
 * - variant="inline": short audience group labels — compact squared pills,
 *   multi-select (pass `selected` to highlight the active ones).
 */
export function SuggestionChips({
  suggestions,
  loading,
  selected,
  label,
  variant = 'inline',
  onPick,
}: {
  suggestions: string[];
  loading?: boolean;
  /** Lowercased phrases currently active (multi-select / audience). */
  selected?: string[];
  /** Eyebrow label override. */
  label?: string;
  variant?: 'stack' | 'inline';
  onPick: (text: string) => void;
}) {
  if (!loading && suggestions.length === 0) return null;

  const selectedSet = new Set((selected ?? []).map((s) => s.toLowerCase()));
  const isStack = variant === 'stack';

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-60">
        {loading
          ? 'Thinking of examples…'
          : (label ?? 'Need a starting point?')}
      </span>

      <div className={cn(isStack ? 'flex flex-col gap-2' : 'flex flex-wrap gap-1.5')}>
        {loading
          ? Array.from({ length: isStack ? 3 : 4 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'animate-pulse rounded-md bg-black/10 dark:bg-white/10',
                  isStack ? 'h-12 w-full' : 'h-6 w-24',
                )}
              />
            ))
          : suggestions.map((s, i) => {
              const isSelected = selectedSet.has(s.toLowerCase());
              return (
                <SuggestionPill
                  key={`${i}-${s}`}
                  block={isStack}
                  selected={selected ? isSelected : false}
                  onClick={() => onPick(s)}
                  className={isStack ? 'leading-relaxed' : undefined}
                >
                  {s}
                </SuggestionPill>
              );
            })}
      </div>
    </div>
  );
}
