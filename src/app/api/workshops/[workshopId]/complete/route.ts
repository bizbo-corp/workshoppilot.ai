import { completeWorkshop } from '@/actions/workshop-actions';

/**
 * POST /api/workshops/[workshopId]/complete
 * Marks a workshop as completed by setting workshops.status = 'completed'.
 * Requires all 10 steps to be complete.
 * Idempotent: completing an already-completed workshop returns 200.
 *
 * Request body:
 * - sessionId: string - The session ID for path revalidation
 *
 * Response:
 * - 200: { success: true, status: 'completed' }
 * - 400: Missing sessionId or not all steps complete
 * - 401: Not authenticated or not workshop owner
 * - 500: Unexpected server error
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  try {
    const { workshopId } = await params;
    const body = await req.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await completeWorkshop(workshopId, sessionId);

    return new Response(
      JSON.stringify({ success: true, status: 'completed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (
      message === 'Authentication required' ||
      message === 'Workshop not found or access denied'
    ) {
      return new Response(
        JSON.stringify({ error: message }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (message === 'All steps must be completed before finishing the workshop') {
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Workshop completion error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
