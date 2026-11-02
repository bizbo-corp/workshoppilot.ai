import { text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { v2 } from './pg-schema';
import { createPrefixedId } from '@/lib/ids';

/**
 * One row per signed-in person. Clerk owns authentication; this row owns
 * everything the product needs to know about them: credits, role, flags.
 * Sign-in is mandatory in 2.0, so there are no guest rows.
 */
export const users = v2.table(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('usr')),
    clerkUserId: text('clerk_user_id').notNull().unique(),
    email: text('email').notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    /** Cached balance; the credit_ledger is the source of truth. */
    creditBalance: integer('credit_balance').notNull().default(0),
    isAdmin: boolean('is_admin').notNull().default(false),
    /** Per-account cap on free-tier AI spend, in US cents, to limit abuse. */
    freeSpendCapCents: integer('free_spend_cap_cents').notNull().default(200),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date', precision: 3 }),
  },
  (t) => [index('users_email_idx').on(t.email)],
);

export type User = typeof users.$inferSelect;
