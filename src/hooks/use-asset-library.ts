'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  AssetData,
  AssetCategory,
  AssetListResult,
} from '@/lib/asset-library/asset-library-types';

/**
 * Client hook for asset library — fetch, search, upload, delete assets via API.
 */
export function useAssetLibrary(initialCategory?: AssetCategory) {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory | undefined>(initialCategory);

  const fetchAssets = useCallback(
    async (opts?: { search?: string; category?: AssetCategory; page?: number }) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        const s = opts?.search ?? search;
        const c = opts?.category ?? category;
        const p = opts?.page ?? page;

        if (s) params.set('search', s);
        if (c) params.set('category', c);
        params.set('page', String(p));
        params.set('pageSize', '50');

        const res = await fetch(`/api/admin/assets?${params}`);
        if (res.ok) {
          const data: AssetListResult = await res.json();
          setAssets(data.assets);
          setTotal(data.total);
        }
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [search, category, page]
  );

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const uploadAsset = useCallback(
    async (file: File, metadata?: { name?: string; category?: AssetCategory; tags?: string; description?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (metadata?.name) formData.append('name', metadata.name);
      if (metadata?.category) formData.append('category', metadata.category);
      if (metadata?.tags) formData.append('tags', metadata.tags);
      if (metadata?.description) formData.append('description', metadata.description);

      try {
        const res = await fetch('/api/admin/assets', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const asset: AssetData = await res.json();
          setAssets((prev) => [asset, ...prev]);
          setTotal((prev) => prev + 1);
          return asset;
        }
      } catch (err) {
        console.error('Failed to upload asset:', err);
      }
      return null;
    },
    []
  );

  const deleteAsset = useCallback(async (assetId: string) => {
    try {
      const res = await fetch(`/api/admin/assets/${assetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
        setTotal((prev) => prev - 1);
        return true;
      }
      const data = await res.json();
      return { error: data.error };
    } catch (err) {
      console.error('Failed to delete asset:', err);
      return false;
    }
  }, []);

  const updateSearch = useCallback(
    (newSearch: string) => {
      setSearch(newSearch);
      setPage(1);
      fetchAssets({ search: newSearch, page: 1 });
    },
    [fetchAssets]
  );

  const updateCategory = useCallback(
    (newCategory?: AssetCategory) => {
      setCategory(newCategory);
      setPage(1);
      fetchAssets({ category: newCategory, page: 1 });
    },
    [fetchAssets]
  );

  return {
    assets,
    total,
    isLoading,
    page,
    search,
    category,
    setPage,
    updateSearch,
    updateCategory,
    uploadAsset,
    deleteAsset,
    refetch: () => fetchAssets(),
  };
}
