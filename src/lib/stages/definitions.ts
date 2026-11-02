import type { StageId } from '@/db/schema/workshops';

/**
 * Display names for the stages. The full stage definitions (goal, fields,
 * boards, tools, done-test) live beside this file and arrive with the engine.
 */
export const STAGE_LABELS: Record<StageId, string> = {
  setup: 'Setup',
  discover: 'Discover',
  define: 'Define',
  develop: 'Develop',
  deliver: 'Deliver',
};

export const STAGE_ORDER: StageId[] = ['setup', 'discover', 'define', 'develop', 'deliver'];

export function nextStage(stage: StageId): StageId | null {
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}
