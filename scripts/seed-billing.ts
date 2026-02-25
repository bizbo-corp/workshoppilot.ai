/**
 * CLI Seed Script for Billing Development Data
 *
 * Creates seed users with various billing states for testing payment flows,
 * credit enforcement, paywall UI, and onboarding in Phases 48-53.
 *
 * Idempotent: checks for existing seed data before inserting. Safe to re-run.
 *
 * Usage:
 *   npm run db:seed:billing
 *
 * Requires: DATABASE_URL in .env.local
 */

import { db } from '../src/db/client';
import { users, workshops, creditTransactions } from '../src/db/schema';
import { createPrefixedId } from '../src/lib/ids';
import { eq } from 'drizzle-orm';

// ── Idempotency Check ──────────────────────────────────────────────
async function isSeedDataPresent(): Promise<boolean> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, 'user_seed_billing_zero'))
    .limit(1);
  return existing.length > 0;
}

// ── Scenario 1: Zero credits, new user (pre-purchase) ─────────────
async function seedZeroCreditsUser(): Promise<void> {
  console.log('  Creating Scenario 1: Zero credits, new user (pre-purchase)...');
  await db
    .insert(users)
    .values({
      id: createPrefixedId('usr'),
      clerkUserId: 'user_seed_billing_zero',
      email: 'billing-zero@seed.test',
      creditBalance: 0,
      onboardingComplete: false,
      planTier: 'free',
    })
    .onConflictDoNothing();
  console.log('  ✓ Scenario 1 created: user_seed_billing_zero (0 credits, no transactions)');
}

// ── Scenario 2: User with credits (post-purchase, pre-workshop) ────
async function seedFundedUser(): Promise<void> {
  console.log('  Creating Scenario 2: Funded user (post-purchase, pre-workshop)...');
  await db
    .insert(users)
    .values({
      id: createPrefixedId('usr'),
      clerkUserId: 'user_seed_billing_funded',
      email: 'billing-funded@seed.test',
      creditBalance: 3,
      onboardingComplete: true,
      planTier: 'free',
    })
    .onConflictDoNothing();

  await db
    .insert(creditTransactions)
    .values({
      id: createPrefixedId('ctx'),
      clerkUserId: 'user_seed_billing_funded',
      type: 'purchase',
      status: 'completed',
      amount: 3,
      balanceAfter: 3,
      description: 'Purchased Serial Entrepreneur pack',
      workshopId: null,
      stripeSessionId: 'cs_seed_funded_001',
    })
    .onConflictDoNothing();
  console.log('  ✓ Scenario 2 created: user_seed_billing_funded (3 credits, 1 purchase transaction)');
}

// ── Scenario 3: Active user with transaction history ───────────────
async function seedActiveUser(): Promise<void> {
  console.log('  Creating Scenario 3: Active user with transaction history...');

  // Create the user
  await db
    .insert(users)
    .values({
      id: createPrefixedId('usr'),
      clerkUserId: 'user_seed_billing_active',
      email: 'billing-active@seed.test',
      creditBalance: 1,
      onboardingComplete: true,
      planTier: 'free',
    })
    .onConflictDoNothing();

  // Create workshop (credit already consumed)
  const workshopId = createPrefixedId('ws');
  const creditConsumedDate = new Date('2026-01-15T10:00:00Z');

  await db
    .insert(workshops)
    .values({
      id: workshopId,
      clerkUserId: 'user_seed_billing_active',
      title: 'Seed: Active Workshop',
      originalIdea: 'Testing credit flow',
      status: 'active',
      creditConsumedAt: creditConsumedDate,
    })
    .onConflictDoNothing();

  // Create transactions in chronological order with explicit timestamps
  const tx1Date = new Date('2026-01-10T09:00:00Z');
  const tx2Date = new Date('2026-01-15T10:05:00Z');
  const tx3Date = new Date('2026-01-20T14:00:00Z');
  const tx4Date = new Date('2026-01-25T11:00:00Z');
  const tx5Date = new Date('2026-01-28T16:00:00Z');

  await db.insert(creditTransactions).values([
    {
      id: createPrefixedId('ctx'),
      clerkUserId: 'user_seed_billing_active',
      type: 'purchase',
      status: 'completed',
      amount: 1,
      balanceAfter: 1,
      description: 'Purchased Single Flight',
      workshopId: null,
      stripeSessionId: 'cs_seed_active_001',
      createdAt: tx1Date,
    },
    {
      id: createPrefixedId('ctx'),
      clerkUserId: 'user_seed_billing_active',
      type: 'consumption',
      status: 'completed',
      amount: -1,
      balanceAfter: 0,
      description: 'Credit consumed for Workshop: Active Workshop',
      workshopId: workshopId,
      stripeSessionId: null,
      createdAt: tx2Date,
    },
    {
      id: createPrefixedId('ctx'),
      clerkUserId: 'user_seed_billing_active',
      type: 'purchase',
      status: 'completed',
      amount: 3,
      balanceAfter: 3,
      description: 'Purchased Serial Entrepreneur pack',
      workshopId: null,
      stripeSessionId: 'cs_seed_active_002',
      createdAt: tx3Date,
    },
    {
      id: createPrefixedId('ctx'),
      clerkUserId: 'user_seed_billing_active',
      type: 'consumption',
      status: 'completed',
      amount: -1,
      balanceAfter: 2,
      description: 'Credit consumed for another workshop',
      workshopId: null,
      stripeSessionId: null,
      createdAt: tx4Date,
    },
    {
      id: createPrefixedId('ctx'),
      clerkUserId: 'user_seed_billing_active',
      type: 'consumption',
      status: 'completed',
      amount: -1,
      balanceAfter: 1,
      description: 'Credit consumed for yet another workshop',
      workshopId: null,
      stripeSessionId: null,
      createdAt: tx5Date,
    },
  ]);

  console.log('  ✓ Scenario 3 created: user_seed_billing_active (1 credit, 1 workshop, 5 transactions)');
}

// ── Scenario 4: User with refund ───────────────────────────────────
async function seedRefundUser(): Promise<void> {
  console.log('  Creating Scenario 4: User with refund...');

  await db
    .insert(users)
    .values({
      id: createPrefixedId('usr'),
      clerkUserId: 'user_seed_billing_refund',
      email: 'billing-refund@seed.test',
      creditBalance: 0,
      onboardingComplete: true,
      planTier: 'free',
    })
    .onConflictDoNothing();

  const tx1Date = new Date('2026-02-01T10:00:00Z');
  const tx2Date = new Date('2026-02-02T14:00:00Z');

  await db.insert(creditTransactions).values([
    {
      id: createPrefixedId('ctx'),
      clerkUserId: 'user_seed_billing_refund',
      type: 'purchase',
      status: 'completed',
      amount: 1,
      balanceAfter: 1,
      description: 'Purchased Single Flight',
      workshopId: null,
      stripeSessionId: 'cs_seed_refund_001',
      createdAt: tx1Date,
    },
    {
      id: createPrefixedId('ctx'),
      clerkUserId: 'user_seed_billing_refund',
      type: 'refund',
      status: 'completed',
      amount: -1,
      balanceAfter: 0,
      description: 'Refund for Single Flight',
      workshopId: null,
      stripeSessionId: 'cs_seed_refund_002',
      createdAt: tx2Date,
    },
  ]);

  console.log('  ✓ Scenario 4 created: user_seed_billing_refund (0 credits, purchase + refund)');
}

// ── Scenario 5: Pending transaction (Stripe session created, webhook pending) ─
async function seedPendingUser(): Promise<void> {
  console.log('  Creating Scenario 5: Pending transaction (Stripe webhook not yet received)...');

  await db
    .insert(users)
    .values({
      id: createPrefixedId('usr'),
      clerkUserId: 'user_seed_billing_pending',
      email: 'billing-pending@seed.test',
      creditBalance: 0,
      onboardingComplete: true,
      planTier: 'free',
    })
    .onConflictDoNothing();

  await db
    .insert(creditTransactions)
    .values({
      id: createPrefixedId('ctx'),
      clerkUserId: 'user_seed_billing_pending',
      type: 'purchase',
      status: 'pending',
      amount: 1,
      balanceAfter: 1,
      description: 'Purchased Single Flight (pending fulfillment)',
      workshopId: null,
      stripeSessionId: 'cs_seed_pending_001',
    })
    .onConflictDoNothing();

  console.log('  ✓ Scenario 5 created: user_seed_billing_pending (0 credits, 1 pending purchase)');
}

// ── Main ───────────────────────────────────────────────────────────
async function seedBilling(): Promise<void> {
  console.log('\n🌱 Seeding billing development data...\n');

  // Idempotency check
  const alreadySeeded = await isSeedDataPresent();
  if (alreadySeeded) {
    console.log('Billing seed data already exists. Skipping.');
    console.log('  (Delete users with clerkUserId starting with "user_seed_billing_" to re-seed)\n');
    process.exit(0);
  }

  try {
    await seedZeroCreditsUser();
    await seedFundedUser();
    await seedActiveUser();
    await seedRefundUser();
    await seedPendingUser();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Billing seed data created successfully!\n');
    console.log('   Scenarios created:');
    console.log('   1. user_seed_billing_zero    — 0 credits, no onboarding (paywall testing)');
    console.log('   2. user_seed_billing_funded  — 3 credits, no workshops (credit consumption testing)');
    console.log('   3. user_seed_billing_active  — 1 credit, 1 workshop, 5 transactions (ledger testing)');
    console.log('   4. user_seed_billing_refund  — 0 credits, purchase + refund (refund flow testing)');
    console.log('   5. user_seed_billing_pending — 0 credits, 1 pending purchase (async Stripe testing)');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding billing data:', error);
    process.exit(1);
  }
}

// ── Run ────────────────────────────────────────────────────────────
seedBilling();
