import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

/**
 * Credit Transactions table
 * Immutable ledger of all credit movements (purchases, consumptions, refunds).
 * stripeSessionId UNIQUE constraint enforces idempotent webhook fulfillment (BILL-04).
 * Financial records persist even if associated workshop is deleted (onDelete: 'set null').
 */
export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('ctx')),
    // Links to users via logical text match (same pattern as workshops.clerkUserId)
    clerkUserId: text('clerk_user_id').notNull(),
    type: text('type', {
      enum: ['purchase', 'consumption', 'refund'],
    })
      .notNull()
      .$type<'purchase' | 'consumption' | 'refund'>(),
    status: text('status', {
      enum: ['pending', 'completed', 'failed'],
    })
      .notNull()
      .default('pending')
      .$type<'pending' | 'completed' | 'failed'>(),
    // Signed integer: +N for purchase/refund, -N for consumption
    amount: integer('amount').notNull(),
    // Running balance after this transaction
    balanceAfter: integer('balance_after').notNull(),
    // Human-readable context for the transaction
    description: text('description').notNull(),
    // Nullable FK — consumption transactions have no workshop context (set null on workshop delete)
    workshopId: text('workshop_id').references(() => workshops.id, { onDelete: 'set null' }),
    // UNIQUE: enforces idempotent Stripe webhook fulfillment. NULL allowed for non-purchase transactions.
    stripeSessionId: text('stripe_session_id').unique(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Query user's full transaction history
    clerkUserIdIdx: index('credit_transactions_clerk_user_id_idx').on(table.clerkUserId),
    // Filter by transaction type
    typeIdx: index('credit_transactions_type_idx').on(table.type),
    // Find all transactions for a specific workshop
    workshopIdIdx: index('credit_transactions_workshop_id_idx').on(table.workshopId),
  })
);
