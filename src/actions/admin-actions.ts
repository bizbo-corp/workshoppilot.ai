'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { users, workshops, creditTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createPrefixedId } from '@/lib/ids';
import { isAdmin } from '@/lib/auth/roles';
import { ensureTeamSession } from '@/lib/billing/ensure-team-session';

export type AdminGrantCreditsResult =
  | { status: 'success'; newBalance: number; targetEmail: string }
  | { status: 'error'; message: string };

export type AdminUpgradeWorkshopResult =
  | { status: 'success'; tier: 'team' | 'white_glove'; workshopId: string }
  | { status: 'error'; message: string };

/**
 * Two-layer admin auth: Clerk role first, ADMIN_EMAIL env fallback.
 * Returns the authenticated admin's clerkUserId on success, null otherwise.
 */
async function requireAdmin(): Promise<string | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  if (isAdmin(sessionClaims)) return userId;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  if (
    adminEmail &&
    userEmail &&
    userEmail.toLowerCase() === adminEmail.toLowerCase()
  ) {
    return userId;
  }
  return null;
}

export async function adminGrantCredits(opts: {
  email?: string;
  amount: number;
}): Promise<AdminGrantCreditsResult> {
  const adminClerkUserId = await requireAdmin();
  if (!adminClerkUserId) {
    return { status: 'error', message: 'Unauthorized' };
  }

  const amount = Math.floor(opts.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 50) {
    return { status: 'error', message: 'Amount must be between 1 and 50' };
  }

  let targetClerkUserId: string;
  let targetEmail: string;
  const emailInput = opts.email?.trim().toLowerCase();
  if (emailInput) {
    const target = await db.query.users.findFirst({
      where: eq(users.email, emailInput),
      columns: { clerkUserId: true, email: true },
    });
    if (!target) {
      return { status: 'error', message: `No user found for ${emailInput}` };
    }
    targetClerkUserId = target.clerkUserId;
    targetEmail = target.email;
  } else {
    const self = await db.query.users.findFirst({
      where: eq(users.clerkUserId, adminClerkUserId),
      columns: { email: true },
    });
    targetClerkUserId = adminClerkUserId;
    targetEmail = self?.email ?? '(self)';
  }

  const [inserted] = await db
    .insert(creditTransactions)
    .values({
      id: createPrefixedId('ctx'),
      clerkUserId: targetClerkUserId,
      type: 'purchase',
      status: 'completed',
      amount,
      balanceAfter: 0,
      description: 'Admin grant',
      sku: 'solo',
    })
    .returning({ id: creditTransactions.id });

  const [updatedUser] = await db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} + ${amount}` })
    .where(eq(users.clerkUserId, targetClerkUserId))
    .returning({ creditBalance: users.creditBalance });

  if (!updatedUser) {
    return {
      status: 'error',
      message: 'User row not found after grant — ledger row was written but balance bump failed',
    };
  }

  await db
    .update(creditTransactions)
    .set({ balanceAfter: updatedUser.creditBalance })
    .where(eq(creditTransactions.id, inserted.id));

  return {
    status: 'success',
    newBalance: updatedUser.creditBalance,
    targetEmail,
  };
}

export async function adminUpgradeWorkshopTier(opts: {
  workshopId: string;
  tier: 'team' | 'white_glove';
}): Promise<AdminUpgradeWorkshopResult> {
  const adminClerkUserId = await requireAdmin();
  if (!adminClerkUserId) {
    return { status: 'error', message: 'Unauthorized' };
  }

  const workshopId = opts.workshopId.trim();
  if (!workshopId) {
    return { status: 'error', message: 'Workshop ID required' };
  }
  if (opts.tier !== 'team' && opts.tier !== 'white_glove') {
    return { status: 'error', message: 'Invalid tier' };
  }

  const workshop = await db.query.workshops.findFirst({
    where: eq(workshops.id, workshopId),
    columns: { id: true, clerkUserId: true },
  });
  if (!workshop) {
    return { status: 'error', message: `Workshop ${workshopId} not found` };
  }

  await db.insert(creditTransactions).values({
    id: createPrefixedId('ctx'),
    clerkUserId: adminClerkUserId,
    type: 'purchase',
    status: 'completed',
    amount: 0,
    balanceAfter: 0,
    description: `Admin grant: ${opts.tier}`,
    workshopId,
    sku: opts.tier,
  });

  const now = new Date();
  await db
    .update(workshops)
    .set({
      tier: opts.tier,
      tierPaidAt: now,
      facilitatorMode: 'team',
      workshopType: 'multiplayer',
      maxParticipants: 15,
      creditConsumedAt: sql`COALESCE(${workshops.creditConsumedAt}, ${now})`,
    })
    .where(eq(workshops.id, workshopId));

  await ensureTeamSession(workshopId, workshop.clerkUserId);

  return { status: 'success', tier: opts.tier, workshopId };
}
