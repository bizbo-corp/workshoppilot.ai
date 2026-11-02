import { text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { v2 } from './pg-schema';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

export const REPORT_KINDS = ['summary', 'verdict', 'build_pack'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/**
 * Generated documents. `summary` is the free one-page wrap-up; `verdict` and
 * `build_pack` are paid with credits. `content` is structured (per kind, see
 * src/lib/reports) and `markdown` is the rendered version for download.
 */
export const reports = v2.table(
  'reports',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('rpt')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: REPORT_KINDS }).notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
    markdown: text('markdown'),
    /** Hash of the workshop state the report was built from, for cache hits. */
    stateHash: text('state_hash'),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index('reports_workshop_kind_idx').on(t.workshopId, t.kind)],
);

export type Report = typeof reports.$inferSelect;
