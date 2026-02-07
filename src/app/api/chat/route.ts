import { streamText, convertToModelMessages } from 'ai';
import { chatModel, SYSTEM_PROMPT } from '@/lib/ai/chat-config';
import { saveMessages } from '@/lib/ai/message-persistence';

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
 */
export async function POST(req: Request) {
  try {
    const { messages, sessionId, stepId } = await req.json();

    // Validate required parameters
    if (!sessionId || !stepId) {
      return new Response(
        JSON.stringify({ error: 'sessionId and stepId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert messages to model format
    const modelMessages = await convertToModelMessages(messages);

    // Stream Gemini response
    const result = streamText({
      model: chatModel,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
    });

    // Consume stream server-side to ensure onFinish fires even if client disconnects
    result.consumeStream();

    // Return streaming response with persistence on finish
    return result.toUIMessageStreamResponse({
      sendReasoning: false,
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
