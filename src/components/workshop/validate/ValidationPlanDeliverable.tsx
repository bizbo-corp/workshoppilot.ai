'use client';

import * as React from 'react';
import { ArrowLeft, ClipboardCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { getValidationState, recordValidationResult } from '@/actions/validation-actions';
import type { ValidationPlan } from '@/lib/schemas';
import { LENS_LABELS } from '@/lib/validation/artifact-lookup';
import { VERDICT_LABELS } from '@/lib/validation/score';
import { ValidationPlanSummary } from './ValidationPlanSummary';
import { ValidationGuidanceCard } from './ValidationGuidanceCard';
import { RecordResultsCard, type RecordResultInput } from './RecordResultsCard';
import { ScoreRing } from './ScoreRing';

/**
 * Interactive Validation Plan view inside the Build Pack. The plan was wrapped up on the Validate
 * step; here the owner can record the real-world result whenever the test has run (it carries
 * straight back to the plan + the exported markdown). Read-only guests see the plan and any
 * result, without editing.
 */
export function ValidationPlanDeliverable({
  workshopId,
  isReadOnly = false,
  onBack,
}: {
  workshopId: string;
  sessionId: string;
  isReadOnly?: boolean;
  onBack: () => void;
}) {
  const [plans, setPlans] = React.useState<ValidationPlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [recordingId, setRecordingId] = React.useState<string | null>(null);
  const [recordError, setRecordError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getValidationState(workshopId);
      if (cancelled) return;
      if (res.success) {
        // Show wrapped-up plans (assembled). Fall back to all plans if none are marked complete.
        const all = res.data!.validationPlans;
        const complete = all.filter((p) => p.progressStep === 'complete');
        setPlans(complete.length > 0 ? complete : all);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workshopId]);

  const record = async (planId: string, input: RecordResultInput) => {
    setRecordingId(planId);
    setRecordError(null);
    const res = await recordValidationResult(workshopId, planId, input);
    setRecordingId(null);
    if (!res.success) {
      setRecordError(res.error || 'Failed to record result');
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === planId ? res.data!.plan : p)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Validation Plan</h1>
          <p className="text-sm text-foreground/70">
            {isReadOnly
              ? 'The riskiest assumption, the test, and the result once recorded.'
              : 'Record the result here whenever you’ve run the test — it’s optional and saves automatically.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/70" />
        </div>
      ) : plans.length === 0 ? (
        <Surface className="p-8 text-center text-base text-foreground/70">
          No validation plan yet. Build one on the Validate step.
        </Surface>
      ) : (
        <div className="space-y-6">
          {plans.map((plan) => (
            <Surface key={plan.id} className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">
                  {plan.conceptName} — {LENS_LABELS[plan.lens]}
                </h2>
              </div>

              <ValidationPlanSummary plan={plan} />

              <ValidationGuidanceCard
                outputType={plan.outputType}
                tailoredExample={plan.tailoredExample}
              />

              {isReadOnly ? (
                <ReadOnlyResult plan={plan} />
              ) : (
                <RecordResultsCard
                  plan={plan}
                  isSaving={recordingId === plan.id}
                  error={recordingId === plan.id ? recordError : null}
                  onRecord={(input) => record(plan.id, input)}
                />
              )}
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}

/** Static result display for read-only guests (no editing affordances). */
function ReadOnlyResult({ plan }: { plan: ValidationPlan }) {
  if (!plan.result) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-foreground/70">
        No result recorded yet.
      </p>
    );
  }
  const { score, verdict } = plan.result;
  return (
    <Surface variant="panel" className="flex items-start gap-4 bg-background p-4">
      {score != null && <ScoreRing score={score} verdict={verdict} />}
      <div className="min-w-0 flex-1 space-y-1">
        <span className="text-base font-semibold">{VERDICT_LABELS[verdict]}</span>
        {plan.result.qualitative?.themes && plan.result.qualitative.themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plan.result.qualitative.themes.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[13px] text-foreground/80"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {plan.result.qualitative?.summary && (
          <p className="text-sm text-foreground/70">{plan.result.qualitative.summary}</p>
        )}
        {plan.result.notes && <p className="text-sm text-foreground/70">“{plan.result.notes}”</p>}
      </div>
    </Surface>
  );
}
