'use client';

import * as React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Surface } from '@/components/ui/surface';
import type { QualitativeResult, ValidationPlan, Verdict } from '@/lib/schemas';
import { VERDICT_LABELS, nextStepNudge } from '@/lib/validation/score';
import { ScoreRing } from './ScoreRing';

const VERDICT_BADGE: Record<Verdict, string> = {
  validated: 'bg-green-500/10 text-green-700 dark:text-green-400',
  promising: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  inconclusive: 'bg-muted text-foreground/70',
  invalidated: 'bg-destructive/10 text-destructive',
};

const VERDICT_ORDER: Verdict[] = ['validated', 'promising', 'inconclusive', 'invalidated'];

export interface RecordResultInput {
  actual?: number;
  notes?: string;
  verdict?: Verdict;
  qualitative?: QualitativeResult;
}

/**
 * Shown once a plan's signal is committed. Collects the real-world result and renders the
 * computed score + verdict. Adapts to the signal's metric type:
 *  - quantitative: a number → score/verdict computed from the bar.
 *  - qualitative:  pick a verdict from observed themes (no number).
 *  - hybrid (allowQualitative): a number PLUS optional themes / verdict read.
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
  onRecord: (input: RecordResultInput) => void;
}) {
  const isQualitative = plan.signal?.metricType === 'qualitative';
  const isHybrid = !isQualitative && !!plan.signal?.allowQualitative;
  const wantsQual = isQualitative || isHybrid;

  const [actual, setActual] = React.useState(
    plan.result?.actual != null ? plan.result.actual.toString() : ''
  );
  const [notes, setNotes] = React.useState(plan.result?.notes ?? '');
  const [verdict, setVerdict] = React.useState<Verdict | null>(plan.result?.verdict ?? null);
  const [themes, setThemes] = React.useState((plan.result?.qualitative?.themes ?? []).join(', '));
  const [summary, setSummary] = React.useState(plan.result?.qualitative?.summary ?? '');
  // Collapsed by default — recording a result is optional and usually happens AFTER the workshop.
  const [editing, setEditing] = React.useState(false);

  // When a freshly computed result arrives, leave the edit form and show the score.
  React.useEffect(() => {
    if (plan.result) setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.result?.recordedAt]);

  const actualNum = actual.trim() === '' ? null : Number(actual);
  const numValid = actualNum != null && Number.isFinite(actualNum);

  const isPercent = plan.signal?.metricType === 'percent';
  const unit = isPercent ? '%' : '';
  const hasTarget = plan.signal?.target != null;
  const targetDisplay = isPercent
    ? `${plan.signal?.target}%`
    : `${plan.signal?.target} of ${plan.signal?.sampleSize}`;

  // Validity: qualitative needs a verdict; quantitative/hybrid need a number.
  const valid = isQualitative ? verdict != null : numValid;

  const buildPayload = (): RecordResultInput => {
    const themeList = themes
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const qualitative =
      wantsQual && (themeList.length > 0 || summary.trim())
        ? { themes: themeList, ...(summary.trim() ? { summary: summary.trim() } : {}) }
        : undefined;
    return {
      ...(isQualitative ? {} : numValid ? { actual: actualNum! } : {}),
      ...(verdict ? { verdict } : {}),
      ...(qualitative ? { qualitative } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
  };

  // ─────────────────────────── Recorded view ───────────────────────────
  if (plan.result && !editing) {
    const { score, verdict: v } = plan.result;
    const qual = plan.result.qualitative;
    return (
      <Surface className="p-5">
        <div className="flex items-start gap-4">
          {score != null && <ScoreRing score={score} verdict={v} />}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn('rounded-full px-2.5 py-0.5 text-sm font-semibold', VERDICT_BADGE[v])}
              >
                {VERDICT_LABELS[v]}
              </span>
              {plan.result.actual != null && hasTarget && (
                <span className="text-sm text-foreground/70">
                  {plan.result.actual}
                  {unit} vs. target {targetDisplay}
                </span>
              )}
            </div>
            <p className="text-base text-foreground">{nextStepNudge(v)}</p>
            {qual?.themes && qual.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {qual.themes.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[13px] text-foreground/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {qual?.summary && <p className="text-sm text-foreground/70">{qual.summary}</p>}
            {plan.result.notes && (
              <p className="text-sm text-foreground/70">“{plan.result.notes}”</p>
            )}
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
              Update result
            </Button>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-foreground/70">
          {isQualitative
            ? 'The score reflects the verdict you judged — a decision aid, not objective truth.'
            : 'The score is a decision aid — it measures your result against the target you set, not objective truth.'}
        </p>
      </Surface>
    );
  }

  // ─────────────────────────── Collapsed (default) ───────────────────────────
  if (!editing) {
    return (
      <Surface className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-base font-semibold">Record your result</h4>
            <p className="mt-0.5 text-sm text-foreground/70">
              Optional — add this once you’ve run the test. You don’t need it to finish the
              workshop, and it carries over to your Build Pack.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setEditing(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Record a result
          </Button>
        </div>
      </Surface>
    );
  }

  // ─────────────────────────── Edit view ───────────────────────────
  return (
    <Surface className="border-primary/30 p-5">
      <h4 className="text-base font-semibold">Record your result</h4>
      <p className="mt-1 text-base text-foreground/70">
        {isQualitative ? (
          <>Judge what you observed for: <span className="font-medium text-foreground">{plan.signal?.metric || 'your test'}</span>.</>
        ) : (
          <>
            {plan.signal?.metric || 'Your measured value'} — you targeted{' '}
            <span className="font-medium text-foreground">{targetDisplay}</span>.
          </>
        )}
      </p>

      <div className="mt-4 space-y-3">
        {/* Numeric input (quantitative + hybrid) */}
        {!isQualitative && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Actual value{isPercent ? ' (%)' : ''}</label>
            <Input
              type="number"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder={
                isPercent ? 'What % did you get?' : `How many of your ${plan.signal?.sampleSize ?? 'N'}?`
              }
            />
          </div>
        )}

        {/* Verdict picker (qualitative required; hybrid optional override) */}
        {wantsQual && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Your read{isHybrid && <span className="font-normal text-foreground/70"> (optional — overrides the number)</span>}
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {VERDICT_ORDER.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdict(verdict === v ? (isHybrid ? null : v) : v)}
                  className={cn(
                    'rounded-md border px-2 py-1.5 text-sm font-medium transition-colors',
                    verdict === v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                  )}
                >
                  {VERDICT_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Themes + observations (qualitative + hybrid) */}
        {wantsQual && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Themes <span className="text-foreground/70">(comma-separated, optional)</span>
              </label>
              <Input
                value={themes}
                onChange={(e) => setThemes(e.target.value)}
                placeholder="e.g. clear value, price concern, loved the tone"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                What you observed <span className="text-foreground/70">(optional)</span>
              </label>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
            </div>
          </>
        )}

        {/* General notes (quantitative only — hybrid/qual use "What you observed") */}
        {!wantsQual && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Notes <span className="text-foreground/70">(optional)</span>
            </label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            disabled={!valid || isSaving}
            onClick={() => valid && onRecord(buildPayload())}
            className="gap-1.5"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isQualitative ? 'Record result' : 'Compute score'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </Surface>
  );
}
