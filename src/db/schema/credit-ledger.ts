import { text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { v2 } from './pg-schema';
import { createPrefixedId } from '@/lib/ids';
import { users } from './users';

export const LEDGER_KINDS = [
  'purchase', // Stripe checkout completed
  'grant', // welcome credits, admin top-up, refund in kind
  'spend', // a paid AI job
  'refund', // a failed job gave credits back
  'adjustment', // admin correction
] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

/**
 * Append-only credit ledger. `delta` is positive for credits in, negative
 * for credits out; `balanceAfter` is the running balance so a statement is
 * one query. users.credit_balance is a cache of the latest balanceAfter.
 *
 * `reference` is what the row is for: a Stripe checkout session id for a
 * purchase, an ai_calls id for a spend. Unique per kind so a webhook replay
 * cannot double-credit.
 */
export const creditLedger = v2.table(
  'credit_ledger',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('led')),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: LEDGER_KINDS }).notNull(),
    delta: integer('delta').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    reference: text('reference'),
    description: text('description').notNull(),
    workshopId: text('workshop_id'),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    index('credit_ledger_user_idx').on(t.userId, t.createdAt),
    uniqueIndex('credit_ledger_reference_idx').on(t.kind, t.reference),
  ],
);

export type LedgerEntry = typeof creditLedger.$inferSelect;
