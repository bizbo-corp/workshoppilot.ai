/**
 * In-memory sliding-window rate limiter.
 *
 * On Vercel serverless, the Map persists across warm invocations of the same
 * function instance. Cold starts reset the map, which is acceptable for
 * anti-abuse (not billing) purposes.
 */

type RateLimitCategory = 'chat' | 'image-gen' | 'text-gen' | 'build-pack';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<RateLimitCategory, RateLimitConfig> = {
  'chat':       { maxRequests: 20, windowMs: 60_000 },
  'image-gen':  { maxRequests: 10, windowMs: 60_000 },
  'text-gen':   { maxRequests: 30, windowMs: 60_000 },
  'build-pack': { maxRequests: 5,  windowMs: 60_000 },
};

// Per-category maps to isolate memory
// Key: userId or IP string — Value: array of timestamps (epoch ms)
const stores = new Map<RateLimitCategory, Map<string, number[]>>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [, store] of stores) {
    for (const [key, timestamps] of store) {
      const fresh = timestamps.filter(t => t > now - 120_000);
      if (fresh.length === 0) {
        store.delete(key);
      } else {
        store.set(key, fresh);
      }
    }
  }
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check rate limit for a given identifier (userId or IP).
 */
export function checkRateLimit(
  identifier: string,
  category: RateLimitCategory,
): RateLimitResult {
  maybeCleanup();

  const config = RATE_LIMITS[category];
  if (!stores.has(category)) {
    stores.set(category, new Map());
  }
  const store = stores.get(category)!;

  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or initialize timestamps, evict expired entries
  let timestamps = store.get(identifier) || [];
  timestamps = timestamps.filter(t => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldestInWindow = timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    store.set(identifier, timestamps);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 1000),
    };
  }

  timestamps.push(now);
  store.set(identifier, timestamps);

  return {
    allowed: true,
    remaining: config.maxRequests - timestamps.length,
    retryAfterMs: 0,
  };
}

/**
 * Build a 429 Response with proper headers.
 */
export function rateLimitResponse(retryAfterMs: number): Response {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({
      error: 'rate_limit_exceeded',
      message: 'Too many requests. Please slow down and try again shortly.',
      retryAfter: retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    },
  );
}

/**
 * Extract rate limit identifier from request + optional userId.
 * Prefers userId (authenticated), falls back to IP.
 */
export function getRateLimitId(
  req: Request,
  userId: string | null | undefined,
): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  return `ip:${ip}`;
}
