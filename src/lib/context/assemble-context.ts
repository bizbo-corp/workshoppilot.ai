import { db } from '@/db/client';
import { stepArtifacts, stepSummaries, chatMessages, workshopSteps } from '@/db/schema';
import { eq, and, ne, asc } from 'drizzle-orm';
import { getStepById } from '@/lib/workshop/step-metadata';
import { loadCanvasState } from '@/actions/canvas-actions';
import { assembleCanvasContextForStep, assembleEmpathyMapCanvasContext } from '@/lib/workshop/context/canvas-context';
import type { StepContext } from './types';

/**
 * Assemble three-tier context for an AI request
 *
 * Gathers all prior knowledge for the AI to inject into prompts:
 * - Tier 1 (Persistent): All structured artifacts from completed steps
 * - Tier 2 (Long-term): AI summaries from previous steps (not current)
 * - Tier 3 (Short-term): Verbatim chat messages from current step
 *
 * This function runs on EVERY chat request, so queries must be efficient.
 *
 * @param workshopId - The workshop ID (wks_xxx)
 * @param currentStepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param sessionId - The session ID (ses_xxx)
 * @returns StepContext object with three-tier context
 */
export async function assembleStepContext(
  workshopId: string,
  currentStepId: string,
  sessionId: string
): Promise<StepContext> {
  // Tier 1: Query all artifacts for this workshop
  const artifactRows = await db
    .select({
      stepId: stepArtifacts.stepId,
      artifact: stepArtifacts.artifact,
      stepOrder: workshopSteps.stepId, // Will use for sorting
    })
    .from(stepArtifacts)
    .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
    .where(eq(workshopSteps.workshopId, workshopId))
    .orderBy(asc(workshopSteps.createdAt)); // Order by creation time (proxy for step order)

  // Format artifacts as context strings
  const artifactStrings = artifactRows.map((row) => {
    const step = getStepById(row.stepId);
    const stepName = step?.name || row.stepId;
    return `Step ${stepName} (${row.stepId}): ${JSON.stringify(row.artifact)}`;
  });

  const persistentContext = artifactStrings.length > 0
    ? artifactStrings.join('\n\n')
    : '';

  // Tier 2: Query summaries for this workshop (excluding current step)
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
    .orderBy(asc(workshopSteps.createdAt)); // Order by creation time

  // Format summaries as context strings
  const summaryStrings = summaryRows.map((row) => {
    const step = getStepById(row.stepId);
    const stepName = step?.name || row.stepId;
    return `Step ${stepName} (${row.stepId}): ${row.summary}`;
  });

  const summaries = summaryStrings.length > 0
    ? summaryStrings.join('\n\n')
    : '';

  // Tier 3: Query current step messages
  const messageRows = await db
    .select({
      role: chatMessages.role,
      content: chatMessages.content,
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatMessages.stepId, currentStepId)
      )
    )
    .orderBy(asc(chatMessages.createdAt));

  const messages = messageRows.map((row) => ({
    role: row.role,
    content: row.content,
  }));

  // Tier 4: Query canvas state for this step
  const canvasState = await loadCanvasState(workshopId, currentStepId);
  let canvasContext = canvasState
    ? assembleCanvasContextForStep(currentStepId, canvasState.postIts || [], canvasState.gridColumns, canvasState.personaTemplates, canvasState.hmwCards)
    : (currentStepId === 'journey-mapping'
      ? assembleCanvasContextForStep(currentStepId, [])
      : '');

  // For persona step, inject Step 4's empathy map canvas data so the AI
  // can populate the empathy fields with real insights from the research
  if (currentStepId === 'persona') {
    const step4Canvas = await loadCanvasState(workshopId, 'sense-making');
    if (step4Canvas?.postIts && step4Canvas.postIts.length > 0) {
      const empathyContext = assembleEmpathyMapCanvasContext(step4Canvas.postIts);
      if (empathyContext) {
        canvasContext = canvasContext
          ? `${canvasContext}\n\nStep 4 Empathy Map (use these insights to populate empathy fields):\n${empathyContext}`
          : `Step 4 Empathy Map (use these insights to populate empathy fields):\n${empathyContext}`;
      }
    }
  }

  return {
    persistentContext,
    summaries,
    canvasContext,
    messages,
  };
}
