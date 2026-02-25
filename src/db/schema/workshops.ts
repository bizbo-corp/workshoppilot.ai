import { pgTable, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

/**
 * Workshops table
 * Core entity representing a design thinking workshop session
 */
export const workshops = pgTable(
  'workshops',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('ws')),
    clerkUserId: text('clerk_user_id').notNull(),
    title: text('title').notNull(),
    originalIdea: text('original_idea').notNull(),
    status: text('status', {
      enum: ['draft', 'active', 'paused', 'completed'],
    })
      .notNull()
      .default('draft')
      .$type<'draft' | 'active' | 'paused' | 'completed'>(),
    orgId: text('org_id'),
    templateId: text('template_id'),
    visibility: text('visibility', {
      enum: ['private', 'shared'],
    })
      .notNull()
      .default('private')
      .$type<'private' | 'shared'>(),
    shareToken: text('share_token'),
    color: text('color'),
    emoji: text('emoji'),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { mode: 'date', precision: 3 }),
    // Credit tracking (v1.8) — marks when a credit was consumed for this workshop
    creditConsumedAt: timestamp('credit_consumed_at', { mode: 'date', precision: 3 }),
  },
  (table) => ({
    clerkUserIdIdx: index('workshops_clerk_user_id_idx').on(table.clerkUserId),
    statusIdx: index('workshops_status_idx').on(table.status),
    orgIdIdx: index('workshops_org_id_idx').on(table.orgId),
  })
);

/**
 * Workshop Members table
 * Tracks users associated with a workshop and their roles
 */
export const workshopMembers = pgTable(
  'workshop_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('wm')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    clerkUserId: text('clerk_user_id').notNull(),
    role: text('role').notNull(), // Extensible: 'owner', 'editor', 'viewer'
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workshopIdIdx: index('workshop_members_workshop_id_idx').on(table.workshopId),
    clerkUserIdIdx: index('workshop_members_clerk_user_id_idx').on(table.clerkUserId),
    workshopUserUnique: unique('workshop_members_workshop_user_unique').on(
      table.workshopId,
      table.clerkUserId
    ),
  })
);
