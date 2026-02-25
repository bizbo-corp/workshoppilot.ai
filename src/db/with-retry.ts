/**
 * Retry wrapper for Neon DB operations.
 * Handles transient connection failures (cold starts, network blips)
 * by retrying the operation with exponential backoff.
 *
 * Neon free-tier cold starts can take 5-10s, so delays are generous:
 * Attempt 1: immediate
 * Attempt 2: after 1s
 * Attempt 3: after 3s
 * Attempt 4: after 6s
 * Total window: ~10s — enough for a full cold start wake-up.
 */
const RETRY_DELAYS_MS = [1000, 3000, 6000];

export async function dbWithRetry<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const maxAttempts = RETRY_DELAYS_MS.length + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        // Silent retry — only log on final failure
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      }
    }
  }

  // All attempts exhausted — log and throw
  console.error(`DB operation failed after ${maxAttempts} attempts:`, lastError);
  throw lastError;
}
