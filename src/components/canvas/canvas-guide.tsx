'use client';

import { useCallback } from 'react';
import { X, Lightbulb, StickyNote, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { darkenColor } from '@/lib/canvas/color-utils';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';

// Position → Tailwind class map (for pinned guides)
const POSITION_CLASSES: Record<string, string> = {
  'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'top-left': 'top-6 left-6',
  'top-center': 'top-6 left-1/2 -translate-x-1/2',
  'top-right': 'top-6 right-6',
  'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
};

// Variant icons (null = no icon for that variant)
const VARIANT_ICONS: Record<string, typeof StickyNote | null> = {
  sticker: StickyNote,
  note: Lightbulb,
  hint: Lightbulb,
  image: null,
};

// Default variant background + derived dark text colors
const VARIANT_DEFAULTS: Record<string, { bg: string; darkText: string; borderColor: string }> = {
  sticker: { bg: '#b8c9a3', darkText: '#2d3a22', borderColor: '#9ab085' },
  note: { bg: '#dce8f5', darkText: '#2a3f5a', borderColor: '#b8ceea' },
  hint: { bg: '', darkText: '', borderColor: '' }, // hint uses backdrop-blur
};

interface CanvasGuideProps {
  guide: CanvasGuideData;
  onDismiss: (id: string) => void;
  isExiting: boolean;
  isAdminEditing?: boolean;
  onEdit?: (guide: CanvasGuideData, position: { x: number; y: number }) => void;
}

/** Simple SVG sanitizer — strips <script> tags and on* event attributes. */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
}

export function CanvasGuide({ guide, onDismiss, isExiting, isAdminEditing, onEdit }: CanvasGuideProps) {
  // New variants (template-sticky-note, frame, arrow) are always on-canvas nodes — never pinned
  if (['template-sticky-note', 'frame', 'arrow'].includes(guide.variant)) {
    return null;
  }
  const handleDismiss = useCallback(() => {
    onDismiss(guide.id);
  }, [onDismiss, guide.id]);

  const Icon = VARIANT_ICONS[guide.variant];
  const isImage = guide.variant === 'image';

  // Compute colors: custom or variant default
  const isHint = guide.variant === 'hint';
  const baseBg = guide.color || VARIANT_DEFAULTS[guide.variant]?.bg || '#b8c9a3';
  const textColor = (isHint || isImage) ? undefined : darkenColor(baseBg, 0.55);
  const iconColor = (isHint || isImage) ? undefined : darkenColor(baseBg, 0.45);
  const borderBottomColor = (isHint || isImage) ? undefined : darkenColor(baseBg, 0.15);

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
        // Shared shape per variant
        guide.variant === 'sticker' && 'rounded-sm px-4 py-3 shadow-md border-b-4',
        guide.variant === 'note' && 'rounded-xl px-4 py-3 border',
        guide.variant === 'hint' && [
          'rounded-lg px-4 py-2.5 backdrop-blur-sm',
          'bg-black/50 text-white dark:bg-white/10 dark:text-white/90',
        ],
        // Image variant: transparent, no bg/border/shadow
        isImage && 'p-0',
      )}
      style={(!isHint && !isImage) ? {
        backgroundColor: baseBg,
        color: textColor,
        borderTopColor: guide.variant === 'note' ? borderBottomColor : undefined,
        borderRightColor: guide.variant === 'note' ? borderBottomColor : undefined,
        borderBottomColor: (guide.variant === 'sticker' || guide.variant === 'note') ? borderBottomColor : undefined,
        borderLeftColor: guide.variant === 'note' ? borderBottomColor : undefined,
      } : undefined}
    >
      {/* Admin edit button — shown when guide editing is active */}
      {isAdminEditing && onEdit && (
        <button
          onClick={(e) => onEdit(guide, { x: e.clientX, y: e.clientY })}
          className={cn(
            'absolute -top-2 -left-2 rounded-full p-1',
            'bg-blue-500 text-white hover:bg-blue-600',
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
            'dark:bg-white/20 dark:hover:bg-white/40',
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
        // Image variant: render SVG directly in transparent container
        guide.imageSvg ? (
          <div
            className="[&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(guide.imageSvg) }}
          />
        ) : null
      ) : (
        <div className="flex items-start gap-2">
          {Icon && (
            <Icon
              className="mt-0.5 shrink-0 h-4 w-4"
              style={!isHint ? { color: iconColor, opacity: 0.7 } : { color: '#fde047' }}
            />
          )}
          <div className="min-w-0">
            {guide.title && (
              <p
                className={cn(
                  'text-sm font-semibold leading-tight',
                  guide.variant === 'sticker' && 'mb-1',
                )}
              >
                {guide.title}
              </p>
            )}
            <div className={cn(
              'prose max-w-none [&_p]:m-0 [&_p]:leading-snug [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0',
              guide.variant === 'hint' ? 'prose-sm dark:prose-invert' : 'prose-xs',
            )}>
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>{guide.body}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
