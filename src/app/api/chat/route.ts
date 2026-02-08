import { streamText, convertToModelMessages } from 'ai';
import { chatModel, buildStepSystemPrompt } from '@/lib/ai/chat-config';
import { saveMessages } from '@/lib/ai/message-persistence';
import { assembleStepContext } from '@/lib/context/assemble-context';
import { getStepById } from '@/lib/workshop/step-metadata';

/**
 * Increase Vercel serverless timeout for AI responses
 */
export const maxDuration = 30;

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
    const { messages, sessionId, stepId, workshopId } = await req.json();

    // Validate required parameters
    if (!sessionId || !stepId || !workshopId) {
      return new Response(
        JSON.stringify({ error: 'sessionId, stepId, and workshopId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Assemble three-tier context for this step
    const stepContext = await assembleStepContext(workshopId, stepId, sessionId);

    // Get step display name
    const step = getStepById(stepId);
    const stepName = step?.name || stepId;

    // Build context-aware system prompt
    const systemPrompt = buildStepSystemPrompt(
      stepId,
      stepName,
      stepContext.persistentContext,
      stepContext.summaries
    );

    // Convert messages to model format
    const modelMessages = await convertToModelMessages(messages);

    // Stream Gemini response with context-aware prompt
    const result = streamText({
      model: chatModel,
      system: systemPrompt,
      messages: modelMessages,
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
