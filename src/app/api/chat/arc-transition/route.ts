import { NextRequest, NextResponse } from 'next/server';
import { getCurrentArcPhase, transitionArcPhase, type ArcPhase } from '@/lib/ai/conversation-state';

/**
 * Arc Phase Transition API
 *
 * POST endpoint that transitions arc phase based on message count heuristic.
 * This is a best-effort mechanism for MVP - the AI's behavior aligns because
 * it receives phase-specific instructions on each chat request.
 *
 * Heuristic-based transitions:
 * - Messages 0-2 (0-1 exchanges): orient (AI introduces step)
 * - Messages 3-8 (1-4 exchanges): gather (AI collects info)
 * - Messages 9-14 (4-7 exchanges): synthesize (AI drafts output)
 * - Messages 15-18 (7-9 exchanges): refine (AI helps improve)
 * - Messages 19-22 (9-11 exchanges): validate (AI checks quality)
 * - Messages 23+: complete (AI encourages completion)
 *
 * Note: This runs fire-and-forget from the client. Failures are silent.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workshopId, stepId, messageCount } = body;

    // Validate required fields
    if (!workshopId || !stepId || messageCount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: workshopId, stepId, messageCount' },
        { status: 400 }
      );
    }

    // Compute arc phase from message count using heuristic
    let computedPhase: ArcPhase;
    if (messageCount <= 2) {
      computedPhase = 'orient';
    } else if (messageCount <= 8) {
      computedPhase = 'gather';
    } else if (messageCount <= 14) {
      computedPhase = 'synthesize';
    } else if (messageCount <= 18) {
      computedPhase = 'refine';
    } else if (messageCount <= 22) {
      computedPhase = 'validate';
    } else {
      computedPhase = 'complete';
    }

    // Get current phase from database
    const currentPhase = await getCurrentArcPhase(workshopId, stepId);

    // Only transition if phase has changed (avoid unnecessary DB writes)
    if (currentPhase !== computedPhase) {
      await transitionArcPhase(workshopId, stepId, computedPhase);
      return NextResponse.json({
        arcPhase: computedPhase,
        transitioned: true,
        previousPhase: currentPhase,
      });
    }

    // No transition needed
    return NextResponse.json({
      arcPhase: currentPhase,
      transitioned: false,
    });
  } catch (error) {
    console.error('Arc phase transition error:', error);
    // Return success even on error - this is non-critical
    return NextResponse.json({
      arcPhase: 'orient',
      transitioned: false,
      error: 'Transition failed',
    });
  }
}
