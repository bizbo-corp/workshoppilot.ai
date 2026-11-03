import { text, integer, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { v2 } from './pg-schema';
import { createPrefixedId } from '@/lib/ids';
import { users } from './users';

import { STAGE_IDS, IDEA_TYPES, type StageId, type IdeaType } from '@/lib/engine/ids';
export { STAGE_IDS, IDEA_TYPES, type StageId, type IdeaType };

export const WORKSHOP_STATUSES = ['active', 'completed', 'archived'] as const;
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];

/**
 * A workshop is one idea going through Setup and the four stages.
 *
 * `state` is a projection rebuilt from workshop_events by the engine
 * (src/lib/engine). It is stored so reads are one query, but the event log
 * is the truth; `stateSeq` records the last event folded in.
 */
export const workshops = v2.table(
  'workshops',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('wks')),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** The one-sentence idea the user typed to start. */
    idea: text('idea').notNull(),
    ideaType: text('idea_type', { enum: IDEA_TYPES }),
    stage: text('stage', { enum: STAGE_IDS }).notNull().default('setup'),
    status: text('status', { enum: WORKSHOP_STATUSES }).notNull().default('active'),
    state: jsonb('state').$type<Record<string, unknown>>().notNull().default({}),
    stateSeq: integer('state_seq').notNull().default(0),
    /** Set when a seeded test run created this workshop; hidden from dashboards. */
    testRunId: text('test_run_id'),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date', precision: 3 }),
    deletedAt: timestamp('deleted_at', { mode: 'date', precision: 3 }),
  },
  (t) => [
    index('workshops_owner_idx').on(t.ownerId),
    index('workshops_status_idx').on(t.status),
  ],
);

export const MEMBER_ROLES = ['owner', 'facilitator', 'participant'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/**
 * Who can open a workshop. One row per person per workshop, enforced by the
 * unique index, so duplicate identities in a session cannot exist. Solo
 * workshops have one row (the owner); the V2 teams tier adds more.
 */
export const workshopMembers = v2.table(
  'workshop_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('wmb')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: MEMBER_ROLES }).notNull().default('participant'),
    joinedAt: timestamp('joined_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('workshop_members_unique_idx').on(t.workshopId, t.userId),
    index('workshop_members_user_idx').on(t.userId),
  ],
);

export type Workshop = typeof workshops.$inferSelect;
export type WorkshopMember = typeof workshopMembers.$inferSelect;
