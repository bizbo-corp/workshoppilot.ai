import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';

/**
 * Asset Library table
 * Centralized storage for reusable image assets (SVGs, PNGs, etc.) used by canvas guides.
 * Guides reference assets by libraryAssetId — replacing an asset's file propagates everywhere.
 */
export const assetLibrary = pgTable(
  'asset_library',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('ast')),
    name: text('name').notNull(),
    description: text('description'),
    blobUrl: text('blob_url').notNull(),
    inlineSvg: text('inline_svg'),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size'),
    width: integer('width'),
    height: integer('height'),
    category: text('category', {
      enum: ['stamp', 'sticker', 'icon', 'illustration', 'background', 'template', 'other'],
    })
      .notNull()
      .default('stamp')
      .$type<'stamp' | 'sticker' | 'icon' | 'illustration' | 'background' | 'template' | 'other'>(),
    tags: text('tags'),
    usageCount: integer('usage_count').notNull().default(0),
    uploadedBy: text('uploaded_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('asset_library_category_idx').on(table.category),
    index('asset_library_name_idx').on(table.name),
    index('asset_library_created_at_idx').on(table.createdAt),
  ]
);
