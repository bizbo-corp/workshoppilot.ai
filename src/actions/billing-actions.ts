'use server';

import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { db } from '@/db/client';
import { users, workshops, creditTransactions } from '@/db/schema';
import { eq, gt, and, isNull, sql } from 'drizzle-orm';
import { createPrefixedId } from '@/lib/ids';
import { PAYWALL_CUTOFF_DATE } from '@/lib/billing/paywall-config';
import { stripe } from '@/lib/billing/stripe';
import { getPriceConfig } from '@/lib/billing/price-config';

/**
 * Discriminated union result for consumeCredit().
 * Callers should branch on status to decide which UI to show.
 *
 * - consumed: credit successfully deducted, newBalance reflects post-deduction amount
 * - insufficient_credits: user balance was 0, show paywall modal with Buy Credits CTA
 * - already_unlocked: workshop.creditConsumedAt already set — idempotent, treat as success
 * - grandfathered: workshop predates paywall migration, treat as unlocked
 * - paywall_disabled: PAYWALL_ENABLED=false env var — dev/demo mode, treat as unlocked
 * - error: unexpected failure (auth missing, workshop not found)
 */
export type ConsumeCreditResult =
  | { status: 'consumed'; newBalance: number }
  | { status: 'insufficient_credits' }
  | { status: 'already_unlocked' }
  | { status: 'grandfathered' }
  | { status: 'paywall_disabled' }
  | { status: 'error'; message: string };

/**
 * Atomically consume one credit to unlock Steps 7-10 for a workshop.
 *
 * Implements the conditional-UPDATE pattern for atomicity on neon-http:
 * `UPDATE users SET credit_balance = credit_balance - 1 WHERE clerk_user_id = $1 AND credit_balance > 0 RETURNING credit_balance`
 *
 * Two concurrent calls with credit_balance = 1 produce exactly one 'consumed'
 * result and one 'insufficient_credits' result — PostgreSQL row-level locking
 * on the UPDATE guarantees this without needing SELECT FOR UPDATE.
 *
 * After successful deduction: records a credit_transaction row (type='consumption',
 * amount=-1) and sets workshop.creditConsumedAt — both via Promise.all.
 * If either post-deduction write fails, the credit is already deducted; the error
 * is logged for manual reconciliation and the function still returns 'consumed'.
 */
export async function consumeCredit(workshopId: string): Promise<ConsumeCreditResult> {
  // Step 1: PAYWALL_ENABLED check — short-circuit for dev/demo environments
  if (process.env.PAYWALL_ENABLED === 'false') {
    return { status: 'paywall_disabled' };
  }

  // Step 2: Auth — verify caller identity
  const { userId } = await auth();
  if (!userId) {
    return { status: 'error', message: 'Authentication required' };
  }

  // Step 3: Fetch workshop with ownership check — prevents consuming credits
  // on another user's workshop (server actions must enforce this explicitly)
  const workshop = await db.query.workshops.findFirst({
    where: and(
      eq(workshops.id, workshopId),
      eq(workshops.clerkUserId, userId),
      isNull(workshops.deletedAt)
    ),
    columns: {
      id: true,
      creditConsumedAt: true,
      createdAt: true,
      clerkUserId: true,
    },
  });

  if (!workshop) {
    return { status: 'error', message: 'Workshop not found' };
  }

  // Step 4: Already unlocked — idempotent return
  if (workshop.creditConsumedAt !== null) {
    return { status: 'already_unlocked' };
  }

  // Step 5: Grandfathering — workshops created before the paywall migration
  // are free to access regardless of credit balance
  if (workshop.createdAt < PAYWALL_CUTOFF_DATE) {
    return { status: 'grandfathered' };
  }

  // Step 6: Atomic conditional-UPDATE — decrement credit_balance only if > 0
  // Zero rows returned means balance was already 0 when the UPDATE ran.
  // This is the sole concurrency control — no SELECT FOR UPDATE needed.
  const [updated] = await db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} - 1` })
    .where(
      and(
        eq(users.clerkUserId, userId),
        gt(users.creditBalance, 0)
      )
    )
    .returning({ newBalance: users.creditBalance });

  // Step 7: Zero rows updated — user had no credits
  if (!updated) {
    return { status: 'insufficient_credits' };
  }

  // Step 8: Record consumption transaction and mark workshop unlocked.
  // These two writes are NOT atomic (neon-http limitation), but they run in
  // parallel for performance. If either fails after the credit deduction above,
  // log for manual reconciliation — the credit is already consumed.
  try {
    await Promise.all([
      db.insert(creditTransactions).values({
        id: createPrefixedId('ctx'),
        clerkUserId: userId,
        type: 'consumption',
        status: 'completed',
        amount: -1,
        balanceAfter: updated.newBalance,
        description: 'Workshop unlock: Steps 7-10',
        workshopId,
      }),
      db
        .update(workshops)
        .set({ creditConsumedAt: new Date() })
        .where(eq(workshops.id, workshopId)),
    ]);
  } catch (err) {
    // Credit already deducted — log for manual reconciliation and return success.
    // The transaction ledger or workshop.creditConsumedAt may be missing,
    // but withholding the unlock would make things worse for the user.
    console.error(
      `consumeCredit: post-deduction write failed. ` +
        `workshopId=${workshopId} userId=${userId} newBalance=${updated.newBalance}. ` +
        `Manual reconciliation required.`,
      err
    );
  }

  // Step 9: Return success with post-deduction balance
  return { status: 'consumed', newBalance: updated.newBalance };
}

/**
 * Return the current credit balance for the authenticated user.
 *
 * Returns 0 for unauthenticated callers rather than throwing — safe for use
 * in contexts where auth state may be uncertain (e.g. SSR edge cases).
 *
 * Called on demand at paywall moments (confirm dialog, paywall modal) — not polled.
 */
export async function getCredits(): Promise<number> {
  const { userId } = await auth();
  if (!userId) return 0;

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
    columns: { creditBalance: true },
  });

  return user?.creditBalance ?? 0;
}

/**
 * Mark the authenticated user's onboarding as complete.
 *
 * Sets users.onboardingComplete to true. Idempotent — safe to call multiple times.
 * Returns early for unauthenticated callers rather than throwing.
 *
 * Used by Phase 52 onboarding flow after user completes the guided walkthrough.
 */
export async function markOnboardingComplete(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db
    .update(users)
    .set({ onboardingComplete: true })
    .where(eq(users.clerkUserId, userId));
}

/**
 * Reset onboarding state so the welcome modal reappears.
 * Admin-only — used for testing the onboarding flow.
 */
export async function resetOnboarding(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await db
    .update(users)
    .set({ onboardingComplete: false })
    .where(eq(users.clerkUserId, userId));
}

/**
 * Create a Stripe Checkout session and return the URL.
 *
 * Called from the inline pricing UI in the UpgradeDialog / PaywallOverlay
 * so users can purchase credits without leaving the workshop context.
 *
 * @param tier - 'single' ($99, 1 credit) or 'pack' ($199, 3 credits)
 * @param workshopReturnUrl - URL to redirect after purchase (e.g. /workshop/{sessionId}/step/8)
 */
export async function createCheckoutUrl(
  tier: 'single' | 'pack',
  workshopReturnUrl: string,
): Promise<{ url: string } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Authentication required' };

  // Validate return URL — prevent open redirect
  if (workshopReturnUrl && !workshopReturnUrl.startsWith('/workshop/')) {
    return { error: 'Invalid return URL' };
  }

  // Resolve price ID from tier
  const priceId =
    tier === 'single'
      ? process.env.STRIPE_PRICE_SINGLE_FLIGHT!
      : process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR!;

  const priceConfig = getPriceConfig(priceId);
  if (!priceConfig) return { error: 'Price not configured' };

  // Get or lazily create Stripe customer
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  let stripeCustomerId = user?.stripeCustomerId ?? null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      metadata: { clerkUserId: userId },
      email: user?.email,
    });
    stripeCustomerId = customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.clerkUserId, userId));
  }

  // Build success/cancel URLs
  const origin = (await headers()).get('origin') ?? 'https://workshoppilot.ai';
  const returnParam = workshopReturnUrl
    ? `&return_to=${encodeURIComponent(workshopReturnUrl)}`
    : '';
  const successUrl = `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}${returnParam}`;

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    line_items: [{ price: priceConfig.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: `${origin}/purchase/cancel`,
    metadata: {
      clerkUserId: userId,
      creditQty: String(priceConfig.creditQty),
      productType: priceConfig.label,
    },
  });

  if (!session.url) return { error: 'Failed to create checkout session' };
  return { url: session.url };
}
