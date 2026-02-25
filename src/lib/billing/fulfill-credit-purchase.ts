import 'server-only';
import { stripe } from '@/lib/billing/stripe';
import { db } from '@/db/client';
import { users, creditTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Discriminated union result from fulfillCreditPurchase.
 * Callers (webhook handler, success page) should branch on status.
 */
export type FulfillResult =
  | { status: 'fulfilled'; creditQty: number; newBalance: number }
  | { status: 'already_fulfilled' }
  | { status: 'payment_not_paid' }
  | { status: 'user_not_found' };

/**
 * Shared idempotent credit fulfillment function.
 *
 * Called by both the Stripe webhook handler (Plan 49-02) and the success page
 * (Plan 49-03). The stripeSessionId UNIQUE constraint on credit_transactions is
 * the sole idempotency gate — calling this function twice with the same sessionId
 * results in exactly one credit_transactions row and one creditBalance increment.
 *
 * Design notes (from RESEARCH.md):
 * - Two writes (insert + update + update) are NOT fully atomic.
 *   This is safe because onConflictDoNothing prevents double-counting on retries.
 * - neon-http driver does NOT support interactive multi-statement transactions.
 * - balanceAfter is set from the RETURNING result of the atomic increment,
 *   not from a pre-computed estimate (avoids Pitfall 4 race condition).
 */
export async function fulfillCreditPurchase(sessionId: string): Promise<FulfillResult> {
  // Step 1: Retrieve session from Stripe to verify payment status and extract metadata
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  // Step 2: Guard against deferred payment methods (ACH, etc.) that haven't settled
  if (session.payment_status !== 'paid') {
    return { status: 'payment_not_paid' };
  }

  // Step 3: Extract metadata set during checkout session creation
  const clerkUserId = session.metadata?.clerkUserId;
  const creditQty = parseInt(session.metadata?.creditQty ?? '0', 10);

  if (!clerkUserId || !creditQty || isNaN(creditQty)) {
    throw new Error(
      `fulfillCreditPurchase: missing or invalid metadata on session ${sessionId}. ` +
        `clerkUserId=${clerkUserId}, creditQty=${session.metadata?.creditQty}`
    );
  }

  // Step 4: Attempt idempotent insert via stripeSessionId UNIQUE constraint
  // onConflictDoNothing returns empty array if row already exists
  const inserted = await db
    .insert(creditTransactions)
    .values({
      clerkUserId,
      type: 'purchase',
      status: 'completed',
      amount: creditQty,
      balanceAfter: 0, // Placeholder — updated after atomic increment below
      description: `Purchase: ${session.metadata?.productType ?? 'Workshop credit'}`,
      stripeSessionId: sessionId,
    })
    .onConflictDoNothing({ target: creditTransactions.stripeSessionId })
    .returning({ id: creditTransactions.id });

  // Step 5: No-op check — row already existed, fulfillment already ran
  if (inserted.length === 0) {
    return { status: 'already_fulfilled' };
  }

  // Step 6: Atomically increment creditBalance and retrieve the new balance
  const [updatedUser] = await db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} + ${creditQty}` })
    .where(eq(users.clerkUserId, clerkUserId))
    .returning({ creditBalance: users.creditBalance });

  if (!updatedUser) {
    // User exists in Stripe metadata but not in DB — should not happen in practice
    console.error(
      `fulfillCreditPurchase: user not found in DB for clerkUserId=${clerkUserId} ` +
        `after successful payment. sessionId=${sessionId}. Manual reconciliation required.`
    );
    return { status: 'user_not_found' };
  }

  // Step 7: Update balanceAfter in the transaction row with the actual post-increment value
  // This avoids RESEARCH.md Pitfall 4 — balanceAfter reflects real post-increment balance
  await db
    .update(creditTransactions)
    .set({ balanceAfter: updatedUser.creditBalance })
    .where(eq(creditTransactions.id, inserted[0].id));

  // Step 8: Return success with actual new balance
  return { status: 'fulfilled', creditQty, newBalance: updatedUser.creditBalance };
}
