import type { ProgressStep } from '@/lib/schemas';

/** Ordered sections of the validation flow. 'complete' = plan generated. */
export const SECTION_ORDER: ProgressStep[] = [
  'detect',
  'assumption',
  'lens',
  'artifact',
  'signal',
  'complete',
];

export const SECTION_LABELS: Record<ProgressStep, string> = {
  detect: 'Output type',
  assumption: 'Riskiest assumption',
  lens: 'Validation lens',
  artifact: 'Recommended test',
  signal: 'Success signal',
  complete: 'Plan',
};

/** The six visible steps in the progress rail (excludes the terminal 'complete'). */
export const RAIL_SECTIONS: ProgressStep[] = [
  'detect',
  'assumption',
  'lens',
  'artifact',
  'signal',
];

export type SectionStatus = 'locked' | 'active' | 'done';

/**
 * Status of a section relative to the plan's current step.
 * `progress` is the plan's `progressStep` — the section currently in progress
 * ('complete' once the signal is committed and the plan is assembled).
 */
export function sectionStatus(
  section: ProgressStep,
  progress: ProgressStep
): SectionStatus {
  const activeIdx = SECTION_ORDER.indexOf(progress);
  const idx = SECTION_ORDER.indexOf(section);
  if (idx < activeIdx) return 'done';
  if (idx === activeIdx) return 'active';
  return 'locked';
}

/** The next section after the given progress step. */
export function nextSection(progress: ProgressStep): ProgressStep {
  const idx = SECTION_ORDER.indexOf(progress);
  return SECTION_ORDER[Math.min(idx + 1, SECTION_ORDER.length - 1)];
}
