'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetData, AssetCategory } from '@/lib/asset-library/asset-library-types';

interface AssetUploadZoneProps {
  onUpload: (file: File, metadata?: { category?: AssetCategory }) => Promise<AssetData | null>;
  category?: AssetCategory;
  compact?: boolean;
}

export function AssetUploadZone({ onUpload, category, compact }: AssetUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      setIsUploading(true);
      try {
        for (const file of fileArr) {
          await onUpload(file, { category });
        }
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, category]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(e.target.files);
      e.target.value = '';
    },
    [handleFiles]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        'cursor-pointer rounded-lg border-2 border-dashed transition-colors',
        'flex flex-col items-center justify-center text-center',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/40 hover:bg-muted/30',
        compact ? 'p-3' : 'p-6',
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
      {isUploading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Upload className={cn('text-muted-foreground', compact ? 'h-4 w-4' : 'h-6 w-6')} />
          <p className={cn('mt-1 text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
            {compact ? 'Drop or click to upload' : 'Drag & drop files or click to browse'}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/60">
            SVG, PNG, JPG, WebP
          </p>
        </>
      )}
    </div>
  );
}
