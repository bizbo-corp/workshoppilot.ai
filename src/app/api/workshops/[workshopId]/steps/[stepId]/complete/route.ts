import { db } from '@/db/client';
import { workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateStepSummary } from '@/lib/context/generate-summary';
import { getStepById } from '@/lib/workshop/step-metadata';

/**
 * POST /api/workshops/[workshopId]/steps/[stepId]/complete
 * Marks a workshop step as complete and generates conversation summary
 *
 * Request body:
 * - sessionId: string - The session ID (ses_xxx) for loading conversation
 *
 * Response:
 * - 200: { success: true, stepId: string, status: 'complete' }
 * - 400: Missing sessionId
 * - 404: Workshop step not found
 * - 500: Server error
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workshopId: string; stepId: string }> }
) {
  try {
    const { workshopId, stepId } = await params;
    const { sessionId } = await req.json();

    // Validate required parameters
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Add authentication check when step-specific permissions are implemented

    // Find the workshop step record
    const workshopStepResult = await db
      .select()
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      )
      .limit(1);

    if (workshopStepResult.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Workshop step not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const workshopStep = workshopStepResult[0];

    // Update step status to complete
    await db
      .update(workshopSteps)
      .set({
        status: 'complete',
        completedAt: new Date(),
      })
      .where(eq(workshopSteps.id, workshopStep.id));

    // Generate conversation summary (synchronous for reliability)
    // If summary generation fails, step completion still succeeds
    try {
      const step = getStepById(stepId);
      const stepName = step?.name || stepId;

      await generateStepSummary(
        sessionId,
        workshopStep.id,
        stepId,
        stepName
      );
    } catch (summaryError) {
      console.error(
        `Step ${stepId} marked complete, but summary generation failed:`,
        summaryError
      );
      // Continue - step completion is what matters
    }

    return new Response(
      JSON.stringify({
        success: true,
        stepId,
        status: 'complete',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Step completion error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
