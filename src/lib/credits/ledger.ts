import { and, eq, sql, gte } from 'drizzle-orm';
import { db } from '@/db/client';
import { creditLedger, users, type LedgerKind } from '@/db/schema';

/**
 * Credits. The ledger is append-only and users.credit_balance caches the
 * latest balance. Spending is a conditional UPDATE (balance >= amount), which
 * is atomic at the row level on Postgres, so two tabs cannot both spend the
 * last credits. neon-http has no interactive transactions, hence this shape.
 */

export class InsufficientCreditsError extends Error {
  constructor(public readonly needed: number, public readonly balance: number) {
    super(`Needs ${needed} credits, balance is ${balance}`);
    this.name = 'InsufficientCreditsError';
  }
}

export interface CreditChange {
  userId: string;
  amount: number; // positive credits
  kind: LedgerKind;
  description: string;
  /** Idempotency key: Stripe session id, ai_calls id, or any stable string. */
  reference?: string;
  workshopId?: string;
}

/** Credits in. Idempotent on (kind, reference): a replay returns the existing row. */
export async function addCredits(c: CreditChange) {
  if (c.amount <= 0) throw new Error('addCredits needs a positive amount');
  if (c.reference) {
    const existing = await db
      .select()
      .from(creditLedger)
      .where(and(eq(creditLedger.kind, c.kind), eq(creditLedger.reference, c.reference)))
      .limit(1);
    if (existing[0]) return { entry: existing[0], duplicate: true as const };
  }
  const [user] = await db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} + ${c.amount}`, updatedAt: new Date() })
    .where(eq(users.id, c.userId))
    .returning({ balance: users.creditBalance });
  if (!user) throw new Error(`User ${c.userId} not found`);
  const [entry] = await db
    .insert(creditLedger)
    .values({
      userId: c.userId,
      kind: c.kind,
      delta: c.amount,
      balanceAfter: user.balance,
      reference: c.reference ?? null,
      description: c.description,
      workshopId: c.workshopId ?? null,
    })
    .returning();
  return { entry, duplicate: false as const };
}

/**
 * Credits out. Fails with InsufficientCreditsError when the balance is short;
 * the conditional UPDATE guarantees the balance never goes negative.
 */
export async function spendCredits(c: CreditChange) {
  if (c.amount <= 0) throw new Error('spendCredits needs a positive amount');
  const [user] = await db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} - ${c.amount}`, updatedAt: new Date() })
    .where(and(eq(users.id, c.userId), gte(users.creditBalance, c.amount)))
    .returning({ balance: users.creditBalance });
  if (!user) {
    const [row] = await db.select({ balance: users.creditBalance }).from(users).where(eq(users.id, c.userId));
    throw new InsufficientCreditsError(c.amount, row?.balance ?? 0);
  }
  const [entry] = await db
    .insert(creditLedger)
    .values({
      userId: c.userId,
      kind: c.kind,
      delta: -c.amount,
      balanceAfter: user.balance,
      reference: c.reference ?? null,
      description: c.description,
      workshopId: c.workshopId ?? null,
    })
    .returning();
  return entry;
}

/** Give credits back after a paid job failed. */
export async function refundCredits(c: Omit<CreditChange, 'kind'>) {
  return addCredits({ ...c, kind: 'refund' });
}

export async function getBalance(userId: string): Promise<number> {
  const [row] = await db.select({ balance: users.creditBalance }).from(users).where(eq(users.id, userId));
  return row?.balance ?? 0;
}

/**
 * Run a paid job: charge first, refund on failure. `reference` should be
 * unique per attempt so a retry charges again only if the first was refunded.
 */
export async function withCredits<T>(c: CreditChange, run: () => Promise<T>): Promise<T> {
  if (c.amount === 0) return run();
  const entry = await spendCredits({ ...c, kind: 'spend' });
  try {
    return await run();
  } catch (err) {
    await refundCredits({
      userId: c.userId,
      amount: c.amount,
      description: `Refund: ${c.description}`,
      reference: `refund:${entry.id}`,
      workshopId: c.workshopId,
    });
    throw err;
  }
}
