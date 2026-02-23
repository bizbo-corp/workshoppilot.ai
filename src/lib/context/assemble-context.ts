import { db } from '@/db/client';
import { stepSummaries, workshopSteps } from '@/db/schema';
import { eq, and, ne, asc, inArray } from 'drizzle-orm';
import { getStepById } from '@/lib/workshop/step-metadata';
import { loadCanvasState } from '@/actions/canvas-actions';
import { assembleCanvasContextForStep, assembleEmpathyMapCanvasContext, assembleStakeholderCanvasContext } from '@/lib/workshop/context/canvas-context';
import type { StepContext } from './types';

/**
 * Which prior step summaries each step needs as context.
 * Empty array = no prior context (Step 1).
 * 'all' = every prior step summary (Step 10 validate).
 */
const STEP_SUMMARY_DEPS: Record<string, string[] | 'all'> = {
  'challenge':            [],
  'stakeholder-mapping':  ['challenge'],
  'user-research':        ['challenge', 'stakeholder-mapping'],
  'sense-making':         ['challenge', 'user-research'],
  'persona':              ['stakeholder-mapping', 'user-research', 'sense-making'],
  'journey-mapping':      ['challenge', 'user-research', 'sense-making', 'persona'],
  'reframe':              ['challenge', 'sense-making', 'persona', 'journey-mapping'],
  'ideation':             ['sense-making', 'persona', 'journey-mapping', 'reframe'],
  'concept':              ['stakeholder-mapping', 'user-research', 'sense-making', 'persona', 'journey-mapping', 'reframe', 'ideation'],
  'validate':             'all',
};

/**
 * Assemble context for an AI request
 *
 * Gathers prior step knowledge for injection into system prompts:
 * - Tier 2 (Summaries): AI summaries from dependent prior steps
 * - Tier 4 (Canvas): Canvas state for the current step
 *
 * Tier 1 (artifacts) was removed — summaries carry the key decisions
 * and outputs without the massive binary/canvas data overhead.
 * Tier 3 (messages) was removed — messages come from the client.
 *
 * This function runs on EVERY chat request, so queries must be efficient.
 *
 * @param workshopId - The workshop ID (wks_xxx)
 * @param currentStepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @returns StepContext object with context tiers
 */
export async function assembleStepContext(
  workshopId: string,
  currentStepId: string,
): Promise<StepContext> {
  // Tier 2: Query summaries filtered by step dependency map
  const deps = STEP_SUMMARY_DEPS[currentStepId];
  let summaries = '';

  if (deps === 'all') {
    // Step 10 (validate): load all summaries except current step
    const summaryRows = await db
      .select({
        stepId: stepSummaries.stepId,
        summary: stepSummaries.summary,
      })
      .from(stepSummaries)
      .innerJoin(workshopSteps, eq(stepSummaries.workshopStepId, workshopSteps.id))
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          ne(stepSummaries.stepId, currentStepId)
        )
      )
      .orderBy(asc(workshopSteps.createdAt));

    const summaryStrings = summaryRows.map((row) => {
      const step = getStepById(row.stepId);
      const stepName = step?.name || row.stepId;
      return `Step ${stepName} (${row.stepId}): ${row.summary}`;
    });

    summaries = summaryStrings.join('\n\n');
  } else if (deps && deps.length > 0) {
    // Load only the summaries this step depends on
    const summaryRows = await db
      .select({
        stepId: stepSummaries.stepId,
        summary: stepSummaries.summary,
      })
      .from(stepSummaries)
      .innerJoin(workshopSteps, eq(stepSummaries.workshopStepId, workshopSteps.id))
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          inArray(stepSummaries.stepId, deps)
        )
      )
      .orderBy(asc(workshopSteps.createdAt));

    const summaryStrings = summaryRows.map((row) => {
      const step = getStepById(row.stepId);
      const stepName = step?.name || row.stepId;
      return `Step ${stepName} (${row.stepId}): ${row.summary}`;
    });

    summaries = summaryStrings.join('\n\n');
  }
  // else: deps is [] (Step 1) — no summaries needed, skip query

  // Tier 4: Query canvas state for this step
  const canvasState = await loadCanvasState(workshopId, currentStepId);
  let canvasContext = canvasState
    ? assembleCanvasContextForStep(currentStepId, canvasState.stickyNotes || [], canvasState.gridColumns, canvasState.personaTemplates, canvasState.hmwCards)
    : (currentStepId === 'journey-mapping'
      ? assembleCanvasContextForStep(currentStepId, [])
      : '');

  // For user-research step, inject Step 2's stakeholder canvas data so the AI
  // can generate diverse persona candidates from the full cluster hierarchy
  if (currentStepId === 'user-research') {
    const step2Canvas = await loadCanvasState(workshopId, 'stakeholder-mapping');
    if (step2Canvas?.stickyNotes && step2Canvas.stickyNotes.length > 0) {
      const stakeholderContext = assembleStakeholderCanvasContext(step2Canvas.stickyNotes);
      if (stakeholderContext) {
        canvasContext = canvasContext
          ? `${canvasContext}\n\nStep 2 Stakeholder Map (use these to generate diverse persona candidates):\n${stakeholderContext}`
          : `Step 2 Stakeholder Map (use these to generate diverse persona candidates):\n${stakeholderContext}`;
      }
    }
  }

  // For persona step, inject Step 4's empathy map canvas data so the AI
  // can populate the empathy fields with real insights from the research
  if (currentStepId === 'persona') {
    const step4Canvas = await loadCanvasState(workshopId, 'sense-making');
    if (step4Canvas?.stickyNotes && step4Canvas.stickyNotes.length > 0) {
      const empathyContext = assembleEmpathyMapCanvasContext(step4Canvas.stickyNotes);
      if (empathyContext) {
        canvasContext = canvasContext
          ? `${canvasContext}\n\nStep 4 Empathy Map (use these insights to populate empathy fields):\n${empathyContext}`
          : `Step 4 Empathy Map (use these insights to populate empathy fields):\n${empathyContext}`;
      }
    }
  }

  // Extract flat list of sticky note names for dedup blocklist
  const existingItemNames: string[] = canvasState?.stickyNotes
    ?.filter(p => (!p.type || p.type === 'stickyNote') && !p.isPreview && p.text.trim())
    .map(p => p.text.trim()) || [];

  return {
    persistentContext: '',
    summaries,
    canvasContext,
    existingItemNames,
    messages: [],
  };
}
