import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('usr')),
    clerkUserId: text('clerk_user_id').notNull().unique(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    imageUrl: text('image_url'),
    company: text('company'),
    // Roles stored as JSON text array. Default: ["facilitator"]
    // Future-proofed for participant role
    roles: text('roles').notNull().default('["facilitator"]'),
    deletedAt: timestamp('deleted_at', { mode: 'date', precision: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    clerkUserIdIdx: index('users_clerk_user_id_idx').on(table.clerkUserId),
    emailIdx: index('users_email_idx').on(table.email),
  })
);
