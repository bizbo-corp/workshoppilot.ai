import { streamText, generateText } from 'ai';
import { backOff } from 'exponential-backoff';

/**
 * Checks if an error is a Gemini rate limit error (429/RESOURCE_EXHAUSTED)
 */
export function isGeminiRateLimitError(error: unknown): boolean {
  if (!error) return false;

  const errorStr = error instanceof Error ? error.message : String(error);
  const errorLower = errorStr.toLowerCase();

  // Check for HTTP 429 status
  if (errorStr.includes('429')) return true;

  // Check for RESOURCE_EXHAUSTED code
  if (errorStr.includes('RESOURCE_EXHAUSTED')) return true;

  // Check for rate limit / quota exceeded messages
  if (errorLower.includes('rate limit') || errorLower.includes('quota exceeded')) {
    return true;
  }

  return false;
}

/**
 * Backoff configuration for Gemini API retries
 */
const BACKOFF_CONFIG = {
  startingDelay: 1000, // 1 second
  timeMultiple: 2, // Exponential (2x each retry)
  numOfAttempts: 5, // Up to 5 attempts
  maxDelay: 15000, // Cap at 15 seconds
  jitter: 'full' as const, // Full jitter to avoid thundering herd
};

/**
 * Wraps streamText with exponential backoff retry for rate limit errors
 */
export async function streamTextWithRetry(
  config: Parameters<typeof streamText>[0]
): Promise<ReturnType<typeof streamText>> {
  return backOff(
    async () => {
      try {
        return await streamText(config);
      } catch (error) {
        if (isGeminiRateLimitError(error)) {
          // Rethrow rate limit errors for retry
          throw error;
        } else {
          // Non-rate-limit errors should not be retried — fail fast
          const sentinel = new Error('NON_RETRYABLE');
          (sentinel as any).cause = error;
          throw sentinel;
        }
      }
    },
    {
      ...BACKOFF_CONFIG,
      retry: (error, attemptNumber) => {
        // Check for sentinel error (non-retryable)
        if (error instanceof Error && error.message === 'NON_RETRYABLE') {
          console.error('Non-rate-limit error encountered, failing immediately:', error.cause);
          return false; // Do not retry
        }

        // Log retry attempts for rate limit errors
        if (attemptNumber > 1) {
          console.warn(
            `Gemini rate limit hit, retry attempt ${attemptNumber}/${BACKOFF_CONFIG.numOfAttempts}`,
            error instanceof Error ? error.message : String(error)
          );
        }

        return true; // Retry rate limit errors
      },
    }
  );
}

/**
 * Wraps generateText with exponential backoff retry for rate limit errors
 */
export async function generateTextWithRetry(
  config: Parameters<typeof generateText>[0]
): Promise<ReturnType<typeof generateText>> {
  return backOff(
    async () => {
      try {
        return await generateText(config);
      } catch (error) {
        if (isGeminiRateLimitError(error)) {
          // Rethrow rate limit errors for retry
          throw error;
        } else {
          // Non-rate-limit errors should not be retried — fail fast
          const sentinel = new Error('NON_RETRYABLE');
          (sentinel as any).cause = error;
          throw sentinel;
        }
      }
    },
    {
      ...BACKOFF_CONFIG,
      retry: (error, attemptNumber) => {
        // Check for sentinel error (non-retryable)
        if (error instanceof Error && error.message === 'NON_RETRYABLE') {
          console.error('Non-rate-limit error encountered, failing immediately:', error.cause);
          return false; // Do not retry
        }

        // Log retry attempts for rate limit errors
        if (attemptNumber > 1) {
          console.warn(
            `Gemini rate limit hit, retry attempt ${attemptNumber}/${BACKOFF_CONFIG.numOfAttempts}`,
            error instanceof Error ? error.message : String(error)
          );
        }

        return true; // Retry rate limit errors
      },
    }
  );
}
