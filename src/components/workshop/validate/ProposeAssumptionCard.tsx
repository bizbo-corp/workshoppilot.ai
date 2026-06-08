'use client';

import * as React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SectionCard } from './SectionCard';
import type { SectionStatus } from './sections';

/** Heuristic: nudge the user if their text reads like a feature, not a belief. */
function looksLikeFeature(text: string): boolean {
  return /\b(the (app|product|tool|feature|system)|it (has|will have|includes)|we (will )?build|add a|button|screen|page)\b/i.test(
    text
  );
}

export function ProposeAssumptionCard({
  status,
  value,
  alternatives,
  isProposing,
  error,
  onChange,
  onSuggestAnother,
  onSelectAlternative,
  onContinue,
  onEdit,
  devMeta,
  scope,
  onScopeChange,
}: {
  status: SectionStatus;
  value: string;
  alternatives: string[];
  isProposing: boolean;
  error: string | null;
  onChange: (text: string) => void;
  onSuggestAnother: () => void;
  onSelectAlternative: (text: string) => void;
  onContinue: () => void;
  onEdit: () => void;
  /** Dev-only provenance (which steps shaped the assumption). Not persisted. */
  devMeta?: { sources: string[]; rationale: string } | null;
  scope: 'broad' | 'specific';
  onScopeChange: (scope: 'broad' | 'specific') => void;
}) {
  const showFeatureNudge = value.trim().length > 0 && looksLikeFeature(value);

  return (
    <SectionCard
      index={2}
      title="What's the riskiest assumption?"
      status={status}
      onEdit={onEdit}
      summary={value ? <span className="italic">“{value}”</span> : null}
    >
      {isProposing && !value ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Drafting your riskiest assumption…
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The belief that, if wrong, would most likely kill the idea — phrased as something
            about people&apos;s needs or behaviour, not a feature.
          </p>

          {/* Scope toggle: challenge-level vs concept-specific */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Focus:</span>
            <div className="inline-flex rounded-md border border-border p-0.5">
              {(['broad', 'specific'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onScopeChange(s)}
                  disabled={isProposing}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-50',
                    scope === s
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  {s === 'broad' ? 'Broad (the challenge)' : 'Specific (the concept)'}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder="e.g. Novice speakers will trust an AI to restructure their talk."
          />

          {showFeatureNudge && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This reads like a feature. Try reframing it as a belief about what people need or
              will do.
            </p>
          )}

          {alternatives.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Other options:</p>
              {alternatives.map((alt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectAlternative(alt)}
                  className={cn(
                    'block w-full rounded-md border border-border p-2 text-left text-sm transition-colors hover:bg-accent',
                    alt === value && 'border-primary bg-primary/10'
                  )}
                >
                  {alt}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {process.env.NODE_ENV !== 'production' && devMeta && (
            <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Dev · drawn from:
              </span>{' '}
              {devMeta.sources.length ? devMeta.sources.join(' · ') : '—'}
              {devMeta.rationale && (
                <div className="mt-0.5">
                  <span className="font-medium">Why riskiest:</span> {devMeta.rationale}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={onContinue} disabled={!value.trim()} size="sm">
              Use this assumption
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSuggestAnother}
              disabled={isProposing}
              className="gap-1.5 text-muted-foreground"
            >
              {isProposing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Suggest another
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
