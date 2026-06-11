'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
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
 *
 * Phase 65: sessionId and journeyFlowApproved are threaded through so ValidationGuidanceCard
 * can render the same digital links (Journey Flow, prototype) available on the Validate step.
 */
export function ValidationPlanDeliverable({
  workshopId,
  sessionId,
  journeyFlowApproved = false,
  isReadOnly = false,
  onBack,
}: {
  workshopId: string;
  sessionId: string;
  /** Journey Flow marked complete — enables the prototype-builder link inside the guidance card. */
  journeyFlowApproved?: boolean;
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
          <Icon name="arrow-left" className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
          <Icon name="clipboard-check" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Validation Plan</h2>
          <p className="text-sm text-foreground/70">
            {isReadOnly
              ? 'The riskiest assumption, the test, and the result once recorded.'
              : 'Record the result here whenever you’ve run the test — it’s optional and saves automatically.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Icon name="spinner" className="h-6 w-6 animate-spin text-foreground/70" />
        </div>
      ) : plans.length === 0 ? (
        <p className="py-8 text-center text-base text-foreground/70">
          No validation plan yet. Build one on the Validate step.
        </p>
      ) : (
        <div className="space-y-12">
          {plans.map((plan) => (
            <section key={plan.id} className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold tracking-tight">
                  {plan.conceptName} — {LENS_LABELS[plan.lens]}
                </h3>
              </div>

              <ValidationPlanSummary plan={plan} />

              <ValidationGuidanceCard
                outputType={plan.outputType}
                outputTypes={plan.outputTypes ?? [plan.outputType]}
                tailoredExample={plan.tailoredExample}
                sessionId={sessionId}
                journeyFlowApproved={journeyFlowApproved}
                flat
              />

              {isReadOnly ? (
                <ReadOnlyResult plan={plan} />
              ) : (
                <RecordResultsCard
                  plan={plan}
                  isSaving={recordingId === plan.id}
                  error={recordingId === plan.id ? recordError : null}
                  onRecord={(input) => record(plan.id, input)}
                  flat
                />
              )}
            </section>
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
      <p className="border-t border-border/60 pt-5 text-sm text-foreground/70">
        No result recorded yet.
      </p>
    );
  }
  const { score, verdict } = plan.result;
  return (
    <div className="flex items-start gap-4 border-t border-border/60 pt-5">
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
    </div>
  );
}
