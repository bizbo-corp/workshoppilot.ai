'use client';

/**
 * Presentational example chips shown beneath a setup card. The parent
 * (WorkshopSetup) owns the suggestion data + fetching; this just renders.
 */
export function SuggestionChips({
  suggestions,
  loading,
  onPick,
}: {
  suggestions: string[];
  loading?: boolean;
  onPick: (text: string) => void;
}) {
  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-60">
        {loading ? 'Thinking of examples…' : 'Need a starting point?'}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className="h-6 w-28 animate-pulse rounded-full bg-black/10 dark:bg-white/10"
              />
            ))
          : suggestions.map((s, i) => (
              <button
                key={`${i}-${s}`}
                type="button"
                onClick={() => onPick(s)}
                className="rounded-full border border-black/10 bg-white/50 px-3 py-1 text-left text-xs leading-snug shadow-sm transition-colors hover:bg-white dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/20"
              >
                {s}
              </button>
            ))}
      </div>
    </div>
  );
}
