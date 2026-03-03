/**
 * Shared asset library types used by both client and server.
 */

export type AssetCategory =
  | 'stamp'
  | 'sticker'
  | 'icon'
  | 'illustration'
  | 'background'
  | 'template'
  | 'other';

export interface AssetData {
  id: string;
  name: string;
  description?: string | null;
  blobUrl: string;
  inlineSvg?: string | null;
  mimeType: string;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  category: AssetCategory;
  tags?: string | null;
  usageCount: number;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetFilters {
  search?: string;
  category?: AssetCategory;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface AssetListResult {
  assets: AssetData[];
  total: number;
  page: number;
  pageSize: number;
}
