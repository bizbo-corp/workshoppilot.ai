import 'server-only';
import { stripe } from '@/lib/billing/stripe';
import { db } from '@/db/client';
import { users, creditTransactions, workshops } from '@/db/schema';
import { eq, sql, and, isNull, or } from 'drizzle-orm';
import { ensureTeamSession } from '@/lib/billing/ensure-team-session';
import type { Sku } from '@/lib/billing/price-config';

/**
 * Discriminated union returned by every fulfillment path.
 * Callers (webhook handler, success page) branch on status.
 */
export type FulfillResult =
  | { status: 'fulfilled'; sku: Sku; creditQty: number; newBalance?: number; workshopId?: string }
  | { status: 'already_fulfilled' }
  | { status: 'payment_not_paid' }
  | { status: 'user_not_found' }
  | { status: 'invalid_metadata'; message: string }
  | { status: 'tier_conflict'; message: string };

/**
 * SKU dispatcher. Reads session.metadata.sku and routes to the right fulfiller.
 * Idempotency: every fulfiller writes a row to credit_transactions keyed by
 * stripeSessionId UNIQUE — duplicate calls return 'already_fulfilled'.
 */
export async function fulfillPurchase(sessionId: string): Promise<FulfillResult> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return { status: 'payment_not_paid' };
  }

  const clerkUserId = session.metadata?.clerkUserId;
  const sku = (session.metadata?.sku ?? 'solo') as Sku; // legacy sessions default to 'solo'
  const workshopId = session.metadata?.workshopId ?? null;

  if (!clerkUserId) {
    return { status: 'invalid_metadata', message: `missing clerkUserId on session ${sessionId}` };
  }

  switch (sku) {
    case 'solo':
      return fulfillSoloCredit(sessionId, session, clerkUserId);
    case 'team':
      if (!workshopId) {
        return { status: 'invalid_metadata', message: `team SKU requires workshopId on session ${sessionId}` };
      }
      return fulfillTeamWorkshop(sessionId, clerkUserId, workshopId, session);
    case 'team_upgrade':
      if (!workshopId) {
        return { status: 'invalid_metadata', message: `team_upgrade SKU requires workshopId on session ${sessionId}` };
      }
      return fulfillTeamUpgrade(sessionId, clerkUserId, workshopId);
    case 'white_glove':
      if (!workshopId) {
        return { status: 'invalid_metadata', message: `white_glove SKU requires workshopId on session ${sessionId}` };
      }
      return fulfillWhiteGlove(sessionId, clerkUserId, workshopId);
    default:
      return { status: 'invalid_metadata', message: `unknown sku '${sku}' on session ${sessionId}` };
  }
}

/**
 * Backwards-compat alias. Used by older code paths that imported the original name.
 * New callers should use fulfillPurchase.
 */
export async function fulfillCreditPurchase(sessionId: string): Promise<FulfillResult> {
  return fulfillPurchase(sessionId);
}

// ─── Solo ────────────────────────────────────────────────────────────────────

async function fulfillSoloCredit(
  sessionId: string,
  session: { metadata?: Record<string, string> | null },
  clerkUserId: string
): Promise<FulfillResult> {
  const creditQty = parseInt(session.metadata?.creditQty ?? '0', 10);
  if (!creditQty || isNaN(creditQty)) {
    return {
      status: 'invalid_metadata',
      message: `solo SKU missing/invalid creditQty on session ${sessionId}`,
    };
  }

  const inserted = await db
    .insert(creditTransactions)
    .values({
      clerkUserId,
      type: 'purchase',
      status: 'completed',
      amount: creditQty,
      balanceAfter: 0, // Placeholder — updated after atomic increment below
      description: `Purchase: ${session.metadata?.productType ?? 'Solo Workshop credit'}`,
      stripeSessionId: sessionId,
      sku: 'solo',
    })
    .onConflictDoNothing({ target: creditTransactions.stripeSessionId })
    .returning({ id: creditTransactions.id });

  if (inserted.length === 0) {
    return { status: 'already_fulfilled' };
  }

  const [updatedUser] = await db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} + ${creditQty}` })
    .where(eq(users.clerkUserId, clerkUserId))
    .returning({ creditBalance: users.creditBalance });

  if (!updatedUser) {
    console.error(
      `fulfillSoloCredit: user not found in DB for clerkUserId=${clerkUserId} ` +
        `after successful payment. sessionId=${sessionId}. Manual reconciliation required.`
    );
    return { status: 'user_not_found' };
  }

  await db
    .update(creditTransactions)
    .set({ balanceAfter: updatedUser.creditBalance })
    .where(eq(creditTransactions.id, inserted[0].id));

  return {
    status: 'fulfilled',
    sku: 'solo',
    creditQty,
    newBalance: updatedUser.creditBalance,
  };
}

// ─── Team (full purchase) ────────────────────────────────────────────────────

async function fulfillTeamWorkshop(
  sessionId: string,
  clerkUserId: string,
  workshopId: string,
  session: { metadata?: Record<string, string> | null }
): Promise<FulfillResult> {
  // Idempotency gate
  const inserted = await db
    .insert(creditTransactions)
    .values({
      clerkUserId,
      type: 'purchase',
      status: 'completed',
      amount: 0,
      balanceAfter: 0,
      description: `Purchase: ${session.metadata?.productType ?? 'Team Workshop'}`,
      workshopId,
      stripeSessionId: sessionId,
      sku: 'team',
    })
    .onConflictDoNothing({ target: creditTransactions.stripeSessionId })
    .returning({ id: creditTransactions.id });

  if (inserted.length === 0) return { status: 'already_fulfilled' };

  // Update workshop tier — only if it's still null or solo (solo is allowed because
  // a user might have purchased solo, then opted to pay full team via the paywall path
  // rather than the upgrade path; either way, becoming team is fine).
  const now = new Date();
  const [updated] = await db
    .update(workshops)
    .set({
      tier: 'team',
      tierPaidAt: now,
      facilitatorMode: 'team',
      workshopType: 'multiplayer',
      maxParticipants: 15,
      // Stamp creditConsumedAt if not already set so Step 7+ unlocks
      creditConsumedAt: sql`COALESCE(${workshops.creditConsumedAt}, ${now})`,
    })
    .where(
      and(
        eq(workshops.id, workshopId),
        eq(workshops.clerkUserId, clerkUserId),
        or(isNull(workshops.tier), eq(workshops.tier, 'solo'))
      )
    )
    .returning({ id: workshops.id, tier: workshops.tier });

  if (!updated) {
    console.error(
      `fulfillTeamWorkshop: workshop ${workshopId} not in expected state ` +
        `(owner=${clerkUserId}, tier=null|solo). Refund may be required.`
    );
    return { status: 'tier_conflict', message: `workshop ${workshopId} already at non-solo tier` };
  }

  // Ensure Liveblocks session + owner participant exist
  await ensureTeamSession(workshopId, clerkUserId);

  return { status: 'fulfilled', sku: 'team', creditQty: 0, workshopId };
}

// ─── Team upgrade (solo → team, $200 diff) ──────────────────────────────────

async function fulfillTeamUpgrade(
  sessionId: string,
  clerkUserId: string,
  workshopId: string
): Promise<FulfillResult> {
  const inserted = await db
    .insert(creditTransactions)
    .values({
      clerkUserId,
      type: 'purchase',
      status: 'completed',
      amount: 0,
      balanceAfter: 0,
      description: 'Purchase: Solo → Team Upgrade',
      workshopId,
      stripeSessionId: sessionId,
      sku: 'team_upgrade',
    })
    .onConflictDoNothing({ target: creditTransactions.stripeSessionId })
    .returning({ id: creditTransactions.id });

  if (inserted.length === 0) return { status: 'already_fulfilled' };

  // Strict guard: upgrade only valid when current tier is exactly 'solo'.
  // If the workshop is somehow at a different tier, refuse and log for refund.
  const [updated] = await db
    .update(workshops)
    .set({
      tier: 'team',
      tierPaidAt: new Date(),
      facilitatorMode: 'team',
      workshopType: 'multiplayer',
      maxParticipants: 15,
    })
    .where(
      and(
        eq(workshops.id, workshopId),
        eq(workshops.clerkUserId, clerkUserId),
        eq(workshops.tier, 'solo')
      )
    )
    .returning({ id: workshops.id });

  if (!updated) {
    console.error(
      `fulfillTeamUpgrade: workshop ${workshopId} not at tier='solo' for owner ${clerkUserId}. ` +
        `Manual refund required for session ${sessionId}.`
    );
    // Mark the transaction as failed so the ledger reflects reality
    await db
      .update(creditTransactions)
      .set({
        status: 'failed',
        description: `Purchase rejected: workshop ${workshopId} not at solo tier`,
      })
      .where(eq(creditTransactions.id, inserted[0].id));
    return {
      status: 'tier_conflict',
      message: `team_upgrade rejected — workshop ${workshopId} is not at solo tier`,
    };
  }

  await ensureTeamSession(workshopId, clerkUserId);

  return { status: 'fulfilled', sku: 'team_upgrade', creditQty: 0, workshopId };
}

// ─── White Glove ────────────────────────────────────────────────────────────

async function fulfillWhiteGlove(
  sessionId: string,
  clerkUserId: string,
  workshopId: string
): Promise<FulfillResult> {
  const inserted = await db
    .insert(creditTransactions)
    .values({
      clerkUserId,
      type: 'purchase',
      status: 'completed',
      amount: 0,
      balanceAfter: 0,
      description: 'Purchase: White Glove',
      workshopId,
      stripeSessionId: sessionId,
      sku: 'white_glove',
    })
    .onConflictDoNothing({ target: creditTransactions.stripeSessionId })
    .returning({ id: creditTransactions.id });

  if (inserted.length === 0) return { status: 'already_fulfilled' };

  const now = new Date();
  const [updated] = await db
    .update(workshops)
    .set({
      tier: 'white_glove',
      tierPaidAt: now,
      facilitatorMode: 'team',
      workshopType: 'multiplayer',
      maxParticipants: 15,
      creditConsumedAt: sql`COALESCE(${workshops.creditConsumedAt}, ${now})`,
    })
    .where(
      and(
        eq(workshops.id, workshopId),
        eq(workshops.clerkUserId, clerkUserId),
        or(isNull(workshops.tier), eq(workshops.tier, 'solo'), eq(workshops.tier, 'team'))
      )
    )
    .returning({ id: workshops.id });

  if (!updated) {
    console.error(
      `fulfillWhiteGlove: workshop ${workshopId} not in expected state for owner ${clerkUserId}.`
    );
    return { status: 'tier_conflict', message: `workshop ${workshopId} could not be upgraded to white_glove` };
  }

  await ensureTeamSession(workshopId, clerkUserId);

  return { status: 'fulfilled', sku: 'white_glove', creditQty: 0, workshopId };
}

