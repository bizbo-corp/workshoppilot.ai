/**
 * Render validation plans as Build Pack markdown.
 */

import type { ValidationPlan } from '@/lib/schemas';
import { OUTPUT_TYPE_LABELS, LENS_LABELS } from '@/lib/validation/artifact-lookup';
import { getValidationGuidance } from '@/lib/validation/output-type-guidance';
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

  // Output-type-tailored validation approach (in-workshop vs post-workshop). Falls back to the
  // generic content above for output types with no tailored guidance (e.g. business offering).
  const guidance = getValidationGuidance(plan.outputType);
  if (guidance) {
    lines.push('');
    lines.push(`### Recommended validation approach`);
    lines.push('');
    lines.push(`${guidance.approach}.`);
    lines.push('');
    lines.push(`**In the workshop**`);
    for (const item of guidance.inWorkshop) lines.push(`- ${item}`);
    lines.push('');
    lines.push(`**After the workshop**`);
    for (const item of guidance.postWorkshop) lines.push(`- ${item}`);
    if (guidance.qualNote) {
      lines.push('');
      lines.push(`**Measuring it:** ${guidance.qualNote}`);
    }
    if (guidance.example) {
      lines.push('');
      lines.push(`**Worked example:** ${guidance.example}`);
    }
    if (plan.tailoredExample) {
      lines.push('');
      lines.push(`**For your solution:** ${plan.tailoredExample}`);
    }
    lines.push('');
    lines.push(
      `_This Validation Plan is complete — the step is marked done as soon as the plan exists. ` +
        `The post-workshop actions above continue afterwards and don’t reopen the step._`
    );
  }

  if (plan.signal) {
    if (plan.signal.metricType === 'qualitative') {
      lines.push(
        `- **Success signal:** ${plan.signal.metric} — judged qualitatively` +
          (plan.signal.sampleSize ? ` with ${plan.signal.sampleSize} people` : '')
      );
    } else {
      lines.push(
        `- **Success signal:** ${plan.signal.metric} — target ${plan.signal.target} of ${plan.signal.sampleSize}` +
          (plan.signal.killThreshold != null ? `, pivot at ≤${plan.signal.killThreshold}` : '') +
          (plan.signal.allowQualitative ? ' (plus qualitative observations)' : '')
      );
    }
    if (plan.signal.successCriteriaText) {
      lines.push(`  - Proves right: ${plan.signal.successCriteriaText}`);
    }
    if (plan.signal.failCriteriaText) {
      lines.push(`  - Proves wrong: ${plan.signal.failCriteriaText}`);
    }
  }
  if (plan.result) {
    lines.push('');
    const scoreSuffix = plan.result.score != null ? ` → score ${plan.result.score}/100` : '';
    if (plan.result.actual != null) {
      lines.push(
        `**Result:** ${plan.result.actual} measured${scoreSuffix} — ${VERDICT_LABELS[plan.result.verdict]}.`
      );
    } else {
      lines.push(`**Result:** judged ${VERDICT_LABELS[plan.result.verdict]}${scoreSuffix}.`);
    }
    const qual = plan.result.qualitative;
    if (qual?.themes && qual.themes.length > 0) {
      lines.push(`Themes: ${qual.themes.join(', ')}`);
    }
    if (qual?.summary) lines.push(`Observed: ${qual.summary}`);
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
