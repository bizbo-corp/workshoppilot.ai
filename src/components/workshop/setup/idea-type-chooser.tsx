'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { getValidationState, saveClassification } from '@/actions/validation-actions';
import { OUTPUT_TYPE_LABELS } from '@/lib/validation/artifact-lookup';
import type { OutputType, OutputTypeClassification } from '@/lib/schemas';

const TYPES = Object.keys(OUTPUT_TYPE_LABELS) as OutputType[];

/**
 * Early idea-type capture (Step 1 — Challenge). Hybrid flow: the user drafts and accepts
 * their challenge first, then the AI guesses what kind of idea it is and pre-selects it
 * here; one tap corrects it. The pick is stored as THE classification record (the same
 * one Step 10's Validate flow reads — classifyOutputType stays the single classifier;
 * this just seeds it early and lets the user confirm). Threading it forward means
 * Steps 2–10 validate a service as a service, not a default app.
 */
export function IdeaTypeChooser({
  workshopId,
  active,
}: {
  workshopId: string;
  /** Start fetching/classifying only once the challenge is accepted. */
  active: boolean;
}) {
  const [classification, setClassification] =
    React.useState<OutputTypeClassification | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const triggered = React.useRef(false);

  React.useEffect(() => {
    if (!active || triggered.current) return;
    triggered.current = true;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Reuse an existing record (revisits) before spending a classifier call.
        const existing = await getValidationState(workshopId);
        if (cancelled) return;
        if (existing.success && existing.data?.classification) {
          setClassification(existing.data.classification);
          return;
        }
        // First visit: run the (single) classifier — the route persists the guess.
        const r = await fetch('/api/validation/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workshopId }),
        });
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) throw new Error(data?.error || 'Could not detect the idea type');
        setClassification(data.classification);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not detect the idea type');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, workshopId]);

  const pick = async (type: OutputType) => {
    const next: OutputTypeClassification = {
      type,
      confidence: 1,
      rationale: 'Confirmed by you at Step 1',
      source: 'user_override',
      classifiedAt: new Date().toISOString(),
    };
    setClassification(next);
    const res = await saveClassification(workshopId, next);
    if (!res.success) setError(res.error || 'Could not save your pick');
  };

  if (!active) return null;

  const selected = classification?.type ?? null;
  const isGuess = classification?.source === 'llm';

  return (
    <div className="mt-6 rounded-xl border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">What kind of idea is this?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {loading
              ? 'Reading your challenge…'
              : isGuess
                ? 'My best guess from your challenge — tap to correct it. This shapes how we validate it later.'
                : selected
                  ? 'Locked in — this shapes the assumption, test, and signals later on.'
                  : 'Pick the closest fit — this shapes how we validate it later.'}
          </p>
        </div>
        {selected && !isGuess && (
          <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-olive-600 dark:text-olive-400" />
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TYPES.map((type) => {
          const isSelected = selected === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => pick(type)}
              disabled={loading}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                isSelected
                  ? 'border-olive-500 bg-olive-100 text-olive-800 dark:border-olive-600 dark:bg-olive-900/50 dark:text-olive-200'
                  : 'border-border bg-background text-foreground/70 hover:bg-muted/60 hover:text-foreground',
                loading && 'opacity-60'
              )}
            >
              {OUTPUT_TYPE_LABELS[type]}
              {isSelected && isGuess && <span className="ml-1 opacity-70">· my guess</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
