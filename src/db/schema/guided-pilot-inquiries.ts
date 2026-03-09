import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

/**
 * Guided Pilot Inquiries table
 * Tracks high-ticket guided workshop intake submissions.
 * Visitors may not be signed in, so clerkUserId is nullable.
 */
export const guidedPilotInquiries = pgTable(
  'guided_pilot_inquiries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('gpi')),
    clerkUserId: text('clerk_user_id'),
    email: text('email').notNull(),
    name: text('name').notNull(),
    workshopGoal: text('workshop_goal', {
      enum: ['mvp', 'pivot', 'corporate-innovation', 'product-market-fit', 'other'],
    })
      .notNull()
      .$type<'mvp' | 'pivot' | 'corporate-innovation' | 'product-market-fit' | 'other'>(),
    stakeholderCount: text('stakeholder_count', {
      enum: ['1-2', '3-5', '6-10', '10+'],
    })
      .notNull()
      .$type<'1-2' | '3-5' | '6-10' | '10+'>(),
    timeline: text('timeline', {
      enum: ['1-week', '2-4-weeks', '1-2-months', 'flexible'],
    })
      .notNull()
      .$type<'1-week' | '2-4-weeks' | '1-2-months' | 'flexible'>(),
    notes: text('notes'),
    depositPaid: boolean('deposit_paid').notNull().default(false),
    stripeSessionId: text('stripe_session_id'),
    status: text('status', {
      enum: ['new', 'contacted', 'scheduled', 'completed', 'cancelled'],
    })
      .notNull()
      .default('new')
      .$type<'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled'>(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: index('guided_pilot_inquiries_email_idx').on(table.email),
    statusIdx: index('guided_pilot_inquiries_status_idx').on(table.status),
  })
);
