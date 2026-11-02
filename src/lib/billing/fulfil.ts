import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { addCredits } from '@/lib/credits/ledger';
import { getPack } from '@/lib/credits/packs';

/**
 * Turn a completed Checkout Session into credits. Called from the webhook
 * and from the success page, so it must be safe to run twice: addCredits is
 * idempotent on the session id.
 */
export async function fulfilCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return { ok: false as const, reason: 'unpaid' };
  const userId = session.metadata?.userId;
  const packId = session.metadata?.packId;
  const pack = packId ? getPack(packId) : undefined;
  if (!userId || !pack) return { ok: false as const, reason: 'missing metadata' };

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { ok: false as const, reason: 'unknown user' };

  const result = await addCredits({
    userId,
    amount: pack.credits,
    kind: 'purchase',
    description: `${pack.name} pack (${pack.credits} credits)`,
    reference: session.id,
  });
  return { ok: true as const, duplicate: result.duplicate, credits: pack.credits };
}
