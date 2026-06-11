'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import type { HonestyRead, ValidationPlan } from '@/lib/schemas';

const DIMENSION_LABELS: Record<string, string> = {
  problem: 'Problem',
  audience: 'Audience',
  edge: 'Edge',
  evidence: 'Evidence',
  cost_to_test: 'Cost to test',
};

const STRENGTH_LABELS: Record<string, string> = {
  solid: 'Solid',
  thin: 'Thin',
  missing: 'Missing',
};

const STRENGTH_DOT: Record<string, string> = {
  solid: 'bg-green-600 dark:bg-green-400',
  thin: 'bg-amber-500 dark:bg-amber-400',
  missing: 'bg-destructive',
};

const STRENGTH_TEXT: Record<string, string> = {
  solid: 'text-green-700 dark:text-green-400',
  thin: 'text-amber-600 dark:text-amber-400',
  missing: 'text-destructive',
};

/**
 * The in-session honesty read: the facilitator's evidence-anchored judgment of the
 * idea's current strength, generated once the plan is assembled. No number — the
 * Validation Score stays post-test; this is the honest conversation before it.
 *
 * Auto-generates on first render when the plan has none, then persists via the
 * parent (onGenerated → upsertValidationPlan), so it survives reloads.
 */
export function HonestyReadCard({
  plan,
  workshopId,
  isReadOnly = false,
  flat = false,
  onGenerated,
}: {
  plan: ValidationPlan;
  workshopId: string;
  isReadOnly?: boolean;
  /** Render without card chrome — for hosts that already provide a card (Build Pack). */
  flat?: boolean;
  /** Persist the generated read onto the plan (parent owns plan state). */
  onGenerated?: (read: HonestyRead) => void;
}) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const triggered = React.useRef(false);

  const read = plan.honestyRead ?? null;

  const generate = React.useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const r = await fetch('/api/validation/honesty-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          outputTypes: plan.outputTypes ?? [plan.outputType],
          assumption: plan.assumption || undefined,
          signal: plan.signal ?? undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Could not generate the read');
      onGenerated?.(data.read as HonestyRead);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the read');
    } finally {
      setIsGenerating(false);
    }
  }, [workshopId, plan.outputTypes, plan.outputType, plan.assumption, plan.signal, onGenerated]);

  // One-shot auto-generate for plans assembled without a read (owners only).
  React.useEffect(() => {
    if (read || isReadOnly || triggered.current) return;
    triggered.current = true;
    void generate();
  }, [read, isReadOnly, generate]);

  if (!read && isReadOnly) return null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">The honest read</h3>
          <p className="mt-0.5 text-sm text-foreground/70">
            How strong this idea is right now — credited only from what the workshop actually
            showed, never from optimism.
          </p>
        </div>
        <Icon name="eye" className="mt-1 h-5 w-5 shrink-0 text-foreground/50" />
      </div>

      {/* Loading */}
      {!read && isGenerating && (
        <div className="flex items-center gap-2 py-4 text-sm text-foreground/70">
          <Icon name="spinner" className="h-4 w-4 animate-spin" />
          Weighing your evidence…
        </div>
      )}

      {/* Error */}
      {!read && !isGenerating && error && (
        <div className="space-y-2 py-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={generate}>
            Try again
          </Button>
        </div>
      )}

      {read && (
        <>
          {/* Verdict line — the headline judgment. */}
          <p className="border-l-2 border-foreground/30 pl-3 text-base font-medium text-foreground">
            {read.verdictLine}
          </p>

          {/* Dimension reads */}
          <ul className="space-y-3">
            {read.dimensions.map((d) => (
              <li key={d.dimension} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', STRENGTH_DOT[d.strength])}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{DIMENSION_LABELS[d.dimension] ?? d.dimension}</span>{' '}
                    <span className={cn('font-medium', STRENGTH_TEXT[d.strength])}>
                      · {STRENGTH_LABELS[d.strength]}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-foreground/80">{d.read}</p>
                  {d.sources.length > 0 && (
                    <p className="mt-0.5 text-[13px] text-foreground/60">
                      From: {d.sources.join(' · ')}
                    </p>
                  )}
                  {d.nextTest && (
                    <p className="mt-1 text-sm text-foreground/80">
                      <Icon name="arrow-right" className="mr-1 inline h-3.5 w-3.5 text-foreground/60" />
                      Cheapest way to firm this up: {d.nextTest}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <p className="text-[13px] text-foreground/60">
            This read only credits evidence from your workshop steps. Run your test to turn it
            into a Validation Score.
          </p>
        </>
      )}
    </>
  );

  if (flat) return <div className="space-y-4 border-t border-border/60 pt-5">{body}</div>;
  return <Surface className="space-y-4 p-5">{body}</Surface>;
}
