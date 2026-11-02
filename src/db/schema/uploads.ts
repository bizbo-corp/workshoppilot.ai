import { text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { v2 } from './pg-schema';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';
import { users } from './users';

export const UPLOAD_KINDS = ['sketch', 'photo', 'ai_image', 'ai_cleanup'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

/**
 * Files on Vercel Blob. Manual drawing uploads are free; `ai_cleanup` rows
 * are the paid clean-up of a `sketch`, linked by `sourceId`.
 */
export const uploads = v2.table(
  'uploads',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('upl')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: UPLOAD_KINDS }).notNull(),
    url: text('url').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes'),
    width: integer('width'),
    height: integer('height'),
    sourceId: text('source_id'),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index('uploads_workshop_idx').on(t.workshopId)],
);

export type Upload = typeof uploads.$inferSelect;
