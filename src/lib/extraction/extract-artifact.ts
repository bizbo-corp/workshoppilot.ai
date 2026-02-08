/**
 * Artifact Extraction Service
 *
 * Uses AI SDK 6's streamText with Output.object to extract structured artifacts
 * from conversation history, with retry logic and Zod validation.
 */

import { streamText, Output } from 'ai';
import type { ModelMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { getSchemaForStep } from '@/lib/schemas';
import { getStepById } from '@/lib/workshop/step-metadata';

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
): Promise<{ artifact: Record<string, unknown>; stepId: string }> {
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
      let extractionPrompt = `Extract structured data from this design thinking conversation for the ${stepName} step. Use the user's exact words where possible. Only include information explicitly discussed in the conversation.`;

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

      // Call streamText with Output.object
      const result = streamText({
        model: google('gemini-2.0-flash'),
        system: extractionPrompt,
        messages: modelMessages,
        output: Output.object({ schema }),
        temperature: 0.1, // Low temperature for extraction accuracy
      });

      // Await the extracted object (output is PromiseLike)
      const extracted = await result.output;

      // Belt-and-suspenders: Validate with Zod
      const validated = schema.parse(extracted);

      // Success! Return the validated artifact
      return {
        artifact: validated as Record<string, unknown>,
        stepId,
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

  // All retries exhausted
  throw new ExtractionError(
    `Failed to extract valid artifact after ${maxRetries + 1} attempts`,
    lastError
  );
}
