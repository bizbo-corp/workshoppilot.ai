import { google } from '@ai-sdk/google';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { db } from '@/db/client';
import { workshops, workshopSteps, stepArtifacts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { CONCEPT_GENERATION_PROMPT } from '@/lib/ai/prompts/step-prompts';

/**
 * Increase Vercel serverless timeout for AI responses
 */
export const maxDuration = 30;

/**
 * POST /api/ai/generate-concept
 * Generates structured concept card data from selected Crazy 8s sketch + workshop context
 *
 * Request body:
 * - workshopId: string - The workshop ID (wks_xxx)
 * - slotId: string - Crazy 8s slot ID (e.g., 'slot-1')
 * - crazy8sTitle: string - Title from the Crazy 8s slot
 */
export async function POST(req: Request) {
  try {
    const { workshopId, slotId, crazy8sTitle } = await req.json();

    if (!workshopId || !slotId || !crazy8sTitle) {
      return new Response(
        JSON.stringify({
          error: 'workshopId, slotId, and crazy8sTitle are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify workshop exists
    const workshop = await db
      .select({
        id: workshops.id,
      })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshop.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Workshop not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load workshop context from prior step artifacts

    // 1. Load HMW statement from Step 3 (define)
    let hmwStatement = '';
    const defineStep = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, 'define')
        )
      )
      .limit(1);

    if (defineStep.length > 0) {
      const defineArtifacts = await db
        .select({
          artifact: stepArtifacts.artifact,
        })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, defineStep[0].id))
        .limit(1);

      if (defineArtifacts.length > 0) {
        const artifact = defineArtifacts[0].artifact as Record<string, unknown>;
        hmwStatement = (artifact?.hmwStatement as string) || '';
      }
    }

    // 2. Load persona from Step 4 (sense-making)
    let personaName = '';
    let personaGoals = '';
    let personaPains = '';
    const senseMakingStep = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, 'sense-making')
        )
      )
      .limit(1);

    if (senseMakingStep.length > 0) {
      const senseMakingArtifacts = await db
        .select({
          artifact: stepArtifacts.artifact,
        })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, senseMakingStep[0].id))
        .limit(1);

      if (senseMakingArtifacts.length > 0) {
        const artifact = senseMakingArtifacts[0].artifact as Record<
          string,
          unknown
        >;
        const persona = artifact?.persona as Record<string, unknown> | undefined;
        personaName = (persona?.name as string) || '';

        // Extract goals array
        const goals = persona?.goals as string[] | undefined;
        if (goals && Array.isArray(goals)) {
          personaGoals = goals.join('; ');
        }

        // Extract pains array
        const pains = persona?.pains as string[] | undefined;
        if (pains && Array.isArray(pains)) {
          personaPains = pains.join('; ');
        }
      }
    }

    // 3. Load research insights from Step 1 (challenge)
    let keyInsights = '';
    const challengeStep = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, 'challenge')
        )
      )
      .limit(1);

    if (challengeStep.length > 0) {
      const challengeArtifacts = await db
        .select({
          artifact: stepArtifacts.artifact,
        })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, challengeStep[0].id))
        .limit(1);

      if (challengeArtifacts.length > 0) {
        const artifact = challengeArtifacts[0].artifact as Record<
          string,
          unknown
        >;
        const insights = artifact?.insights as string[] | undefined;
        if (insights && Array.isArray(insights)) {
          keyInsights = insights.join('; ');
        }
      }
    }

    // 4. Load stakeholder challenges from Step 2 (stakeholder-mapping)
    let stakeholderChallenges = '';
    const stakeholderStep = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, 'stakeholder-mapping')
        )
      )
      .limit(1);

    if (stakeholderStep.length > 0) {
      const stakeholderArtifacts = await db
        .select({
          artifact: stepArtifacts.artifact,
        })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, stakeholderStep[0].id))
        .limit(1);

      if (stakeholderArtifacts.length > 0) {
        const artifact = stakeholderArtifacts[0].artifact as Record<
          string,
          unknown
        >;
        const stakeholders = artifact?.stakeholders as Array<Record<string, unknown>> | undefined;
        if (stakeholders && Array.isArray(stakeholders)) {
          const challenges = stakeholders
            .map((s) => s?.notes as string)
            .filter((n) => n && n.length > 0);
          if (challenges.length > 0) {
            stakeholderChallenges = challenges.join('; ');
          }
        }
      }
    }

    // Build prompt by replacing placeholder tokens
    const prompt = CONCEPT_GENERATION_PROMPT
      .replace(/{personaName}/g, personaName || 'Unknown')
      .replace(/{personaGoals}/g, personaGoals || 'Not specified')
      .replace(/{personaPains}/g, personaPains || 'Not specified')
      .replace(/{hmwStatement}/g, hmwStatement || 'Not specified')
      .replace(/{crazy8sTitle}/g, crazy8sTitle)
      .replace(/{slotId}/g, slotId)
      .replace(/{keyInsights}/g, keyInsights || 'No research insights available')
      .replace(
        /{stakeholderChallenges}/g,
        stakeholderChallenges || 'No stakeholder data available'
      );

    // Call Gemini to generate concept
    try {
      const result = await generateTextWithRetry({
        model: google('gemini-2.0-flash'),
        temperature: 0.5, // Lower than sketch prompts for more consistent structured output
        prompt,
      });

      // Parse JSON response
      try {
        // Clean response (remove markdown code blocks if present)
        let cleanedText = result.text.trim();
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText
            .replace(/```json?\n?/g, '')
            .replace(/```\n?/g, '');
        }

        const concept = JSON.parse(cleanedText);

        // Validate required fields exist
        if (
          !concept.conceptName ||
          !concept.elevatorPitch ||
          !concept.swot ||
          !concept.feasibility
        ) {
          throw new Error('Missing required concept fields');
        }

        return new Response(JSON.stringify({ concept }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        return new Response(
          JSON.stringify({ error: 'Failed to parse AI response' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (aiError) {
      console.error('AI generation failed:', aiError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate concept' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Generate concept endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
