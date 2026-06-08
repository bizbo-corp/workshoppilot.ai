/**
 * Render validation plans as Build Pack markdown.
 */

import type { ValidationPlan } from '@/lib/schemas';
import { OUTPUT_TYPE_LABELS, LENS_LABELS } from '@/lib/validation/artifact-lookup';
import { VERDICT_LABELS, nextStepNudge } from '@/lib/validation/score';

function planSection(plan: ValidationPlan): string {
  const lines: string[] = [];
  lines.push(`## ${plan.conceptName} — ${LENS_LABELS[plan.lens]}`);
  lines.push('');
  lines.push(
    `- **Output type:** ${(plan.outputTypes ?? [plan.outputType])
      .map((t) => OUTPUT_TYPE_LABELS[t])
      .join(' + ')}`
  );
  lines.push(`- **Riskiest assumption:** ${plan.assumption}`);
  lines.push(`- **Lens:** ${LENS_LABELS[plan.lens]}`);
  lines.push(`- **Test:** ${plan.artifactLabel}`);
  if (plan.signal) {
    lines.push(
      `- **Success signal:** ${plan.signal.metric} — target ${plan.signal.target} of ${plan.signal.sampleSize}` +
        (plan.signal.killThreshold != null ? `, pivot at ≤${plan.signal.killThreshold}` : '')
    );
    if (plan.signal.successCriteriaText) {
      lines.push(`  - Proves right: ${plan.signal.successCriteriaText}`);
    }
    if (plan.signal.failCriteriaText) {
      lines.push(`  - Proves wrong: ${plan.signal.failCriteriaText}`);
    }
  }
  if (plan.result) {
    lines.push('');
    lines.push(
      `**Result:** ${plan.result.actual} measured → score ${plan.result.score}/100 — ${VERDICT_LABELS[plan.result.verdict]}.`
    );
    lines.push(`_${nextStepNudge(plan.result.verdict)}_`);
    if (plan.result.notes) lines.push(`Notes: ${plan.result.notes}`);
  } else {
    lines.push('');
    lines.push('_No result recorded yet._');
  }
  lines.push('');
  return lines.join('\n');
}

export function renderValidationPlanMarkdown(plans: ValidationPlan[]): string {
  const header = [
    '# Validation Plan',
    '',
    'Design thinking validates an assumption about a human need — not the thing itself.',
    'Each plan below pre-commits a measurable signal so the result can be scored honestly.',
    '',
    '_The validation score is a decision aid — it measures the result against the stated target, not objective truth._',
    '',
  ].join('\n');

  if (plans.length === 0) {
    return `${header}\n_No validation plans yet._\n`;
  }
  return `${header}\n${plans.map(planSection).join('\n')}`;
}
