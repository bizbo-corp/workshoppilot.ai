'use client';

import type { ValidationPlan } from '@/lib/schemas';
import { OUTPUT_TYPE_LABELS, LENS_LABELS } from '@/lib/validation/artifact-lookup';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-base">
      <dt className="text-foreground/70">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

/** Compact, read-only recap of a validation plan. */
export function ValidationPlanSummary({ plan }: { plan: ValidationPlan }) {
  return (
    <dl className="space-y-1.5">
      <Row label="Solution">{plan.conceptName}</Row>
      <Row label="Output type">
        {(plan.outputTypes ?? [plan.outputType]).map((t) => OUTPUT_TYPE_LABELS[t]).join(' + ')}
      </Row>
      <Row label="Assumption">
        <span className="italic">“{plan.assumption}”</span>
      </Row>
      <Row label="Lens">{LENS_LABELS[plan.lens]}</Row>
      <Row label="Test">{plan.artifactLabel}</Row>
      {plan.signal && (
        <Row label="Signal">
          {plan.signal.metric} — target {plan.signal.target} of {plan.signal.sampleSize}
          {plan.signal.killThreshold != null ? `, pivot at ≤${plan.signal.killThreshold}` : ''}
        </Row>
      )}
    </dl>
  );
}
