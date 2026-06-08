'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ValidationPlan, Verdict } from '@/lib/schemas';
import { VERDICT_LABELS, nextStepNudge } from '@/lib/validation/score';
import { ScoreRing } from './ScoreRing';

const VERDICT_BADGE: Record<Verdict, string> = {
  validated: 'bg-green-500/10 text-green-700 dark:text-green-400',
  promising: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  inconclusive: 'bg-muted text-foreground/70',
  invalidated: 'bg-destructive/10 text-destructive',
};

/**
 * Async entry point shown once a plan's signal is committed. Collects the real-world
 * result and renders the computed score + verdict.
 */
export function RecordResultsCard({
  plan,
  isSaving,
  error,
  onRecord,
}: {
  plan: ValidationPlan;
  isSaving: boolean;
  error: string | null;
  onRecord: (actual: number, notes?: string) => void;
}) {
  const [actual, setActual] = React.useState(
    plan.result ? plan.result.actual.toString() : ''
  );
  const [notes, setNotes] = React.useState(plan.result?.notes ?? '');
  const [editing, setEditing] = React.useState(!plan.result);

  // When a freshly computed result arrives, leave the edit form and show the score.
  // Keyed on recordedAt so re-renders don't override a manual "Update result".
  React.useEffect(() => {
    if (plan.result) setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.result?.recordedAt]);

  const actualNum = actual.trim() === '' ? null : Number(actual);
  const valid = actualNum != null && Number.isFinite(actualNum);

  const isPercent = plan.signal?.metricType === 'percent';
  const unit = isPercent ? '%' : '';
  const targetDisplay = isPercent
    ? `${plan.signal?.target}%`
    : `${plan.signal?.target} of ${plan.signal?.sampleSize}`;

  if (plan.result && !editing) {
    const { score, verdict } = plan.result;
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-4">
          <ScoreRing score={score} verdict={verdict} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-sm font-semibold',
                  VERDICT_BADGE[verdict]
                )}
              >
                {VERDICT_LABELS[verdict]}
              </span>
              <span className="text-sm text-foreground/70">
                {plan.result.actual}
                {unit} vs. target {targetDisplay}
              </span>
            </div>
            <p className="text-base text-foreground">{nextStepNudge(verdict)}</p>
            {plan.result.notes && (
              <p className="text-sm text-foreground/70">“{plan.result.notes}”</p>
            )}
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
              Update result
            </Button>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-foreground/70">
          The score is a decision aid — it measures your result against the target you set, not
          objective truth.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5">
      <h4 className="text-base font-semibold">Record your result</h4>
      <p className="mt-1 text-base text-foreground/70">
        {plan.signal?.metric || 'Your measured value'} — you targeted{' '}
        <span className="font-medium text-foreground">{targetDisplay}</span>.
      </p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Actual value{isPercent ? ' (%)' : ''}
          </label>
          <Input
            type="number"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder={
              isPercent ? 'What % did you get?' : `How many of your ${plan.signal?.sampleSize ?? 'N'}?`
            }
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Notes <span className="text-foreground/70">(optional)</span>
          </label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            disabled={!valid || isSaving}
            onClick={() => valid && onRecord(actualNum!, notes.trim() || undefined)}
            className="gap-1.5"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Compute score
          </Button>
          {plan.result && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
