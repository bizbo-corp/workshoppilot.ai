import { text, integer, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { v2 } from './pg-schema';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

export const EVENT_ACTORS = ['user', 'ai', 'system'] as const;
export type EventActor = (typeof EVENT_ACTORS)[number];

/**
 * The event log: every chat message, every board change, every AI tool call
 * and every stage transition, in order. The engine folds these into
 * workshops.state; the AI's context is built from the same log, so chat and
 * canvas share one history.
 *
 * `seq` is per workshop and gap-free; the unique index makes concurrent
 * writers collide instead of interleaving silently.
 */
export const workshopEvents = v2.table(
  'workshop_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('evt')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    actor: text('actor', { enum: EVENT_ACTORS }).notNull(),
    /** users.id for user events, the AI job name for ai events, null for system. */
    actorId: text('actor_id'),
    /** Event type, e.g. 'chat.user', 'chat.ai', 'board.item_added', 'stage.completed'. */
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('workshop_events_seq_idx').on(t.workshopId, t.seq),
    index('workshop_events_type_idx').on(t.workshopId, t.type),
  ],
);

export type WorkshopEvent = typeof workshopEvents.$inferSelect;
export type NewWorkshopEvent = typeof workshopEvents.$inferInsert;
