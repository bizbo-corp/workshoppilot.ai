/**
 * Artifact Extraction Service
 *
 * Uses AI SDK 6's streamText with Output.object to extract structured artifacts
 * from conversation history, with retry logic and Zod validation.
 */

import { Output } from 'ai';
import type { ModelMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { getSchemaForStep } from '@/lib/schemas';
import { getStepById } from '@/lib/workshop/step-metadata';
import { streamTextWithRetry, generateTextWithRetry } from '@/lib/ai/gemini-retry';

/**
 * Custom error for extraction failures
 */
export class ExtractionError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ExtractionError';
    this.cause = cause;
  }
}

/**
 * Extract structured artifact from conversation history with retry logic
 *
 * Uses AI SDK 6's streamText + Output.object pattern to extract artifacts.
 * Retries on validation failures with error context to guide repair.
 *
 * @param stepId - Semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param conversationHistory - Array of chat messages with role and content
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns Promise resolving to extracted artifact and stepId
 * @throws ExtractionError if all retry attempts fail
 */
export async function extractStepArtifact(
  stepId: string,
  conversationHistory: Array<{ role: string; content: string }>,
  maxRetries: number = 2
): Promise<{ artifact: Record<string, unknown>; stepId: string; usage?: { inputTokens?: number; outputTokens?: number } }> {
  // Look up schema for this step
  const schema = getSchemaForStep(stepId);
  if (!schema) {
    throw new ExtractionError(`No schema found for step: ${stepId}`);
  }

  // Get step metadata for better prompts
  const step = getStepById(stepId);
  const stepName = step?.name || stepId;

  let lastError: unknown;

  // Retry loop: attempt 0 (initial) + maxRetries (2) = 3 total attempts
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Build extraction system prompt
      let extractionPrompt = `Extract structured data from this design thinking conversation for the ${stepName} step. Use the user's exact words where possible. Only include information explicitly discussed in the conversation.

You MUST return a valid JSON object matching the required schema exactly. Every required field must be present and non-null. Arrays with minimum length constraints must have at least that many items — synthesize from the conversation if needed.`;

      // Step-specific guidance for complex schemas
      if (stepId === 'validate') {
        extractionPrompt += `

For the Validate step, you must extract:
1. narrativeIntro: A 1-2 paragraph story of the journey from vague idea to validated concept
2. stepSummaries: Array of 3-10 objects with stepNumber (1-10), stepName, and keyOutputs (1-3 strings each). Include summaries for all steps discussed.
3. confidenceAssessment: score (1-10 integer), rationale (string), researchQuality ("thin"|"moderate"|"strong")
4. recommendedNextSteps: Array of 3-5 concrete next action strings

If the conversation doesn't cover all 10 steps, summarize the ones that were discussed (minimum 3).`;
      }

      // On retry attempts, include previous error context
      if (attempt > 0 && lastError) {
        const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        extractionPrompt += `\n\nPrevious extraction failed. Errors: ${errorMessage}. Fix these specific issues and try again.`;
      }

      // Convert simple { role, content } to ModelMessage format
      const modelMessages: ModelMessage[] = conversationHistory.map((msg) => {
        if (msg.role === 'user') {
          return { role: 'user' as const, content: msg.content };
        } else {
          return { role: 'assistant' as const, content: msg.content };
        }
      });

      // Call streamText with Output.object and rate limit retry
      const result = await streamTextWithRetry({
        model: google('gemini-2.0-flash'),
        system: extractionPrompt,
        messages: modelMessages,
        output: Output.object({ schema }),
        temperature: 0.1, // Low temperature for extraction accuracy
      });

      // Await the extracted object (output is PromiseLike)
      const extracted = await result.output;

      // Output.object can resolve to null if parsing fails entirely
      if (extracted === null || extracted === undefined) {
        // Consume the stream text for debugging
        const rawText = await result.text;
        console.warn(`Extraction attempt ${attempt + 1}: Output.object returned null. Raw text length: ${rawText?.length ?? 0}`);
        throw new Error(
          'AI returned unstructured output that could not be parsed into the expected schema. ' +
          'Ensure response is a valid JSON object with all required fields.'
        );
      }

      // Belt-and-suspenders: Validate with Zod
      const validated = schema.parse(extracted);

      // Await usage from the stream result
      const usage = await result.usage;

      // Success! Return the validated artifact with usage data
      return {
        artifact: validated as Record<string, unknown>,
        stepId,
        usage: usage ? {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        } : undefined,
      };
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.warn(
        `Extraction attempt ${attempt + 1}/${maxRetries + 1} failed for step ${stepId}:`,
        errorMessage
      );
      if (error instanceof Error && error.cause) {
        console.warn('  Cause:', error.cause instanceof Error ? error.cause.message : error.cause);
      }

      // Continue to next retry attempt (unless this was the last one)
    }
  }

  // All Output.object retries exhausted — try one final fallback with generateText + manual JSON parsing
  console.warn(`[extract] Output.object failed ${maxRetries + 1} times for ${stepId}. Trying generateText fallback.`);

  try {
    // Build a human-readable schema description from Zod shape
    const schemaDescription = describeZodShape(schema);

    const conversationText = conversationHistory
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const fallbackPrompt = `Extract structured data from this design thinking conversation for the "${stepName}" step.

<conversation>
${conversationText}
</conversation>

Return ONLY a valid JSON object with these fields:
${schemaDescription}

RULES:
- Return ONLY the JSON object. No markdown fences, no explanation, no preamble.
- Every required field must be present and non-null.
- Arrays with minimum length requirements must have at least that many items — synthesize from conversation context if needed.
- Use the user's exact words where possible.`;

    const result = await generateTextWithRetry({
      model: google('gemini-2.0-flash'),
      prompt: fallbackPrompt,
      temperature: 0.1,
    });

    const cleaned = result.text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const validated = schema.parse(parsed);

    console.log(`[extract] generateText fallback succeeded for ${stepId}`);

    return {
      artifact: validated as Record<string, unknown>,
      stepId,
      usage: result.usage ? {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      } : undefined,
    };
  } catch (fallbackError) {
    console.error(`[extract] generateText fallback also failed for ${stepId}:`, fallbackError);
  }

  // Everything failed
  throw new ExtractionError(
    `Failed to extract valid artifact after ${maxRetries + 1} attempts plus fallback`,
    lastError
  );
}

/**
 * Generate a human-readable description of a Zod object schema.
 * Uses .description on each field (set via .describe() in schema definitions).
 */
function describeZodShape(schema: import('zod').ZodTypeAny): string {
  const lines: string[] = [];

  if ('shape' in schema && typeof schema.shape === 'object') {
    const shape = schema.shape as Record<string, import('zod').ZodTypeAny>;
    for (const [key, field] of Object.entries(shape)) {
      const desc = field.description || 'value';
      const isOptional = field.isOptional?.() ?? false;
      const optTag = isOptional ? ' (optional)' : ' (required)';
      lines.push(`- ${key}${optTag}: ${desc}`);
    }
  }

  return lines.join('\n');
}
