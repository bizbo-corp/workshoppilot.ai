'use client';

import { useCallback } from 'react';
import { X, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';

import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';
import type { AssetData } from '@/lib/asset-library/asset-library-types';

// Position → Tailwind class map (for pinned guides)
const POSITION_CLASSES: Record<string, string> = {
  'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'top-left': 'top-6 left-6',
  'top-center': 'top-6 left-1/2 -translate-x-1/2',
  'top-right': 'top-6 right-6',
  'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
};


interface CanvasGuideProps {
  guide: CanvasGuideData;
  onDismiss: (id: string) => void;
  isExiting: boolean;
  isAdminEditing?: boolean;
  onEdit?: (guide: CanvasGuideData, position: { x: number; y: number }) => void;
  /** Linked library asset data for rendering */
  linkedAsset?: AssetData | null;
}

/** Simple SVG sanitizer — strips <script> tags and on* event attributes. */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
}

export function CanvasGuide({ guide, onDismiss, isExiting, isAdminEditing, onEdit, linkedAsset: linkedAssetProp }: CanvasGuideProps) {
  // New variants (template-sticky-note, frame, arrow) are always on-canvas nodes — never pinned
  if (['template-sticky-note', 'frame', 'arrow'].includes(guide.variant)) {
    return null;
  }
  const handleDismiss = useCallback(() => {
    onDismiss(guide.id);
  }, [onDismiss, guide.id]);

  const isImage = guide.variant === 'image';
  const isCard = guide.variant === 'card';
  const hasColor = !!guide.color;
  // Prefer explicit prop, fall back to server-joined data on the guide
  const asset = linkedAssetProp ?? guide.linkedAsset;

  const positionClass = POSITION_CLASSES[guide.pinnedPosition as string] || POSITION_CLASSES.center;

  return (
    <div
      className={cn(
        'absolute pointer-events-auto max-w-xs group/guide',
        positionClass,
        // Entry/exit animations
        isExiting
          ? 'animate-out fade-out-0 zoom-out-95 duration-200 fill-mode-forwards'
          : 'animate-in fade-in-0 zoom-in-95 duration-300',
        // Card variant — semi-transparent with backdrop blur
        isCard && 'rounded-xl px-4 py-3 backdrop-blur-sm',
        isCard && !hasColor && [
          'bg-olive-100/70 dark:bg-olive-900/70',
          'text-foreground',
          'shadow-sm',
        ],
        isCard && hasColor && 'shadow-sm text-foreground',
        // Image variant: transparent, no bg/border/shadow
        isImage && 'p-0',
      )}
      style={(isCard && hasColor) ? {
        backgroundColor: `${guide.color}cc`,
      } : undefined}
    >
      {/* Admin edit button — shown when guide editing is active */}
      {isAdminEditing && onEdit && (
        <button
          onClick={(e) => onEdit(guide, { x: e.clientX, y: e.clientY })}
          className={cn(
            'absolute -top-2 -left-2 rounded-full p-1',
            'bg-olive-600 text-white hover:bg-olive-700',
            'shadow-md transition-transform hover:scale-110',
            'z-10',
          )}
          aria-label="Edit guide"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}

      {/* Hover-X dismiss button */}
      {guide.dismissBehavior === 'hover-x' && (
        <button
          onClick={handleDismiss}
          className={cn(
            'absolute -top-2 -right-2 rounded-full p-0.5',
            'bg-black/60 text-white hover:bg-black/80',
            'dark:bg-background/20 dark:hover:bg-background/40',
            'transition-opacity duration-150',
            'opacity-0 group-hover/guide:opacity-100',
            '[@media(hover:none)]:opacity-100',
          )}
          aria-label="Dismiss guide"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {isImage ? (
        // Render from linked library asset (inlineSvg → blobUrl)
        asset?.inlineSvg ? (
          <div
            className="[&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(asset.inlineSvg) }}
          />
        ) : asset?.blobUrl ? (
          <img
            src={asset.blobUrl}
            alt={guide.title || 'Guide image'}
            className="max-w-full h-auto"
          />
        ) : null
      ) : (
        <div className="min-w-0">
          {guide.title && (
            <p className="text-base font-bold leading-tight mb-1">
              {guide.title}
            </p>
          )}
          <div className="prose prose-sm max-w-none [&_p]:m-0 [&_p]:leading-snug [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0 text-foreground/80">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{guide.body}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
