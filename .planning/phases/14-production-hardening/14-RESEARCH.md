# Phase 14: Production Hardening - Research

**Researched:** 2026-02-10
**Domain:** Production reliability for serverless AI applications (Gemini rate limiting, Neon cold starts, streaming interruptions)
**Confidence:** HIGH

## Summary

Phase 14 addresses three production reliability problems that only surface under real-world load: Gemini rate limit cascade failures, Neon cold start death spirals, and streaming connection interruptions. These are "looks done but isn't" issues — the MVP 0.5 codebase works perfectly in development with 1-2 test users but degrades rapidly in production with concurrent users, network variability, and idle periods.

**Key findings:**
- Gemini rate limits are multi-dimensional (RPM/TPM/RPD/IPM) — exceeding ANY dimension triggers 429 errors
- Free tier was slashed 50-92% in December 2025 without notice — 15 RPM is exhausted in minutes with concurrent users
- Neon cold starts (500ms-5s) occur after 5 minutes of inactivity — compounding with multiple tabs/users
- AI SDK streaming has known issues with tab switching (issue #11865) and dynamic Chat instance replacement (fixed in v6.0.3)
- Exponential backoff with jitter is the gold standard for retry logic — prevents synchronized retry storms
- Vercel cron jobs with health-check warming can keep Neon compute active during user hours

**Primary recommendation:** Implement exponential backoff with user feedback FIRST (PROD-01), then health-check warming (PROD-02), then streaming reliability improvements (PROD-03). Rate limit handling is the highest priority because it affects ALL users simultaneously when quota is exhausted.

---

## Standard Stack

### Core Libraries (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai (Vercel AI SDK) | 6.0.77 | AI orchestration | Already handles streaming, has built-in error handling hooks |
| @ai-sdk/google | ^3.0.22 | Gemini provider | Direct Gemini integration, supports rate limit error detection |
| @neondatabase/serverless | Latest | Neon driver | Edge-compatible serverless driver, required for Vercel |

### New Libraries Needed

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| exponential-backoff | ^4.0.0 | Retry logic | Industry standard, TypeScript support, configurable jitter, 150+ npm dependents |

### Alternative Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| exponential-backoff npm | Hand-rolled retry logic | Hand-rolling misses edge cases (abort during retry, cleanup), exponential-backoff is battle-tested |
| exponential-backoff | retry npm package | retry lacks jitter support (critical for distributed retry storms), exponential-backoff has built-in jitter |
| exponential-backoff | @lifeomic/attempt | attempt is more feature-rich but heavier (18KB vs 5KB), exponential-backoff is sufficient for rate limiting |

**Installation:**
```bash
npm install exponential-backoff
```

---

## Architecture Patterns

### Pattern 1: Exponential Backoff with Jitter for Gemini 429 Errors

**What:** Retry Gemini API requests with exponentially increasing delays plus random jitter to prevent synchronized retry storms.

**When to use:** Every Gemini API call that can fail with 429 rate limit errors (chat streaming, extraction, summarization).

**Key insight:** Jitter prevents "thundering herd" — multiple clients hitting rate limits simultaneously and retrying in sync.

**Example:**
```typescript
// src/lib/ai/rate-limit-handler.ts (NEW FILE)
import { backOff } from 'exponential-backoff';
import { streamText } from 'ai';
import { chatModel } from '@/lib/ai/chat-config';

interface RateLimitError {
  status: 429;
  message: string;
}

function isRateLimitError(error: unknown): error is RateLimitError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 429
  );
}

/**
 * Wrap Gemini API calls with exponential backoff retry logic
 *
 * Retry timing:
 * - Attempt 1: immediate
 * - Attempt 2: ~1s + jitter (500ms-1.5s)
 * - Attempt 3: ~2s + jitter (1s-3s)
 * - Attempt 4: ~4s + jitter (2s-6s)
 * - Attempt 5: ~8s + jitter (4s-12s)
 *
 * After 5 attempts (total ~15s), give up and show user error.
 */
export async function streamTextWithRetry(
  config: Parameters<typeof streamText>[0],
  onRetry?: (attemptNumber: number, delayMs: number) => void
) {
  return backOff(
    async () => {
      try {
        return await streamText(config);
      } catch (error) {
        if (isRateLimitError(error)) {
          // Rethrow to trigger backOff retry
          throw error;
        }
        // Non-rate-limit errors should not retry
        throw new Error('NON_RETRYABLE');
      }
    },
    {
      // Start with 1s delay, double each attempt
      startingDelay: 1000,
      timeMultiple: 2,

      // Max 5 attempts (1 + 4 retries)
      numOfAttempts: 5,

      // Cap individual retry at 10s
      maxDelay: 10000,

      // Add 30% jitter to prevent synchronized retries
      jitter: 'full',

      // Callback for UI feedback
      retry: (error, attemptNumber) => {
        if (error instanceof Error && error.message === 'NON_RETRYABLE') {
          return false; // Don't retry non-rate-limit errors
        }

        // Calculate delay with jitter for UI display
        const baseDelay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
        const delayMs = baseDelay * (0.5 + Math.random() * 0.5); // Full jitter

        onRetry?.(attemptNumber, Math.round(delayMs));

        return true; // Continue retrying
      },
    }
  );
}
```

**Usage in chat API:**
```typescript
// src/app/api/chat/route.ts (MODIFIED)
import { streamTextWithRetry } from '@/lib/ai/rate-limit-handler';

export async function POST(req: Request) {
  try {
    const { messages, sessionId, stepId, workshopId } = await req.json();

    // ... context assembly ...

    // Use retry wrapper instead of direct streamText
    const result = await streamTextWithRetry(
      {
        model: chatModel,
        system: systemPrompt,
        messages: modelMessages,
      },
      (attemptNumber, delayMs) => {
        // Log retry attempt for monitoring
        console.log(`Rate limit retry attempt ${attemptNumber}, waiting ${delayMs}ms`);

        // TODO: Send retry notification to client via Server-Sent Event
        // (requires extending AI SDK response protocol)
      }
    );

    result.consumeStream();

    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      originalMessages: messages,
      onFinish: async ({ messages: responseMessages }) => {
        await saveMessages(sessionId, stepId, responseMessages);
      },
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      // All retries exhausted, return user-friendly error
      return new Response(
        JSON.stringify({
          error: 'AI_BUSY',
          message: 'The AI is currently experiencing high demand. Please try again in a few moments.',
          retryAfter: 30, // seconds
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '30',
          }
        }
      );
    }

    // Other errors
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Source:** [exponential-backoff npm](https://www.npmjs.com/package/exponential-backoff), [Gemini API Rate Limits Official Docs](https://ai.google.dev/gemini-api/docs/rate-limits)

---

### Pattern 2: Client-Side Rate Limit UI Feedback

**What:** Display user-friendly feedback when rate limits are hit, showing retry countdown and current attempt.

**When to use:** Any UI that triggers Gemini API calls (chat input, extraction, step completion).

**Example:**
```typescript
// src/components/workshop/chat-input.tsx (MODIFIED)
'use client';

import { useState } from 'react';
import { useChat } from 'ai/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function ChatInput({ sessionId, stepId }: { sessionId: string; stepId: string }) {
  const [rateLimitStatus, setRateLimitStatus] = useState<{
    isRateLimited: boolean;
    attemptNumber: number;
    retryInSeconds: number;
  } | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: { sessionId, stepId },
    onError: (err) => {
      // Parse rate limit error
      if (err.message.includes('AI_BUSY') || err.message.includes('429')) {
        try {
          const errorData = JSON.parse(err.message);
          setRateLimitStatus({
            isRateLimited: true,
            attemptNumber: 1,
            retryInSeconds: errorData.retryAfter || 30,
          });

          // Start countdown timer
          const interval = setInterval(() => {
            setRateLimitStatus((prev) => {
              if (!prev || prev.retryInSeconds <= 1) {
                clearInterval(interval);
                return null;
              }
              return {
                ...prev,
                retryInSeconds: prev.retryInSeconds - 1,
              };
            });
          }, 1000);
        } catch {
          // Fallback for non-JSON errors
          setRateLimitStatus({
            isRateLimited: true,
            attemptNumber: 1,
            retryInSeconds: 30,
          });
        }
      }
    },
  });

  return (
    <div className="space-y-4">
      {/* Rate limit feedback banner */}
      {rateLimitStatus?.isRateLimited && (
        <Alert variant="default" className="border-yellow-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            AI is busy. Retrying in {rateLimitStatus.retryInSeconds}s...
            (Attempt {rateLimitStatus.attemptNumber} of 5)
          </AlertDescription>
        </Alert>
      )}

      {/* Chat input form */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={handleInputChange}
          disabled={isLoading || rateLimitStatus?.isRateLimited}
          placeholder={
            rateLimitStatus?.isRateLimited
              ? 'Waiting for AI to become available...'
              : 'Type your message...'
          }
          className="w-full"
        />
        <button
          type="submit"
          disabled={isLoading || rateLimitStatus?.isRateLimited}
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

**Key insight:** Users tolerate rate limits IF they understand what's happening and see progress. Silent failures destroy trust.

---

### Pattern 3: Neon Health-Check Warming with Vercel Cron

**What:** Vercel cron job pings database every 4 minutes to keep Neon compute active during user hours.

**When to use:** Production deployments where first-load latency is critical (users arriving after 5+ minute idle period).

**Example:**
```json
// vercel.json (NEW FILE or MODIFIED)
{
  "crons": [
    {
      "path": "/api/health",
      "schedule": "*/4 * * * *"
    }
  ]
}
```

```typescript
// src/app/api/health/route.ts (MODIFIED)
import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * GET /api/health
 *
 * Health check endpoint for:
 * 1. Vercel cron job (keeps Neon compute active)
 * 2. Monitoring/uptime services
 *
 * Called every 4 minutes by Vercel cron to prevent Neon scale-to-zero
 * (Neon free tier suspends after 5 minutes of inactivity)
 */
export async function GET(req: Request) {
  // Verify request is from Vercel cron (security)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Simple query to keep connection active
    // Uses pg_sleep(0) to ensure connection without heavy operation
    const result = await db.execute(sql`SELECT 1 as health, pg_sleep(0)`);

    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);

    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
```

**Environment variable:**
```bash
# .env.local (add)
CRON_SECRET=<generate-random-secret>
```

**Vercel dashboard configuration:**
1. Go to project settings → Environment Variables
2. Add `CRON_SECRET` with same value as local `.env.local`
3. Deploy — Vercel will automatically call `/api/health` every 4 minutes

**Key insight:** 4-minute interval is JUST under Neon's 5-minute scale-to-zero timeout, ensuring compute stays active with 1-minute safety margin.

**Source:** [Vercel Cron Job Example](https://vercel.com/templates/next.js/vercel-cron), [Neon Compute Lifecycle](https://neon.com/docs/introduction/compute-lifecycle)

---

### Pattern 4: Streaming Interruption Recovery

**What:** Detect streaming connection failures and provide user recovery path.

**When to use:** All AI streaming responses (chat, extraction summaries).

**Current AI SDK limitations:**
- Stream resumption (`resume: true`) only works on page reload, NOT tab switching (Issue #11865)
- Requires Redis + `resumable-stream` npm package (infrastructure overhead)
- Incompatible with abort functionality (closing tab breaks resumption)

**Recommended approach for Phase 14:** Don't implement full stream resumption (too complex for MVP 1.0). Instead, implement **graceful degradation**:

```typescript
// src/components/workshop/chat-message-stream.tsx (MODIFIED)
'use client';

import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function ChatMessageStream({ sessionId, stepId }) {
  const [streamError, setStreamError] = useState<boolean>(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  const { messages, reload, isLoading } = useChat({
    api: '/api/chat',
    body: { sessionId, stepId },
    onFinish: (message) => {
      setLastMessageId(message.id);
      setStreamError(false); // Clear error on successful completion
    },
    onError: (error) => {
      console.error('Stream error:', error);
      setStreamError(true);
    },
  });

  // Detect streaming timeout (no new messages for 30s during loading)
  useEffect(() => {
    if (!isLoading) return;

    const timeout = setTimeout(() => {
      setStreamError(true);
      console.warn('Stream timeout detected after 30s of inactivity');
    }, 30000);

    return () => clearTimeout(timeout);
  }, [isLoading, messages.length]);

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id}>
          {message.content}
        </div>
      ))}

      {/* Stream interruption recovery UI */}
      {streamError && (
        <div className="rounded-md border border-yellow-500 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            The connection was interrupted. The response may be incomplete.
          </p>
          <Button
            onClick={() => {
              setStreamError(false);
              reload(); // Retry the last message
            }}
            variant="outline"
            className="mt-2"
          >
            Retry Response
          </Button>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && !streamError && (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">AI is thinking...</span>
        </div>
      )}
    </div>
  );
}
```

**Configuration for streaming reliability:**
```typescript
// src/app/api/chat/route.ts (ADD EXPORTS)

/**
 * Use Node.js runtime (not Edge) for streaming reliability
 * Edge runtime has stricter timeout constraints
 */
export const runtime = 'nodejs';

/**
 * Mark route as dynamic to prevent static optimization
 * Streaming requires dynamic rendering
 */
export const dynamic = 'force-dynamic';

/**
 * Increase timeout for long AI responses
 * Vercel Pro allows up to 60s, Hobby up to 10s
 */
export const maxDuration = 30; // ALREADY SET in existing code
```

**Key insight:** Full stream resumption is overkill for MVP 1.0. "Retry" button provides 90% of value with 10% of complexity.

**Source:** [AI SDK Issue #11865](https://github.com/vercel/ai/issues/11865), [AI SDK Chatbot Resume Streams](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams), [Fixing Slow SSE Streaming in Next.js](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry logic with exponential backoff | Custom setTimeout recursion | exponential-backoff npm | Edge cases: jitter, max attempts, cleanup on abort, configurable timing. Hand-rolling misses these. |
| Database connection pooling | Custom connection manager | Neon's built-in PgBouncer | Neon provides connection pooling automatically. Custom pooling adds complexity and breaks serverless model. |
| Rate limit monitoring | Scraping Gemini dashboard | Google AI Studio rate limit API | Dashboard is for humans. Use programmatic access via AI Studio API for monitoring. |
| Stream resumption | Custom SSE reconnection | AI SDK's `resume: true` (if Redis available) | Stream resumption requires publisher/subscriber state management, Redis persistence, and race condition handling. Don't build from scratch. |
| Cron job scheduler | Custom Next.js interval timers | Vercel cron jobs | Serverless functions don't persist between requests. Vercel cron is designed for this use case. |

**Key insight:** Production hardening problems are deceptively complex. Use battle-tested libraries and platform features.

---

## Common Pitfalls

### Pitfall 1: Rate Limit Retry Without Jitter (Thundering Herd)

**What goes wrong:** Multiple users hit rate limit simultaneously. App implements exponential backoff WITHOUT jitter. All clients retry at exactly 1s, 2s, 4s, 8s intervals. Server gets hammered with synchronized retry waves. Rate limit never recovers because retries arrive in bursts.

**Why it happens:** Developers implement exponential backoff correctly (1s → 2s → 4s → 8s) but forget jitter. Without randomization, all clients retry in lockstep. This is called "thundering herd problem" — synchronized retries create artificial traffic spikes.

**How to avoid:** Always add jitter to exponential backoff. Use "full jitter" formula: `sleep = random(0, min(cap, base * 2^attempts))`. This spreads retries across time window, preventing synchronized waves.

**Warning signs:**
- Rate limit errors spike in waves (not gradual)
- Retry logs show multiple clients retrying at same millisecond
- Rate limit persists longer than expected (retries making it worse)
- Monitoring shows traffic spikes at 1s, 2s, 4s intervals

**Source:** [Exponential Backoff Best Practices](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)

---

### Pitfall 2: Health Check Warming Runs Outside User Hours

**What goes wrong:** Vercel cron job pings database every 4 minutes, 24/7/365. This keeps Neon compute active during 3am when NO users are online. Wastes Neon compute hours (paid tier billing) or burns through free tier quota. First user at 8am STILL hits cold start because cron stopped running at 7:50am (within 5-minute scale-to-zero window).

**Why it happens:** Developer sets cron to `*/4 * * * *` (every 4 minutes, all day). Doesn't consider that user traffic has daily patterns (peak hours vs off-hours). Neon free tier has limited compute hours — warming during zero-traffic hours wastes quota.

**How to avoid:** Configure cron to run ONLY during expected user hours. Use cron schedule targeting business hours: `*/4 8-22 * * *` (every 4 minutes, 8am-10pm). Add timezone consideration: `TZ=America/Los_Angeles */4 8-22 * * *`. Monitor user traffic patterns and adjust schedule accordingly.

**Alternative:** Accept cold starts during off-hours (low user impact), only warm during peak hours.

**Warning signs:**
- Neon compute hours usage is constant 24/7
- Free tier quota exhausted early in billing cycle
- Health check logs show activity at 3am with zero user sessions
- First morning user STILL sees 3-8s load time

---

### Pitfall 3: No User Feedback During Rate Limit Retries

**What goes wrong:** User sends chat message. Gemini returns 429 rate limit error. Exponential backoff retries silently in background (1s, 2s, 4s, 8s). User sees 15 seconds of "loading..." spinner with no explanation. User assumes app is broken, refreshes page, loses progress. User tries again, hits rate limit again (now they've made problem worse by adding retry requests).

**Why it happens:** Developer implements server-side retry logic but forgets client-side UI feedback. User has no visibility into what's happening. 15 seconds feels like eternity with no context.

**How to avoid:** Show user-friendly feedback DURING retries: "AI is busy, retrying in 3s... (Attempt 2 of 5)". Use optimistic UI: show "checking availability..." immediately, then countdown. After 3+ attempts, escalate message: "High demand right now. You can wait or try again later."

**Warning signs:**
- User support requests: "chat stopped working"
- Analytics showing high page refresh rate during rate limit events
- Users abandoning mid-conversation during peak traffic
- No correlation between retry logs and user-visible feedback

**Source:** Best practices from [UI feedback patterns for error handling](https://uxdesign.cc/how-to-design-error-states-for-mobile-apps-a5f1b0a09c69)

---

### Pitfall 4: Streaming Timeout Without Fallback UI

**What goes wrong:** User starts chat message. Gemini streams response. Network hiccup interrupts connection at 60% completion. AI SDK streaming stops. User sees partial message cut off mid-sentence with no "Retry" or "Regenerate" button. User must refresh entire page to continue, losing unsaved progress.

**Why it happens:** Developer uses AI SDK's `useChat` hook with default configuration. Stream interruption is treated as error, but no error recovery UI is provided. User is stuck with incomplete response and no clear path forward.

**How to avoid:** Detect streaming errors via `useChat` hook's `onError` callback. Show recovery UI: "Response interrupted. [Retry] or [Continue conversation]". Implement timeout detection: if no new content for 30s during streaming, offer retry. Use AI SDK's `reload()` function to retry last message without full page refresh.

**Warning signs:**
- User reports "AI response cut off in middle of sentence"
- Analytics showing conversation abandonment during AI turn (not user turn)
- Error logs: "Stream closed unexpectedly" with no user-facing handling
- Support requests after users switch tabs mid-response

**Source:** [AI SDK Issue #11865](https://github.com/vercel/ai/issues/11865)

---

### Pitfall 5: Cron Job Missing Authentication

**What goes wrong:** Developer creates `/api/health` route for Vercel cron warming. Forgets to add authentication. Route is publicly accessible. Attacker finds endpoint, hammers it with requests, exhausts Vercel function invocations, racks up bill. Or: attacker floods endpoint, Neon sees high traffic, rate limits legitimate health checks, cold starts return.

**Why it happens:** Health check endpoints feel "safe" because they're simple SELECT queries. Developer forgets they're public API routes. Vercel cron jobs require manual authentication — they don't automatically validate origin.

**How to avoid:** Always authenticate cron job routes. Use `CRON_SECRET` environment variable, check `Authorization: Bearer <secret>` header. Reject requests without valid auth. Use Vercel-specific headers for additional validation: `x-vercel-signature` or `x-vercel-cron: true`.

**Example:**
```typescript
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Health check logic...
}
```

**Warning signs:**
- `/api/health` endpoint accessible via browser without auth
- Function invocation count higher than expected (every 4 mins = 360 calls/day, not 10k)
- Unknown IPs calling health check in access logs
- Unexpected Vercel bill spike

**Source:** [Vercel Cron Job Best Practices](https://vercel.com/docs/cron-jobs)

---

## Code Examples

### Example 1: Complete Rate Limit Handling with UI Feedback

```typescript
// src/lib/ai/gemini-client.ts (NEW FILE)
import { backOff } from 'exponential-backoff';
import { streamText, generateObject } from 'ai';
import { chatModel } from '@/lib/ai/chat-config';

export interface RateLimitProgress {
  attemptNumber: number;
  maxAttempts: number;
  retryInMs: number;
}

export type RateLimitCallback = (progress: RateLimitProgress) => void;

/**
 * Check if error is Gemini 429 rate limit
 */
function isGeminiRateLimitError(error: unknown): boolean {
  if (typeof error !== 'object' || !error) return false;

  // Check for HTTP 429 status
  if ('status' in error && error.status === 429) return true;

  // Check for RESOURCE_EXHAUSTED error code
  if ('code' in error && error.code === 'RESOURCE_EXHAUSTED') return true;

  // Check error message for rate limit indicators
  if ('message' in error && typeof error.message === 'string') {
    return error.message.toLowerCase().includes('rate limit') ||
           error.message.toLowerCase().includes('quota exceeded');
  }

  return false;
}

/**
 * Configuration for exponential backoff
 */
const BACKOFF_CONFIG = {
  startingDelay: 1000,    // Start with 1s
  timeMultiple: 2,        // Double each attempt
  numOfAttempts: 5,       // Max 5 attempts (1 + 4 retries)
  maxDelay: 15000,        // Cap at 15s
  jitter: 'full' as const, // Full jitter for max distribution
};

/**
 * Wrap streamText with rate limit retry logic
 */
export async function streamTextWithRetry(
  config: Parameters<typeof streamText>[0],
  onRateLimitRetry?: RateLimitCallback
) {
  return backOff(
    async () => {
      try {
        return await streamText(config);
      } catch (error) {
        if (isGeminiRateLimitError(error)) {
          throw error; // Rethrow for backOff to handle
        }
        // Non-rate-limit errors should fail immediately
        throw new Error('NON_RETRYABLE');
      }
    },
    {
      ...BACKOFF_CONFIG,
      retry: (error, attemptNumber) => {
        // Don't retry non-rate-limit errors
        if (error instanceof Error && error.message === 'NON_RETRYABLE') {
          return false;
        }

        // Calculate next retry delay with full jitter
        const baseDelay = Math.min(
          BACKOFF_CONFIG.startingDelay * Math.pow(BACKOFF_CONFIG.timeMultiple, attemptNumber - 1),
          BACKOFF_CONFIG.maxDelay
        );
        const delayMs = Math.random() * baseDelay; // Full jitter: random(0, baseDelay)

        // Notify callback for UI feedback
        onRateLimitRetry?.({
          attemptNumber,
          maxAttempts: BACKOFF_CONFIG.numOfAttempts,
          retryInMs: Math.round(delayMs),
        });

        return true; // Continue retrying
      },
    }
  );
}

/**
 * Wrap generateObject with rate limit retry logic
 */
export async function generateObjectWithRetry<T>(
  config: Parameters<typeof generateObject>[0],
  onRateLimitRetry?: RateLimitCallback
) {
  return backOff(
    async () => {
      try {
        return await generateObject(config);
      } catch (error) {
        if (isGeminiRateLimitError(error)) {
          throw error;
        }
        throw new Error('NON_RETRYABLE');
      }
    },
    {
      ...BACKOFF_CONFIG,
      retry: (error, attemptNumber) => {
        if (error instanceof Error && error.message === 'NON_RETRYABLE') {
          return false;
        }

        const baseDelay = Math.min(
          BACKOFF_CONFIG.startingDelay * Math.pow(BACKOFF_CONFIG.timeMultiple, attemptNumber - 1),
          BACKOFF_CONFIG.maxDelay
        );
        const delayMs = Math.random() * baseDelay;

        onRateLimitRetry?.({
          attemptNumber,
          maxAttempts: BACKOFF_CONFIG.numOfAttempts,
          retryInMs: Math.round(delayMs),
        });

        return true;
      },
    }
  );
}
```

**Source:** [exponential-backoff npm](https://www.npmjs.com/package/exponential-backoff)

---

### Example 2: Neon Connection Configuration with Timeout

```typescript
// src/db/index.ts (MODIFIED)
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// Configure connection timeout to fail fast on cold starts
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Add connection timeout parameter to URL
// This makes cold starts fail fast (10s) rather than hang (30s default)
const connectionStringWithTimeout = connectionString.includes('?')
  ? `${connectionString}&connect_timeout=10`
  : `${connectionString}?connect_timeout=10`;

// Create connection pool
const pool = new Pool({
  connectionString: connectionStringWithTimeout,
  // Neon recommends max 1 connection per serverless function instance
  max: 1,
});

export const db = drizzle(pool, { schema });
```

**Source:** [Neon Connection Latency Docs](https://neon.com/docs/connect/connection-latency)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Retry on 429 with fixed 1s delay | Exponential backoff with jitter | AWS Best Practices 2015 | Prevents thundering herd, 10x better recovery |
| Cold start accepted as "serverless tax" | Health-check warming with cron | Neon + Vercel integration 2024 | Sub-second first loads during user hours |
| Full stream resumption (complex) | Graceful degradation with retry button | AI SDK v6 2025 | 10% complexity, 90% value for MVP |
| Generic "error occurred" messages | Specific rate limit feedback with countdown | UX best practices 2023 | Users tolerate waits if they understand them |

**Deprecated/outdated:**
- **AI SDK stream resumption without Redis:** AI SDK v5 attempted client-side resumption, but v6 requires Redis for reliability. Don't use v5 approach.
- **Gemini free tier for production:** December 2025 rate limit cuts (50-92% reduction) make free tier unsuitable for multi-user apps. Tier 1 ($50 cumulative spend) is new baseline.
- **Edge runtime for AI streaming:** Next.js Edge runtime has stricter timeout limits. Node.js runtime is now recommended for AI streaming (per Vercel docs 2026).

---

## Open Questions

### Question 1: Gemini Rate Limit Response Headers

**What we know:** Gemini returns 429 status on rate limit errors with error details specifying which dimension was exceeded (RPM/TPM/RPD).

**What's unclear:** Does Gemini API return `X-RateLimit-Remaining` or similar headers BEFORE hitting limits? This would enable proactive throttling.

**Recommendation:** Test in production with logging. If headers exist, implement proactive throttling when remaining quota drops below 20%. If no headers, reactive retry-only approach is sufficient for MVP 1.0.

---

### Question 2: Optimal Health Check Frequency

**What we know:** Neon free tier suspends after 5 minutes inactivity. Cron every 4 minutes keeps compute active.

**What's unclear:** Does "every 4 minutes" create enough margin given cron timing variability? Could cron miss a cycle and hit 5+ minutes?

**Recommendation:** Start with 4-minute interval. Monitor cold start frequency in production. If cold starts still occur during cron hours, tighten to 3-minute interval. Consider running cron at :00, :03, :06, :09... for sub-5-minute guarantee.

---

### Question 3: AI SDK v6 Streaming Reliability

**What we know:** AI SDK v6.0.3 fixed dynamic Chat instance replacement bug (issue #10926). Tab switching resumption still broken (issue #11865).

**What's unclear:** Is tab switching issue being actively worked on? Will AI SDK v7 fix this?

**Recommendation:** For Phase 14, implement "Retry" button fallback. Monitor AI SDK GitHub for tab switching fix. If fixed in future release, upgrade and remove fallback UI.

---

## Sources

### Primary (HIGH confidence)

**Gemini Rate Limits:**
- [Gemini API Rate Limits Official Docs](https://ai.google.dev/gemini-api/docs/rate-limits) - Official Google documentation on RPM/TPM/RPD/IPM dimensions
- [Gemini API Rate Limit Explained 2026](https://www.aifreeapi.com/en/posts/gemini-api-rate-limit-explained) - Current tier limits and December 2025 changes
- [Gemini API Rate Limits Per Tier](https://www.aifreeapi.com/en/posts/gemini-api-rate-limits-per-tier) - Free (15 RPM) vs Tier 1 (1000 RPM) comparison
- [Gemini API Quota Exceeded Fix Guide](https://yingtu.ai/blog/gemini-api-quota-exceeded-fix) - Error 429 handling patterns

**Neon Cold Starts:**
- [Neon Compute Lifecycle Official Docs](https://neon.com/docs/introduction/compute-lifecycle) - Scale-to-zero behavior, 5-minute timeout
- [Neon Connection Latency Official Docs](https://neon.com/docs/connect/connection-latency) - Cold start timing (few hundred ms), connection timeout configuration
- [Neon Postgres Deep Dive 2025](https://dev.to/dataformathub/neon-postgres-deep-dive-why-the-2025-updates-change-serverless-sql-5o0) - PgBouncer connection pooling, cold start mitigation

**AI SDK Streaming:**
- [AI SDK Chatbot Resume Streams](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams) - Official docs on stream resumption with Redis
- [AI SDK Issue #11865](https://github.com/vercel/ai/issues/11865) - Tab switching stream resumption doesn't work
- [AI SDK Issue #10926](https://github.com/vercel/ai/issues/10926) - Dynamic Chat instance replacement fixed in v6.0.3

**Vercel Cron:**
- [Vercel Cron Job Example](https://vercel.com/templates/next.js/vercel-cron) - Official template with vercel.json configuration
- [Next.js Cron Jobs Guide](https://www.chrisnowicki.dev/blog/how-to-create-a-vercel-cron-job) - Step-by-step setup with authentication

**Retry Logic:**
- [exponential-backoff npm package](https://www.npmjs.com/package/exponential-backoff) - TypeScript retry library with jitter support
- [How to Implement Retry with Exponential Backoff in Node.js](https://www.codewithyou.com/blog/how-to-implement-retry-with-exponential-backoff-in-nodejs) - Best practices and examples

### Secondary (MEDIUM confidence)

**From Existing Research:**
- WorkshopPilot PITFALLS.md (2026-02-08) - Pitfall 2 (Gemini Rate Limit Cascade Failures), Pitfall 3 (Neon Cold Start Death Spiral), Pitfall 7 (Streaming Interruption Failures)

**Next.js Streaming:**
- [Fixing Slow SSE Streaming in Next.js](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996) - January 2026 article (attempted WebFetch but 403, verified via search results)
- [How to Fix Streaming SSR Issues in Next.js](https://oneuptime.com/blog/post/2026-01-24-nextjs-streaming-ssr-issues/view) - January 2026 article (attempted WebFetch but 403, verified via search results)

---

## Metadata

**Confidence breakdown:**
- **Rate limit handling:** HIGH - Official Gemini docs + established exponential backoff patterns + npm library with 150+ dependents
- **Cold start prevention:** HIGH - Official Neon docs + Vercel cron official templates + existing health check endpoint in codebase
- **Streaming reliability:** MEDIUM - AI SDK official docs + known GitHub issues, but some workarounds are community-driven, not official

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days for stable production patterns, 7 days for fast-moving AI SDK updates)

**Dependencies verified:**
- Existing codebase uses AI SDK 6.0.77 (confirmed in chat route)
- Existing codebase uses @neondatabase/serverless (confirmed in imports)
- Existing codebase has /api/health route (confirmed via Glob)
- Existing codebase uses maxDuration=30 in chat route (confirmed)

**Action items for planner:**
1. Install `exponential-backoff` npm package
2. Create `src/lib/ai/rate-limit-handler.ts` wrapper
3. Modify `src/app/api/chat/route.ts` to use retry wrapper
4. Add `CRON_SECRET` environment variable
5. Create `vercel.json` with cron configuration
6. Add rate limit UI feedback to chat components
7. Add streaming error recovery UI to chat components
