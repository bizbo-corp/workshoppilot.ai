import { db } from '@/db/client';
import { chatMessages, stepSummaries } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { google } from '@ai-sdk/google';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';

/**
 * Generate AI-powered conversation summary on step completion
 *
 * Creates a 150-word bullet-point summary from the conversation history,
 * focusing on key decisions, user inputs, and final outputs.
 *
 * This runs in the background during step completion. If AI summarization fails,
 * saves a fallback message to ensure step completion isn't blocked.
 *
 * @param sessionId - The session ID (ses_xxx)
 * @param workshopStepId - The workshop step ID (wst_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param stepName - The display name ('Challenge', 'Stakeholder Mapping', etc.)
 * @returns The generated summary text
 */
export async function generateStepSummary(
  sessionId: string,
  workshopStepId: string,
  stepId: string,
  stepName: string
): Promise<string> {
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
