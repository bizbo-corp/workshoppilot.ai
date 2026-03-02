'use client';

import { cn } from '@/lib/utils';
import type { AssetData } from '@/lib/asset-library/asset-library-types';

/** Simple SVG sanitizer — strips <script> tags and on* event attributes. */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
}

interface AssetThumbnailProps {
  asset: AssetData;
  selected?: boolean;
  onClick?: (asset: AssetData) => void;
  showUsage?: boolean;
}

export function AssetThumbnail({ asset, selected, onClick, showUsage = true }: AssetThumbnailProps) {
  const isSvg = asset.mimeType === 'image/svg+xml';

  return (
    <button
      type="button"
      onClick={() => onClick?.(asset)}
      className={cn(
        'group relative flex flex-col items-center rounded-lg border p-2 transition-all hover:shadow-md',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
          : 'border-border hover:border-primary/40',
      )}
    >
      {/* Preview */}
      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-md bg-muted/30">
        {isSvg && asset.inlineSvg ? (
          <div
            className="[&>svg]:max-h-14 [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(asset.inlineSvg) }}
          />
        ) : (
          <img
            src={asset.blobUrl}
            alt={asset.name}
            className="max-h-14 max-w-full object-contain"
          />
        )}
      </div>

      {/* Name */}
      <p className="mt-1.5 w-full truncate text-center text-[10px] font-medium text-muted-foreground">
        {asset.name}
      </p>

      {/* Usage badge */}
      {showUsage && asset.usageCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
          {asset.usageCount}
        </span>
      )}
    </button>
  );
}
