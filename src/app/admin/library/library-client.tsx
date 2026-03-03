'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Upload,
  Trash2,
  RefreshCw,
  LayoutGrid,
  Table,
  ArrowLeft,
  Loader2,
  Replace,
  Pencil,
  Check,
  Code,
  Tag,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AssetThumbnail } from '@/components/canvas/asset-thumbnail';
import { AssetUploadZone } from '@/components/canvas/asset-upload-zone';
import { useAssetLibrary } from '@/hooks/use-asset-library';
import type { AssetData, AssetCategory } from '@/lib/asset-library/asset-library-types';
import Link from 'next/link';

const CATEGORY_OPTIONS: { value: AssetCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'stamp', label: 'Stamps' },
  { value: 'sticker', label: 'Stickers' },
  { value: 'icon', label: 'Icons' },
  { value: 'illustration', label: 'Illustrations' },
  { value: 'background', label: 'Backgrounds' },
  { value: 'template', label: 'Templates' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABELS: Record<string, string> = {
  stamp: 'Stamp',
  sticker: 'Sticker',
  icon: 'Icon',
  illustration: 'Illustration',
  background: 'Background',
  template: 'Template',
  other: 'Other',
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryClient() {
  const {
    assets,
    total,
    isLoading,
    search,
    category,
    updateSearch,
    updateCategory,
    uploadAsset,
    deleteAsset,
    refetch,
  } = useAssetLibrary();

  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingAsset, setEditingAsset] = useState<AssetData | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState<AssetData | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Derive available tags from all fetched assets, then client-filter
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const asset of assets) {
      if (asset.tags) {
        for (const t of asset.tags.split(',')) {
          const trimmed = t.trim().toLowerCase();
          if (trimmed) tagSet.add(trimmed);
        }
      }
    }
    return Array.from(tagSet).sort();
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (!activeTag) return assets;
    return assets.filter((a) => {
      if (!a.tags) return false;
      const tags = a.tags.split(',').map((t) => t.trim().toLowerCase());
      return tags.includes(activeTag);
    });
  }, [assets, activeTag]);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<AssetCategory>('stamp');
  const [editTags, setEditTags] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSvgCode, setEditSvgCode] = useState('');
  const [showSvgEditor, setShowSvgEditor] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Replace state
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const openEditPanel = useCallback((asset: AssetData) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditCategory(asset.category);
    setEditTags(asset.tags || '');
    setEditDescription(asset.description || '');
    setEditSvgCode(asset.inlineSvg || '');
    setShowSvgEditor(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingAsset) return;
    setIsSavingEdit(true);
    try {
      const body: Record<string, unknown> = {
        name: editName,
        category: editCategory,
        tags: editTags || null,
        description: editDescription || null,
      };
      // Include inlineSvg if the SVG code was modified
      if (
        editingAsset.mimeType === 'image/svg+xml' &&
        editSvgCode !== (editingAsset.inlineSvg || '')
      ) {
        body.inlineSvg = editSvgCode || null;
      }
      await fetch(`/api/admin/assets/${editingAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      refetch();
      setEditingAsset(null);
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingAsset, editName, editCategory, editTags, editDescription, editSvgCode, refetch]);

  const handleDelete = useCallback(
    async (assetId: string) => {
      const result = await deleteAsset(assetId);
      if (result && typeof result === 'object' && 'error' in result) {
        alert(result.error);
      }
    },
    [deleteAsset]
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/assets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          assetIds: Array.from(selectedIds),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.skipped?.length > 0) {
          alert(`Deleted ${data.deleted}. Skipped ${data.skipped.length} (still in use).`);
        }
        setSelectedIds(new Set());
        refetch();
      }
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, refetch]);

  const handleBulkTag = useCallback(async (tags: string) => {
    if (selectedIds.size === 0 || !tags.trim()) return;
    setIsBulkTagging(true);
    try {
      const res = await fetch('/api/admin/assets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tag',
          assetIds: Array.from(selectedIds),
          tags,
        }),
      });
      if (res.ok) {
        setBulkTagInput('');
        setShowTagPopover(false);
        refetch();
      }
    } finally {
      setIsBulkTagging(false);
    }
  }, [selectedIds, refetch]);

  const handleAutoTag = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsAutoTagging(true);
    try {
      const res = await fetch('/api/admin/assets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-tag',
          assetIds: Array.from(selectedIds),
        }),
      });
      if (res.ok) {
        setShowTagPopover(false);
        refetch();
      }
    } finally {
      setIsAutoTagging(false);
    }
  }, [selectedIds, refetch]);

  const handleReplace = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !showReplaceDialog) return;
      setIsReplacing(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`/api/admin/assets/${showReplaceDialog.id}/replace`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          setShowReplaceDialog(null);
          refetch();
        }
      } finally {
        setIsReplacing(false);
        e.target.value = '';
      }
    },
    [showReplaceDialog, refetch]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const unusedSelected = filteredAssets.filter(
    (a) => selectedIds.has(a.id) && a.usageCount === 0
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Media Manager</h1>
              <p className="text-sm text-muted-foreground">
                {total} asset{total !== 1 ? 's' : ''} in library
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload
            </Button>
          </div>
        </div>

        {/* Toolbar: search + filters + view toggle */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => updateSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex gap-1">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => {
                    setActiveTag(null);
                    updateCategory(cat.value === 'all' ? undefined : cat.value);
                  }}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    (cat.value === 'all' && !category) || category === cat.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTagPopover((v) => !v)}
                  >
                    <Tag className="h-3.5 w-3.5 mr-1.5" />
                    Tag {selectedIds.size} selected
                  </Button>
                  {showTagPopover && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background p-3 shadow-lg">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Add tags (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={bulkTagInput}
                          onChange={(e) => setBulkTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleBulkTag(bulkTagInput);
                          }}
                          placeholder="e.g. ui, action, device"
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-1">
                          {['UI', 'sticker', 'stamp', 'icon', 'stick figure', 'action'].map((t) => (
                            <button
                              key={t}
                              onClick={() => handleBulkTag(t)}
                              disabled={isBulkTagging}
                              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleBulkTag(bulkTagInput)}
                            disabled={isBulkTagging || !bulkTagInput.trim()}
                          >
                            {isBulkTagging ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Apply Tags
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleAutoTag}
                            disabled={isAutoTagging}
                          >
                            {isAutoTagging ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Auto-Tag
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting || unusedSelected.length === 0}
                >
                  {isBulkDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Delete {unusedSelected.length} unused
                </Button>
              </>
            )}

            {/* View toggle */}
            <div className="flex rounded-md border border-border">
              <button
                onClick={() => setView('grid')}
                className={cn(
                  'rounded-l-md p-1.5 transition-colors',
                  view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView('table')}
                className={cn(
                  'rounded-r-md p-1.5 transition-colors',
                  view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <Table className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tag filter pills */}
        {availableTags.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTag(null)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  !activeTag
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                All tags
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                    activeTag === tag
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {tag}
                  <span className="ml-1 text-[9px] opacity-60">
                    {assets.filter((a) =>
                      a.tags
                        ?.split(',')
                        .map((t) => t.trim().toLowerCase())
                        .includes(tag)
                    ).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-muted-foreground">
              {activeTag
                ? `No assets tagged "${activeTag}".`
                : 'No assets found.'}
            </p>
            {activeTag ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setActiveTag(null)}
              >
                Clear tag filter
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowUploadDialog(true)}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload your first asset
              </Button>
            )}
          </div>
        ) : view === 'grid' ? (
          /* ─── Grid View ─── */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="group relative">
                <AssetThumbnail
                  asset={asset}
                  selected={selectedIds.has(asset.id)}
                  onClick={() => openEditPanel(asset)}
                />
                {/* Hover overlay actions */}
                <div className="absolute inset-0 flex items-end justify-center gap-1 rounded-lg bg-black/0 pb-8 opacity-0 transition-all group-hover:bg-black/5 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditPanel(asset);
                    }}
                    className="rounded-full bg-background p-1 shadow-sm hover:bg-muted"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReplaceDialog(asset);
                    }}
                    className="rounded-full bg-background p-1 shadow-sm hover:bg-muted"
                    title="Replace file"
                  >
                    <Replace className="h-3 w-3" />
                  </button>
                  {asset.usageCount === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(asset.id);
                      }}
                      className="rounded-full bg-background p-1 shadow-sm hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {/* Select checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(asset.id)}
                  onChange={() => toggleSelect(asset.id)}
                  className="absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded border-border opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ))}
          </div>
        ) : (
          /* ─── Table View (Optimization View) ─── */
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredAssets.map((a) => a.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      checked={
                        selectedIds.size === filteredAssets.length && filteredAssets.length > 0
                      }
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Size
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Usage
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Updated
                  </th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(asset.id)}
                        onChange={() => toggleSelect(asset.id)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => openEditPanel(asset)}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {asset.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {asset.mimeType.split('/')[1]?.toUpperCase() || asset.mimeType}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {CATEGORY_LABELS[asset.category] || asset.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {formatBytes(asset.fileSize)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          'font-medium',
                          asset.usageCount === 0 ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        {asset.usageCount}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground text-xs">
                      {new Date(asset.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditPanel(asset)}
                          className="rounded p-1 hover:bg-muted"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setShowReplaceDialog(asset)}
                          className="rounded p-1 hover:bg-muted"
                          title="Replace"
                        >
                          <Replace className="h-3 w-3" />
                        </button>
                        {asset.usageCount === 0 && (
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Assets</DialogTitle>
              <DialogDescription>
                Drag and drop files or click to browse. Supports SVG, PNG, JPG, WebP.
              </DialogDescription>
            </DialogHeader>
            <AssetUploadZone
              onUpload={async (file, meta) => {
                const result = await uploadAsset(file, meta);
                return result;
              }}
              category={category}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Replace Dialog */}
        <Dialog
          open={!!showReplaceDialog}
          onOpenChange={(open) => !open && setShowReplaceDialog(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Replace Asset File</DialogTitle>
              <DialogDescription>
                Upload a new version of &ldquo;{showReplaceDialog?.name}&rdquo;.
                {showReplaceDialog && showReplaceDialog.usageCount > 0 && (
                  <span className="mt-1 block font-medium text-foreground">
                    This will update {showReplaceDialog.usageCount} guide
                    {showReplaceDialog.usageCount !== 1 ? 's' : ''} that reference this asset.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <input
                ref={replaceFileRef}
                type="file"
                accept="image/svg+xml,image/png,image/jpeg,image/webp"
                onChange={handleReplace}
                className="hidden"
              />
              <Button
                onClick={() => replaceFileRef.current?.click()}
                disabled={isReplacing}
                className="w-full"
              >
                {isReplacing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isReplacing ? 'Replacing...' : 'Choose new file'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Detail Panel (Dialog) */}
        <Dialog
          open={!!editingAsset}
          onOpenChange={(open) => !open && setEditingAsset(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Asset</DialogTitle>
            </DialogHeader>
            {editingAsset && (
              <div className="space-y-4">
                {/* Preview */}
                <div className="flex justify-center rounded-lg border border-border bg-muted/30 p-4">
                  {editingAsset.mimeType === 'image/svg+xml' &&
                  (editSvgCode || editingAsset.inlineSvg) ? (
                    <div
                      className="[&>svg]:max-h-32 [&>svg]:max-w-full [&>svg]:h-auto"
                      dangerouslySetInnerHTML={{
                        __html: editSvgCode || editingAsset.inlineSvg || '',
                      }}
                    />
                  ) : (
                    <img
                      src={editingAsset.blobUrl}
                      alt={editingAsset.name}
                      className="max-h-32 max-w-full object-contain"
                    />
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) =>
                      setEditCategory(e.target.value as AssetCategory)
                    }
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    {CATEGORY_OPTIONS.filter((c) => c.value !== 'all').map(
                      (c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="arrow, blue, small"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm resize-y"
                  />
                </div>

                {/* SVG Code Editor */}
                {editingAsset.mimeType === 'image/svg+xml' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSvgEditor((v) => !v)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Code className="h-3.5 w-3.5" />
                      {showSvgEditor ? 'Hide SVG Code' : 'Edit SVG Code'}
                    </button>
                    {showSvgEditor && (
                      <textarea
                        value={editSvgCode}
                        onChange={(e) => setEditSvgCode(e.target.value)}
                        rows={12}
                        spellCheck={false}
                        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed resize-y"
                      />
                    )}
                  </div>
                )}

                {/* Meta info */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    Type: {editingAsset.mimeType.split('/')[1]?.toUpperCase()}
                  </span>
                  <span>Size: {formatBytes(editingAsset.fileSize)}</span>
                  <span>Used: {editingAsset.usageCount}x</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingAsset(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
