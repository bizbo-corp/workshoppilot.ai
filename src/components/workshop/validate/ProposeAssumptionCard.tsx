'use client';

import * as React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SuggestionPill } from '@/components/ui/suggestion-pill';
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
  isAdmin = false,
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
  /** Focus toggle (broad vs specific) is an admin-only control; everyone else gets broad. */
  isAdmin?: boolean;
}) {
  const showFeatureNudge = value.trim().length > 0 && looksLikeFeature(value);

  // Admin-only, subtle Focus toggle — moved to the section header's top-right.
  const focusToggle = isAdmin ? (
    <div className="flex items-center gap-1.5">
      <span className="text-[12px] font-medium text-foreground/45">Focus</span>
      <div className="inline-flex rounded-md border border-border/60 p-0.5">
        {(['broad', 'specific'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onScopeChange(s)}
            disabled={isProposing}
            className={cn(
              'rounded px-2 py-0.5 text-[12px] font-medium capitalize transition-colors disabled:opacity-50',
              scope === s
                ? 'bg-foreground/10 text-foreground'
                : 'text-foreground/50 hover:text-foreground/80'
            )}
          >
            {s === 'broad' ? 'Broad' : 'Specific'}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <SectionCard
      index={2}
      title="What's the riskiest assumption?"
      status={status}
      onEdit={onEdit}
      headerRight={focusToggle}
      summary={value ? <span className="italic">“{value}”</span> : null}
    >
      {isProposing && !value ? (
        <div className="flex items-center gap-2 text-base text-foreground/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Drafting your riskiest assumption…
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-base text-foreground/70">
            The belief that, if wrong, would most likely kill the idea — phrased as something
            about people&apos;s needs or behaviour, not a feature.
          </p>

          {/* The assumption to test — larger, editable in place, with "Suggest another" beside it
              (matched to the textarea height, secondary/white styling). */}
          <div className="flex items-stretch gap-3">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              placeholder="e.g. Novice speakers will trust an AI to restructure their talk."
              className="flex-1 text-lg leading-relaxed"
            />
            <Button
              variant="secondary"
              onClick={onSuggestAnother}
              disabled={isProposing}
              className="h-auto shrink-0 self-stretch gap-1.5"
            >
              {isProposing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Suggest another
            </Button>
          </div>

          {showFeatureNudge && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              This reads like a feature. Try reframing it as a belief about what people need or
              will do.
            </p>
          )}

          {alternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground/70">Other options:</p>
              <div className="flex flex-col gap-2">
                {alternatives.map((alt, i) => (
                  <SuggestionPill
                    key={i}
                    block
                    selected={alt === value}
                    onClick={() => onSelectAlternative(alt)}
                  >
                    {alt}
                  </SuggestionPill>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {process.env.NODE_ENV !== 'production' && devMeta && (
            <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-2 text-[13px] text-foreground/70">
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
          </div>
        </div>
      )}
    </SectionCard>
  );
}
