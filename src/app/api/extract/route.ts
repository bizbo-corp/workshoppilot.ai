/**
 * Extraction API Endpoint
 *
 * POST /api/extract
 * Extracts structured artifact from conversation history and saves to database.
 */

import { extractStepArtifact, ExtractionError } from '@/lib/extraction';
import { assembleStepContext } from '@/lib/context/assemble-context';
import { saveStepArtifact } from '@/lib/context/save-artifact';
import { db } from '@/db/client';
import { workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Increase timeout for extraction (can take longer than chat)
 */
export const maxDuration = 60;

/**
 * POST /api/extract
 * Extract structured artifact from conversation and save to database
 *
 * Request body:
 * - workshopId: string - The workshop ID (wks_xxx)
 * - stepId: string - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * - sessionId: string - The session ID (ses_xxx)
 *
 * Response:
 * - 200: { artifact: Record<string, unknown>, stepId: string }
 * - 400: Missing required fields or not enough conversation
 * - 404: Workshop step not found
 * - 422: Extraction failed (validation error)
 * - 500: Internal server error
 */
export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const { workshopId, stepId, sessionId } = body;

    if (!workshopId || !stepId || !sessionId) {
      return new Response(
        JSON.stringify({
          error: 'workshopId, stepId, and sessionId are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Assemble conversation history using step context
    const stepContext = await assembleStepContext(workshopId, stepId, sessionId);
    const messages = stepContext.messages;

    // Validate we have enough conversation to extract from
    if (!messages || messages.length < 2) {
      return new Response(
        JSON.stringify({
          error: 'Not enough conversation to extract from',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract artifact using AI
    const result = await extractStepArtifact(stepId, messages);

    // Look up workshopStepId from database
    const workshopStepRows = await db
      .select({ id: workshopSteps.id })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      )
      .limit(1);

    if (workshopStepRows.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Workshop step not found',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const workshopStepId = workshopStepRows[0].id;

    // Save artifact to database with validation
    await saveStepArtifact(workshopStepId, stepId, result.artifact, '1.0', true);

    // Return success with extracted artifact
    return new Response(
      JSON.stringify({
        artifact: result.artifact,
        stepId: result.stepId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Handle extraction-specific errors
    if (error instanceof ExtractionError) {
      return new Response(
        JSON.stringify({
          error: 'extraction_failed',
          message: error.message,
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle all other errors
    console.error('Extract API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
