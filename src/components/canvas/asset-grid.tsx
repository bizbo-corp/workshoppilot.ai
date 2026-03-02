'use client';

import { Loader2 } from 'lucide-react';
import { AssetThumbnail } from './asset-thumbnail';
import type { AssetData } from '@/lib/asset-library/asset-library-types';

interface AssetGridProps {
  assets: AssetData[];
  isLoading: boolean;
  selectedId?: string;
  onSelect: (asset: AssetData) => void;
  showUsage?: boolean;
}

export function AssetGrid({ assets, isLoading, selectedId, onSelect, showUsage }: AssetGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No assets found. Upload one to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {assets.map((asset) => (
        <AssetThumbnail
          key={asset.id}
          asset={asset}
          selected={asset.id === selectedId}
          onClick={onSelect}
          showUsage={showUsage}
        />
      ))}
    </div>
  );
}
