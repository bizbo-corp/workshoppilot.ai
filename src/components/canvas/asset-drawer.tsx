'use client';

import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { AssetGrid } from './asset-grid';
import { AssetUploadZone } from './asset-upload-zone';
import { useAssetLibrary } from '@/hooks/use-asset-library';
import type { AssetData, AssetCategory } from '@/lib/asset-library/asset-library-types';

const CATEGORY_OPTIONS: { value: AssetCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sticker', label: 'Stickers' },
  { value: 'icon', label: 'Icons' },
  { value: 'illustration', label: 'Illustrations' },
  { value: 'background', label: 'Backgrounds' },
  { value: 'template', label: 'Templates' },
  { value: 'other', label: 'Other' },
];

interface AssetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when an asset is selected (e.g. to place on canvas or link to a guide) */
  onSelectAsset?: (asset: AssetData) => void;
  /** Selection mode label (e.g. "Select to swap") */
  selectionLabel?: string;
}

export function AssetDrawer({ open, onOpenChange, onSelectAsset, selectionLabel }: AssetDrawerProps) {
  const {
    assets,
    isLoading,
    search,
    category,
    updateSearch,
    updateCategory,
    uploadAsset,
  } = useAssetLibrary();

  const [selectedId, setSelectedId] = useState<string | undefined>();

  const handleSelect = useCallback(
    (asset: AssetData) => {
      if (onSelectAsset) {
        onSelectAsset(asset);
        return;
      }
      setSelectedId((prev) => (prev === asset.id ? undefined : asset.id));
    },
    [onSelectAsset]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm font-semibold">
            {selectionLabel || 'Asset Library'}
          </SheetTitle>
        </SheetHeader>

        {/* Search bar */}
        <div className="border-b px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-8 text-xs"
            />
            {search && (
              <button
                onClick={() => updateSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-1 overflow-x-auto border-b px-4 py-2">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => updateCategory(cat.value === 'all' ? undefined : cat.value)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                (cat.value === 'all' && !category) || category === cat.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Asset grid */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <AssetGrid
            assets={assets}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>

        {/* Upload zone */}
        <div className="border-t px-4 py-3">
          <AssetUploadZone onUpload={uploadAsset} category={category} compact />
        </div>
      </SheetContent>
    </Sheet>
  );
}
