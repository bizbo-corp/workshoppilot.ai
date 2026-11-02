import { text, timestamp } from 'drizzle-orm/pg-core';
import { v2 } from './pg-schema';

/**
 * Stripe webhook idempotency. The event id is the primary key, so a replayed
 * event fails the insert and is skipped before any ledger write.
 */
export const stripeEvents = v2.table('stripe_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  processedAt: timestamp('processed_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
});
