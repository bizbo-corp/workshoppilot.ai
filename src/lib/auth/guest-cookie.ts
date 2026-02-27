import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Guest Cookie Utility
 * HMAC-SHA256 signed HttpOnly cookie for guest participant identity.
 *
 * Design decisions:
 * - Uses Node.js built-in `crypto` — no external library (jose/iron-session) needed
 *   for this simple sign/verify pattern. Avoids package bloat per research decision.
 * - `timingSafeEqual` prevents timing attacks on signature comparison.
 * - base64url encoding produces URL-safe tokens without padding.
 * - Cookie lifetime: 8 hours (covers a full workshop session).
 * - sameSite: 'lax' (NOT 'strict') — 'strict' would drop the cookie on initial
 *   navigation from the join link, breaking first-load auth.
 */

const SECRET = process.env.GUEST_COOKIE_SECRET!;

export const COOKIE_NAME = 'wp_guest';

export type GuestCookiePayload = {
  participantId: string; // spar_xxx
  workshopId: string;    // ws_xxx (embedded for cross-workshop validation)
  iat: number;           // issued-at epoch ms
};

/**
 * Sign a guest cookie payload using HMAC-SHA256.
 * Returns: `${base64url(JSON)}.${base64url(signature)}`
 */
export function signGuestCookie(payload: GuestCookiePayload): string {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verify and decode a guest cookie token.
 * Returns the payload if valid, null if tampered or malformed.
 */
export function verifyGuestCookie(token: string): GuestCookiePayload | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;

  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedSig = createHmac('sha256', SECRET).update(encoded).digest('base64url');

  // Timing-safe comparison to prevent timing attacks
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  } catch {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as GuestCookiePayload;
  } catch {
    return null;
  }
}
