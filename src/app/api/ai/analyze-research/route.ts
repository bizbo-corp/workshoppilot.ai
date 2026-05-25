/**
 * AI Research Analysis API Endpoint
 *
 * POST /api/ai/analyze-research
 * Takes a user-uploaded research transcript (Step 3, User Research) and
 * synthesises it into personas + headline insights, grounded in the workshop's
 * Step 1 challenge and Step 2 stakeholder map.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';
import { assembleStepContext } from '@/lib/context/assemble-context';
import {
  researchAnalysisSchema,
  buildResearchAnalysisPrompt,
  type ContributionType,
} from '@/lib/ai/prompts/research-analysis-prompts';
import { db } from '@/db/client';
import { workshops, workshopSessions, sessionParticipants } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export const maxDuration = 60;

const MAX_TRANSCRIPT_CHARS = 100_000;

type RequestBody = {
  workshopId: string;
  transcript: string;
  existingPersonaNames?: string[];
  contributionType?: ContributionType;
};

/** True if the Clerk user owns the workshop or is a participant in one of its sessions. */
async function isWorkshopMember(workshopId: string, userId: string): Promise<boolean> {
  const [ws] = await db
    .select({ owner: workshops.clerkUserId })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);
  if (!ws) return false;
  if (ws.owner === userId) return true;
  const member = await db
    .select({ id: sessionParticipants.id })
    .from(sessionParticipants)
    .innerJoin(workshopSessions, eq(sessionParticipants.sessionId, workshopSessions.id))
    .where(
      and(
        eq(workshopSessions.workshopId, workshopId),
        eq(sessionParticipants.clerkUserId, userId),
      ),
    )
    .limit(1);
  return member.length > 0;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rl = checkRateLimit(getRateLimitId(req, userId), 'text-gen');
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const body: RequestBody = await req.json();
    const { workshopId, existingPersonaNames = [], contributionType = 'per-interviewee' } = body;
    const transcript = (body.transcript || '').slice(0, MAX_TRANSCRIPT_CHARS);

    if (!workshopId || !transcript.trim()) {
      return new Response(
        JSON.stringify({ error: 'workshopId and transcript are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Participants can call this route too — verify the caller belongs to the workshop.
    if (!(await isWorkshopMember(workshopId, userId))) {
      return new Response(JSON.stringify({ error: 'Not a member of this workshop' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load context: workshop-level + Step 2/1 summaries the research step depends on.
    const [workshopContext, stepContext] = await Promise.all([
      loadWorkshopContext(workshopId),
      assembleStepContext(workshopId, 'user-research'),
    ]);

    const preambleParts: string[] = [];
    if (workshopContext.originalIdea) preambleParts.push(`Original Idea: ${workshopContext.originalIdea}`);
    if (workshopContext.problemStatement) preambleParts.push(`Problem Statement: ${workshopContext.problemStatement}`);
    if (stepContext.summaries) preambleParts.push(`\nPrior Step Summaries:\n${stepContext.summaries}`);
    const contextPreamble = preambleParts.join('\n');

    const prompt = buildResearchAnalysisPrompt({
      contextPreamble,
      transcript,
      existingPersonaNames,
      contributionType,
    });

    const result = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: researchAnalysisSchema,
      prompt,
      temperature: 0.2,
    });

    recordUsageEvent({
      workshopId,
      stepId: 'user-research',
      operation: 'analyze-research',
      model: 'gemini-2.0-flash',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    return new Response(JSON.stringify({ data: result.object }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('analyze-research endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
