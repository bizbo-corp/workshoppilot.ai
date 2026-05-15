import { pgTable, text, integer, timestamp, index, unique } from 'drizzle-orm/pg-core';
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
    // Multiplayer support (v1.9) — set at creation time, not upgradeable
    workshopType: text('workshop_type', {
      enum: ['solo', 'multiplayer'],
    })
      .notNull()
      .default('solo')
      .$type<'solo' | 'multiplayer'>(),
    maxParticipants: integer('max_participants'), // null for solo (no limit applies)
    // Last time the facilitator opened this workshop
    lastVisitedAt: timestamp('last_visited_at', { mode: 'date', precision: 3 }),
    // Facilitator-led team flow (v2.1) — distinct from workshopType.
    // 'team' = creator confirms facilitator role, completes Step 1, then invites participants.
    // 'solo' = legacy single-user flow (also used for multiplayer workshops created before v2.1).
    facilitatorMode: text('facilitator_mode', {
      enum: ['solo', 'team'],
    })
      .notNull()
      .default('solo')
      .$type<'solo' | 'team'>(),
    // Stamped when facilitator publishes the challenge and invites go out.
    challengePublishedAt: timestamp('challenge_published_at', { mode: 'date', precision: 3 }),
    // Bumped each time the facilitator republishes after a change request — invalidates approvals.
    challengeRevision: integer('challenge_revision').notNull().default(1),
    // v2.2 — Workshop scheduling (team mode only). Set when facilitator picks "Schedule for later"
    // in the Setup Workshop wizard. Null for "Start now" workshops.
    scheduledStartAt: timestamp('scheduled_start_at', { mode: 'date', precision: 3 }),
    scheduledDurationMinutes: integer('scheduled_duration_minutes'), // 60 / 90 / 120
    scheduledTimezone: text('scheduled_timezone'), // IANA TZ, e.g. 'America/Los_Angeles'
    // v2.2 — Stamped when the facilitator actually kicks off the workshop (either "Start now"
    // immediately or clicks Start from the lobby). Drives lobby gating + late-joiner routing.
    workshopStartedAt: timestamp('workshop_started_at', { mode: 'date', precision: 3 }),
    // v2.3 — Pricing tier purchased for this workshop. Null = still in free trial (Steps 1-6).
    // Set at fulfillment time. 'solo' may also be set retroactively for grandfathered workshops.
    tier: text('tier', {
      enum: ['solo', 'team', 'white_glove'],
    }).$type<'solo' | 'team' | 'white_glove' | null>(),
    // v2.3 — When the tier purchase completed. Null for grandfathered workshops where the tier
    // was backfilled without a corresponding purchase.
    tierPaidAt: timestamp('tier_paid_at', { mode: 'date', precision: 3 }),
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
