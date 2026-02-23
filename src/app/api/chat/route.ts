import { convertToModelMessages, smoothStream } from 'ai';
import { chatModel, buildStepSystemPrompt } from '@/lib/ai/chat-config';
import { saveMessages } from '@/lib/ai/message-persistence';
import { assembleStepContext } from '@/lib/context/assemble-context';
import { getStepById, STEPS } from '@/lib/workshop/step-metadata';
import { db } from '@/db/client';
import { workshops } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentArcPhase } from '@/lib/ai/conversation-state';
import { streamTextWithRetry, isGeminiRateLimitError } from '@/lib/ai/gemini-retry';
import { loadCanvasState } from '@/actions/canvas-actions';

/**
 * Increase Vercel serverless timeout for AI responses.
 * Complex stakeholder mapping responses with canvas items can take 40-50s.
 */
export const maxDuration = 60;

/**
 * POST /api/chat
 * Streams Gemini chat responses and persists messages to database
 *
 * Request body:
 * - messages: UIMessage[] - The conversation history
 * - sessionId: string - The session ID (ses_xxx)
 * - stepId: string - The semantic step ID ('empathize', 'define', etc.)
 * - workshopId: string - The workshop ID (wks_xxx)
 */
export async function POST(req: Request) {
  try {
    const { messages, sessionId, stepId, workshopId, subStep, selectedStickyNoteIds } = await req.json();

    // Validate required parameters
    if (!sessionId || !stepId || !workshopId) {
      return new Response(
        JSON.stringify({ error: 'sessionId, stepId, and workshopId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Assemble three-tier context for this step
    const stepContext = await assembleStepContext(workshopId, stepId);

    // Inject selected canvas items into context if any are selected
    if (Array.isArray(selectedStickyNoteIds) && selectedStickyNoteIds.length > 0) {
      const canvasState = await loadCanvasState(workshopId, stepId);
      if (canvasState) {
        const selectedTexts = canvasState.stickyNotes
          .filter(p => selectedStickyNoteIds.includes(p.id))
          .map(p => `- "${p.text}"`)
          .filter(t => t !== '- ""');

        if (selectedTexts.length > 0) {
          const selectionBlock = `\n\nCURRENTLY SELECTED ON CANVAS:\n${selectedTexts.join('\n')}`;
          stepContext.canvasContext = (stepContext.canvasContext || '') + selectionBlock;
        }
      }
    }

    // Get current arc phase from database
    const arcPhase = await getCurrentArcPhase(workshopId, stepId);

    // Get step metadata (display name and description)
    const step = getStepById(stepId);
    const stepName = step?.name || stepId;
    const stepDescription = step?.description ?? '';

    // Fetch workshop title for personalizing the AI introduction
    const workshop = await db.query.workshops.findFirst({
      where: eq(workshops.id, workshopId),
      columns: { title: true },
    });
    const workshopTitle = workshop?.title || null;

    // Sub-step prompt override for Step 8 Ideation
    let instructionsOverride: string | undefined;
    if (stepId === 'ideation' && subStep) {
      const { getIdeationSubStepInstructions } = await import('@/lib/ai/prompts/step-prompts');
      instructionsOverride = getIdeationSubStepInstructions(subStep);
    }

    // Build context-aware system prompt with arc phase and step instructions
    const systemPrompt = buildStepSystemPrompt(
      stepId,
      stepName,
      arcPhase,
      stepDescription,
      stepContext.persistentContext,
      stepContext.summaries,
      stepContext.canvasContext,
      instructionsOverride,
      workshopTitle,
      stepContext.existingItemNames,
    );

    // Filter out messages with empty content before conversion.
    // Interrupted streams can leave assistant messages with empty parts in history,
    // which Gemini rejects with 400 ("must include at least one parts field").
    const validMessages = messages.filter((msg: { parts?: Array<{ type: string; text?: string }> }) => {
      const textParts = msg.parts?.filter((p: { type: string; text?: string }) => p.type === 'text' && p.text?.trim()) || [];
      return textParts.length > 0;
    });

    // Convert messages to model format
    const modelMessages = await convertToModelMessages(validMessages);

    // Stream Gemini response with context-aware prompt and rate limit retry
    const result = await streamTextWithRetry({
      model: chatModel,
      system: systemPrompt,
      messages: modelMessages,
      experimental_transform: smoothStream({ chunking: 'word' }),
    });

    // Consume stream server-side to ensure onFinish fires even if client disconnects
    result.consumeStream();

    // Return streaming response with persistence on finish
    // originalMessages enables "persistence mode" — onFinish receives the
    // full conversation (original + new assistant response), not just the new message
    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      originalMessages: messages,
      onFinish: async ({ messages: responseMessages }) => {
        await saveMessages(sessionId, stepId, responseMessages);
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle rate limit errors specifically after all retries exhausted
    if (isGeminiRateLimitError(error)) {
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: 'The AI is currently experiencing high demand. Please try again in a few moments.',
          retryAfter: 30,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '30',
          },
        }
      );
    }

    // Generic error for non-rate-limit failures
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
