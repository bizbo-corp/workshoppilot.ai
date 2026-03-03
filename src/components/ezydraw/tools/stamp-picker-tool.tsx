'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetData } from '@/lib/asset-library/asset-library-types';

/** Simple SVG sanitizer — strips <script> tags and on* event attributes. */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
}

interface StampPickerToolProps {
  isOpen: boolean;
  onStampSelect: (asset: AssetData) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  /** When set, pre-filter by this tag and hide tag pills */
  fixedTag?: string;
  /** Custom tag pills to show (ignored when fixedTag is set) */
  tagOptions?: readonly string[];
  /** Placeholder text for search input */
  searchPlaceholder?: string;
}

function useStampAssets(isOpen: boolean, search: string, tag: string) {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tag && tag !== 'All') params.set('tag', tag.toLowerCase());
    params.set('pageSize', '100');

    fetch(`/api/assets/stamps?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setAssets(data.assets ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch stamps:', err);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [isOpen, search, tag]);

  return { assets, loading };
}

/**
 * Compute the anchor element's position relative to the nearest dialog content
 * (which has a CSS transform, making `fixed` act like `absolute`).
 */
function useAnchorPosition(anchorEl: HTMLElement | null, isOpen: boolean) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !anchorEl) { setPos(null); return; }

    const dialog = anchorEl.closest('[data-slot="dialog-content"]') as HTMLElement | null;

    if (!dialog) { setPos(null); return; }

    const buttonRect = anchorEl.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();

    setPos({
      top: buttonRect.bottom - dialogRect.top + 6,
      left: buttonRect.left - dialogRect.left + buttonRect.width / 2,
    });
  }, [isOpen, anchorEl]);

  return pos;
}

export function StampPickerTool({
  isOpen,
  onStampSelect,
  onClose,
  anchorEl,
  fixedTag,
  tagOptions,
  searchPlaceholder = 'Search stamps...',
}: StampPickerToolProps) {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string>('All');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setActiveTag('All');
      setDebouncedSearch('');
    }
  }, [isOpen]);

  const effectiveTag = fixedTag || activeTag;
  const { assets, loading } = useStampAssets(isOpen, debouncedSearch, effectiveTag);
  const anchorPos = useAnchorPosition(anchorEl, isOpen);

  const handleSelect = useCallback(
    (asset: AssetData) => {
      onStampSelect(asset);
    },
    [onStampSelect]
  );

  if (!isOpen || !anchorPos) return null;

  // Clamp so picker doesn't overflow dialog right edge
  const pickerWidth = 340;
  const clampedLeft = Math.max(anchorPos.left - pickerWidth / 2, 8);

  // Show tag pills only when there's no fixedTag
  const showTagPills = !fixedTag;
  const pills = tagOptions ?? ['All'];

  return (
    <>
      {/* Backdrop — covers dialog area, click to close, blocks canvas pointer events */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ background: 'transparent' }}
      />

      {/* Picker popup — positioned relative to dialog content (transform containing block) */}
      <div
        className="fixed z-50 w-[340px] max-w-[calc(100vw-1rem)] rounded-lg border bg-card shadow-xl"
        style={{ top: anchorPos.top, left: clampedLeft }}
      >
        {/* Header: search + close */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tag pills (hidden when fixedTag is set) */}
        {showTagPills && pills.length > 1 && (
          <div className="flex gap-1 overflow-x-auto px-3 py-2 scrollbar-none">
            {pills.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                  activeTag === tag
                    ? 'bg-olive-100 text-olive-700 dark:bg-olive-900/50 dark:text-olive-300'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Asset grid */}
        <div className="h-[260px] overflow-y-auto px-3 pb-3">
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No stamps found
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => handleSelect(asset)}
                  className="group flex items-center justify-center rounded-lg border border-border bg-white p-2 transition-all hover:border-primary/40 hover:shadow-md dark:bg-muted/20"
                  title={asset.name}
                >
                  {asset.mimeType === 'image/svg+xml' && asset.inlineSvg ? (
                    <div
                      className="[&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:h-auto"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeSvg(asset.inlineSvg),
                      }}
                    />
                  ) : (
                    <img
                      src={asset.blobUrl}
                      alt={asset.name}
                      className="max-h-full max-w-full object-contain"
                      crossOrigin="anonymous"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
