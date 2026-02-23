'use client';

import { memo, useCallback } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import { X, Lightbulb, StickyNote, Pencil, GripVertical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { darkenColor } from '@/lib/canvas/color-utils';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';

// Variant icons (null = no icon for that variant)
const VARIANT_ICONS: Record<string, typeof StickyNote | null> = {
  sticker: null,
  note: Lightbulb,
  hint: Lightbulb,
  image: null,
  'template-sticky-note': null,
  frame: null,
  arrow: null,
};

const VARIANT_DEFAULTS: Record<string, { bg: string }> = {
  sticker: { bg: '#b8c9a3' },
  note: { bg: '#dce8f5' },
  hint: { bg: '' },
  'template-sticky-note': { bg: '' },
  frame: { bg: '' },
  arrow: { bg: '' },
};

const VARIANT_LABELS: Record<string, string> = {
  sticker: 'Sticker',
  note: 'Note',
  hint: 'Hint',
  image: 'Image',
  'template-sticky-note': 'Template Sticky note',
  frame: 'Frame',
  arrow: 'Arrow',
};

// StickyNote color name → CSS variable class (matches StickyNoteNode COLOR_CLASSES)
const POSTIT_COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-[var(--sticky-note-yellow)]',
  pink: 'bg-[var(--sticky-note-pink)]',
  blue: 'bg-[var(--sticky-note-blue)]',
  green: 'bg-[var(--sticky-note-green)]',
  orange: 'bg-[var(--sticky-note-orange)]',
  red: 'bg-[var(--sticky-note-red)]',
};

/** Simple SVG sanitizer — strips <script> tags and on* event attributes. */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
}

export interface GuideNodeData extends CanvasGuideData {
  isAdmin?: boolean;
  isAdminEditing?: boolean;
  onDismiss: (id: string) => void;
  onEdit?: (guide: CanvasGuideData, position: { x: number; y: number }) => void;
  onGuideResize?: (id: string, width: number, height: number) => void;
  onGuideResizeEnd?: (id: string, width: number, height: number, x: number, y: number) => void;
  isExiting: boolean;
}

/**
 * Admin drag handle — absolutely positioned overlay so it doesn't affect
 * content layout. Content renders identically in admin and preview modes.
 */
function AdminDragHandle({ guide }: { guide: GuideNodeData }) {
  if (!guide.isAdminEditing) return null;
  return (
    <div className="guide-drag-handle absolute top-0 left-0 right-0 z-10 flex items-center gap-1.5 px-2 py-1.5 rounded-t-sm bg-blue-500/90 text-white cursor-grab active:cursor-grabbing select-none">
      <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="text-xs font-medium truncate flex-1">
        {guide.title || VARIANT_LABELS[guide.variant] || 'Guide'}
      </span>
      {guide.onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            guide.onEdit!(guide, { x: e.clientX, y: e.clientY });
          }}
          className="nodrag rounded p-0.5 hover:bg-white/20 transition-colors"
          aria-label="Edit guide"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── Template Sticky note variant ───
function TemplateStickyNoteContent({ guide }: { guide: GuideNodeData }) {
  const colorName = guide.color || 'yellow';
  const bgClass = POSTIT_COLOR_CLASSES[colorName] || POSTIT_COLOR_CLASSES.yellow;

  return (
    <div
      className={cn(
        bgClass,
        'shadow-md rounded-sm p-3 w-full h-full',
        'font-sans text-sm text-neutral-olive-800',
        !guide.isAdminEditing && 'pointer-events-none',
      )}
    >
      {guide.title && (
        <p className="text-xs font-semibold leading-tight mb-1">{guide.title}</p>
      )}
      {guide.body && (
        <div className="prose prose-xs max-w-none [&_p]:m-0 [&_p]:leading-snug [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0">
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>{guide.body}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// ─── Frame variant ───
function FrameContent({ guide }: { guide: GuideNodeData }) {
  const borderColor = guide.color || '#94a3b8';

  return (
    <div
      className={cn(
        'rounded-lg w-full h-full',
        !guide.isAdminEditing && 'pointer-events-none',
      )}
      style={{
        border: `2px dashed ${borderColor}`,
        position: 'relative',
      }}
    >
      {guide.title && (
        <span
          className="absolute -top-3 left-3 px-1.5 text-[11px] font-medium leading-none"
          style={{
            color: borderColor,
            backgroundColor: 'var(--background, #fff)',
          }}
        >
          {guide.title}
        </span>
      )}
    </div>
  );
}

// ─── Arrow variant ───
function ArrowContent({ guide }: { guide: GuideNodeData }) {
  const w = guide.width ?? 120;
  const h = guide.height ?? 40;
  const rotation = guide.rotation ?? 0;
  const color = guide.color || '#64748b';

  return (
    <div
      className={cn(
        'w-full h-full',
        !guide.isAdminEditing && 'pointer-events-none',
      )}
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id={`arrowhead-${guide.id}`}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={color} />
          </marker>
        </defs>
        <line
          x1="4"
          y1={h / 2}
          x2={w - 16}
          y2={h / 2}
          stroke={color}
          strokeWidth="2.5"
          markerEnd={`url(#arrowhead-${guide.id})`}
        />
      </svg>
    </div>
  );
}

// Min constraints per variant for NodeResizer
const MIN_SIZE_MAP: Record<string, { minWidth: number; minHeight: number }> = {
  'template-sticky-note': { minWidth: 100, minHeight: 60 },
  frame: { minWidth: 120, minHeight: 80 },
  arrow: { minWidth: 60, minHeight: 20 },
  sticker: { minWidth: 80, minHeight: 40 },
  note: { minWidth: 80, minHeight: 40 },
  hint: { minWidth: 100, minHeight: 30 },
  image: { minWidth: 40, minHeight: 40 },
};

function GuideNodeComponent({ id, data, selected }: NodeProps) {
  const guide = data as unknown as GuideNodeData;

  const handleDismiss = useCallback(() => {
    guide.onDismiss(guide.id);
  }, [guide]);

  const isTemplatePostit = guide.variant === 'template-sticky-note';
  const isFrame = guide.variant === 'frame';
  const isArrow = guide.variant === 'arrow';
  const mins = MIN_SIZE_MAP[guide.variant] || { minWidth: 60, minHeight: 40 };

  // ── Template sticky note / frame / arrow ──
  if (isTemplatePostit || isFrame || isArrow) {
    return (
      <div
        className={cn(
          'group/guide relative w-full h-full',
          guide.isExiting
            ? 'animate-out fade-out-0 zoom-out-95 duration-200 fill-mode-forwards'
            : 'animate-in fade-in-0 zoom-in-95 duration-300',
          guide.isAdminEditing && 'ring-1 ring-blue-300',
          guide.isAdmin && selected && 'ring-2 ring-blue-500 ring-offset-1',
        )}
      >
        <NodeResizer
          isVisible={!!selected && !!guide.isAdminEditing}
          minWidth={mins.minWidth}
          minHeight={mins.minHeight}
          handleClassName="!bg-blue-500"
          onResize={(_event, params) => {
            guide.onGuideResize?.(guide.id, params.width, params.height);
          }}
          onResizeEnd={(_event, params) => {
            guide.onGuideResizeEnd?.(guide.id, params.width, params.height, params.x, params.y);
          }}
        />
        <AdminDragHandle guide={guide} />
        {isTemplatePostit && <TemplateStickyNoteContent guide={guide} />}
        {isFrame && <FrameContent guide={guide} />}
        {isArrow && <ArrowContent guide={guide} />}
      </div>
    );
  }

  // ── Sticker / note / hint / image ──
  const Icon = VARIANT_ICONS[guide.variant];
  const isHint = guide.variant === 'hint';
  const isImage = guide.variant === 'image';
  const baseBg = guide.color || VARIANT_DEFAULTS[guide.variant]?.bg || '#b8c9a3';
  const textColor = (isHint || isImage) ? undefined : darkenColor(baseBg, 0.55);
  const iconColor = (isHint || isImage) ? undefined : darkenColor(baseBg, 0.45);
  const borderBottomColor = (isHint || isImage) ? undefined : darkenColor(baseBg, 0.15);

  return (
    <div
      className={cn(
        'group/guide relative w-full h-full',
        guide.isExiting
          ? 'animate-out fade-out-0 zoom-out-95 duration-200 fill-mode-forwards'
          : 'animate-in fade-in-0 zoom-in-95 duration-300',
        // Variant styling — always applied for visual parity
        guide.variant === 'sticker' && 'rounded-sm px-6 py-5 shadow-md border-b-4',
        guide.variant === 'note' && 'rounded-xl px-4 py-3 border',
        guide.variant === 'hint' && 'rounded-lg px-4 py-2.5 backdrop-blur-sm bg-black/50 text-white dark:bg-white/10 dark:text-white/90',
        isImage && 'p-0',
        // Admin selection indicator
        guide.isAdminEditing && 'ring-1 ring-blue-300',
        guide.isAdmin && selected && 'ring-2 ring-blue-500 ring-offset-1',
      )}
      style={{
        // Always apply variant colors
        ...(!isHint && !isImage ? {
          backgroundColor: baseBg,
          color: textColor,
          borderTopColor: guide.variant === 'note' ? borderBottomColor : undefined,
          borderRightColor: guide.variant === 'note' ? borderBottomColor : undefined,
          borderBottomColor: (guide.variant === 'sticker' || guide.variant === 'note') ? borderBottomColor : undefined,
          borderLeftColor: guide.variant === 'note' ? borderBottomColor : undefined,
        } : {}),
      }}
    >
      <NodeResizer
        isVisible={!!selected && !!guide.isAdminEditing}
        minWidth={mins.minWidth}
        minHeight={mins.minHeight}
        keepAspectRatio={isImage}
        handleClassName="!bg-blue-500"
        onResize={(_event, params) => {
          guide.onGuideResize?.(guide.id, params.width, params.height);
        }}
        onResizeEnd={(_event, params) => {
          guide.onGuideResizeEnd?.(guide.id, params.width, params.height, params.x, params.y);
        }}
      />
      <AdminDragHandle guide={guide} />

      {/* Dismiss button — only in non-admin mode */}
      {!guide.isAdminEditing && guide.dismissBehavior === 'hover-x' && (
        <button
          onClick={handleDismiss}
          className={cn(
            'nodrag absolute -top-2 -right-2 rounded-full p-0.5 z-10',
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
        guide.imageSvg ? (
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(guide.imageSvg) }}
          />
        ) : (
          <p className="text-xs text-muted-foreground italic py-2">No SVG</p>
        )
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
              <p className={cn('text-sm font-semibold leading-tight', guide.variant === 'sticker' && 'mb-1')}>
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

export const GuideNode = memo(GuideNodeComponent);
