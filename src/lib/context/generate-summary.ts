import { db } from '@/db/client';
import { chatMessages, stepArtifacts, stepSummaries, workshops, workshopSteps } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { google } from '@ai-sdk/google';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';

/**
 * Generate AI-powered conversation summary on step completion
 *
 * Creates a 150-word bullet-point summary from the conversation history,
 * focusing on key decisions, user inputs, and final outputs.
 *
 * This runs in the background during step completion. If AI summarization fails,
 * saves a fallback message to ensure step completion isn't blocked.
 *
 * @param workshopId - The workshop ID (ws_xxx)
 * @param sessionId - The session ID (ses_xxx)
 * @param workshopStepId - The workshop step ID (wst_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param stepName - The display name ('Challenge', 'Stakeholder Mapping', etc.)
 * @returns The generated summary text
 */
export async function generateStepSummary(
  workshopId: string,
  sessionId: string,
  workshopStepId: string,
  stepId: string,
  stepName: string
): Promise<string> {
  // User Research (Step 3): derive the summary from the CANVAS, not chat.
  // Uploaded/pasted research and AI-interview insights all live on the board as
  // persona cards + clustered insights. The chat transcript can carry stale
  // AI-interview persona names (e.g. from an abandoned persona-select), which is
  // exactly what made Step 4 fabricate against the wrong people. A deterministic
  // canvas dump keeps downstream steps grounded in the real research — synthesis
  // is Step 4's job, not the summary's.
  if (stepId === 'user-research') {
    try {
      const canvasSummary = await buildUserResearchCanvasSummary(workshopId, workshopStepId);
      if (canvasSummary) return canvasSummary;
      // Board empty / read failed → fall through to the chat-based summary below.
    } catch (canvasErr) {
      console.error('[generateStepSummary] user-research canvas summary failed, falling back to chat:', canvasErr);
    }
  }

  try {
    // Load all messages for this session+step
    const messageRows = await db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          eq(chatMessages.stepId, stepId)
        )
      )
      .orderBy(asc(chatMessages.createdAt));

    // Format as conversation text
    const formattedConversation = messageRows
      .map((row) => `${row.role}: ${row.content}`)
      .join('\n');

    // Generate summary via Gemini with rate limit retry
    const result = await generateTextWithRetry({
      model: google('gemini-2.0-flash'),
      temperature: 0.1, // Low for factual accuracy
      prompt: `INSTRUCTIONS:
Summarize the following conversation from Step ${stepName} in 3-4 bullet points.
Focus on: (1) key decisions made, (2) user's specific inputs, (3) final outputs produced.
Use clear, concise language. Do NOT include conversational pleasantries.

CONSTRAINTS:
- Maximum 150 words
- Bullet point format (use - prefix)
- Factual only, no interpretation
- Reference specific values (names, numbers, quotes the user provided)

OUTPUT FORMAT:
- Bullet point 1
- Bullet point 2
- Bullet point 3

CONVERSATION:
${formattedConversation}`,
    });

    const summary = result.text.trim();
    const tokenCount = result.usage?.totalTokens || null;

    // Record usage (fire-and-forget)
    recordUsageEvent({
      workshopId,
      stepId,
      operation: 'generate-summary',
      model: 'gemini-2.0-flash',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    // Save summary to database
    await db.insert(stepSummaries).values({
      workshopStepId,
      stepId,
      summary,
      tokenCount,
    });

    return summary;
  } catch (error) {
    // Fallback: Save error message as summary (don't block step completion)
    const fallbackSummary = `Step ${stepName} completed. Summary generation failed — conversation history preserved in messages.`;

    console.error(
      `Failed to generate summary for step ${stepId} (workshop step ${workshopStepId}):`,
      error
    );

    // Attempt to save fallback summary
    try {
      await db.insert(stepSummaries).values({
        workshopStepId,
        stepId,
        summary: fallbackSummary,
        tokenCount: null,
      });
    } catch (dbError) {
      console.error('Failed to save fallback summary:', dbError);
    }

    return fallbackSummary;
  }
}

/**
 * Build a deterministic Step 3 (User Research) summary from the canvas:
 * persona cards + their clustered insights, quoted verbatim. Returns the summary
 * string (and persists it), or null if the board has no research yet.
 *
 * Uses `loadCanvasState` via a lazy import so this module's top-level import graph
 * stays free of `server-only` transitive deps (so `generateChallengeSummaryFromArtifact`
 * can still run under tsx in scripts).
 */
async function buildUserResearchCanvasSummary(
  workshopId: string,
  workshopStepId: string
): Promise<string | null> {
  const { loadCanvasState } = await import('@/actions/canvas-actions');
  const canvas = await loadCanvasState(workshopId, 'user-research');

  const notes = (canvas?.stickyNotes || []).filter(
    (n) => (!n.type || n.type === 'stickyNote') && !n.isPreview
  );
  if (notes.length === 0) return null;

  // Persona cards have no cluster ("Name — description"); insights carry cluster = persona name.
  const personaCards = notes.filter((n) => !n.cluster);
  const insightsByPersona = new Map<string, string[]>();
  for (const n of notes) {
    if (!n.cluster) continue;
    if (!insightsByPersona.has(n.cluster)) insightsByPersona.set(n.cluster, []);
    insightsByPersona.get(n.cluster)!.push(n.text.trim());
  }

  // Need at least one insight to be a useful research summary.
  if (insightsByPersona.size === 0) return null;

  const lines: string[] = [];
  if (personaCards.length > 0) {
    lines.push(
      `Personas researched (${personaCards.length}): ${personaCards.map((p) => p.text.trim()).join(' | ')}`
    );
  }
  for (const [persona, insights] of insightsByPersona) {
    lines.push(`\n${persona} — ${insights.length} insight${insights.length > 1 ? 's' : ''}:`);
    for (const t of insights) lines.push(`- ${t}`);
  }
  const summary = lines.join('\n');

  // Upsert so re-completing the step refreshes the summary to match the latest board.
  await db
    .insert(stepSummaries)
    .values({ workshopStepId, stepId: 'user-research', summary, tokenCount: null })
    .onConflictDoUpdate({
      target: stepSummaries.workshopStepId,
      set: { summary, tokenCount: null },
    });

  return summary;
}

/**
 * Synthesize a deterministic Step 1 (Challenge) summary from the structured
 * challenge artifact (`step_artifacts._canvas.stickyNotes` + `workshops.originalIdea`)
 * — NOT from chat history.
 *
 * Used by `advanceFromStepOne` on the Set-up Workshop / Start Workshop path, where the
 * user may complete Step 1 via the form-only wizard without ever chatting. In that case
 * `chat_messages` is empty and `generateStepSummary` would produce a useless summary that
 * fails the downstream stakeholder-mapping ABSENCE PROTOCOL check (which requires a
 * recognizable "How might we…?" statement).
 *
 * Writes to `step_summaries` with `onConflictDoNothing` so callers can safely invoke this
 * from idempotent helpers — if a real chat-derived summary already landed, we don't
 * clobber it.
 */
export async function generateChallengeSummaryFromArtifact(
  workshopId: string,
  workshopStepId: string
): Promise<string> {
  // Inline the challenge-artifact read (instead of calling getChallengeArtifact from
  // src/lib/workshop/challenge-artifact.ts) so this module has no 'server-only' transitive
  // import — that lets scripts/backfill-missing-challenge-summaries.ts run under tsx.
  const [workshopRow] = await db
    .select({ originalIdea: workshops.originalIdea })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);

  const [step1Row] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, 'challenge')))
    .limit(1);

  let artifactHmw: string | null = null;
  let artifactIdea: string | null = null;
  let artifactProblem: string | null = null;
  let artifactAudience: string | null = null;

  if (step1Row) {
    const [artifactRow] = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, step1Row.id))
      .limit(1);

    const artifact = (artifactRow?.artifact ?? {}) as Record<string, unknown>;
    const canvas = (artifact._canvas ?? {}) as Record<string, unknown>;
    const stickyNotes = Array.isArray(canvas.stickyNotes)
      ? (canvas.stickyNotes as Array<{ templateKey?: string; text?: string }>)
      : [];

    const findText = (key: string): string | null => {
      const note = stickyNotes.find((n) => n.templateKey === key && (n.text ?? '').trim());
      return note?.text?.trim() ?? null;
    };

    artifactIdea = findText('idea');
    artifactProblem = findText('problem');
    artifactAudience = findText('audience');
    artifactHmw = findText('challenge-statement');
    if (!artifactHmw && typeof artifact.hmwStatement === 'string') {
      artifactHmw = (artifact.hmwStatement as string).trim() || null;
    }
  }

  const hmw = artifactHmw?.trim();
  const audience = artifactAudience?.trim();
  const problem = artifactProblem?.trim();
  const originalIdea = workshopRow?.originalIdea?.trim() || null;
  const idea = artifactIdea?.trim();

  // Compose a "How might we…?" line. If the facilitator wrote an explicit HMW sticky,
  // use it verbatim. Otherwise synthesize one from audience + problem so the downstream
  // ABSENCE PROTOCOL check (which looks for "How might we") passes.
  const hmwLine = hmw
    ? (/^how might we/i.test(hmw) ? hmw : `How might we ${hmw}`)
    : audience && problem
      ? `How might we address ${problem} for ${audience}?`
      : audience
        ? `How might we serve ${audience}?`
        : problem
          ? `How might we address ${problem}?`
          : 'How might we deliver on the original idea?';

  const lines = [
    `- Challenge: ${hmwLine}`,
    `- Original idea: ${originalIdea || idea || '—'}`,
    `- Problem framing: ${problem || '—'}`,
    `- Target audience: ${audience || '—'}`,
  ];
  const summary = lines.join('\n');

  await db
    .insert(stepSummaries)
    .values({
      workshopStepId,
      stepId: 'challenge',
      summary,
      tokenCount: null,
    })
    .onConflictDoNothing({ target: stepSummaries.workshopStepId });

  return summary;
}
