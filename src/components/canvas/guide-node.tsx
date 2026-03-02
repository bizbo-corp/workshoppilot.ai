'use client';

import { memo, useCallback } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import { X, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';

import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';

const VARIANT_LABELS: Record<string, string> = {
  card: 'Card',
  image: 'Image',
  'template-sticky-note': 'Template Sticky note',
  frame: 'Frame',
  arrow: 'Arrow',
};

// StickyNote color name → CSS variable class (matches StickyNoteNode COLOR_CLASSES)
const POSTIT_COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-[var(--canvas-yellow-pastel)]',
  pink: 'bg-[var(--canvas-pink-pastel)]',
  blue: 'bg-[var(--canvas-blue-pastel)]',
  green: 'bg-[var(--canvas-green-pastel)]',
  orange: 'bg-[var(--canvas-orange-pastel)]',
  red: 'bg-[var(--canvas-red-pastel)]',
};

// Hex → canvas color name for adaptive text color lookup
const HEX_TO_CANVAS_COLOR: Record<string, string> = {
  '#eab308': 'yellow', '#ec4899': 'pink', '#3b82f6': 'blue',
  '#22c55e': 'green', '#f97316': 'orange', '#ef4444': 'red',
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

/** Floating edit button — small pill that appears on hover in admin mode. */
function AdminEditButton({ guide }: { guide: GuideNodeData }) {
  if (!guide.isAdminEditing || !guide.onEdit) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        guide.onEdit!(guide, { x: e.clientX, y: e.clientY });
      }}
      className={cn(
        'nodrag absolute -top-2 -right-2 z-10 rounded-full p-1',
        'bg-olive-600/90 text-white hover:bg-olive-700 shadow-sm',
        'transition-opacity duration-150',
        'opacity-0 group-hover/guide:opacity-100',
        'focus:opacity-100',
      )}
      aria-label="Edit guide"
    >
      <Pencil className="h-3 w-3" />
    </button>
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
  const baseColor = guide.color || '#b8c9a3'; // olive default
  const showStroke = (guide as CanvasGuideData).showStroke !== false; // default true
  const showFill = !!(guide as CanvasGuideData).showFill;
  const fillColor = showFill ? `${baseColor}1F` : 'transparent';

  return (
    <div
      className={cn(
        'rounded-lg w-full h-full',
        !guide.isAdminEditing && 'pointer-events-none',
        showFill && 'backdrop-blur-sm',
      )}
      style={{
        border: showStroke ? `1px solid ${baseColor}` : 'none',
        backgroundColor: fillColor,
        position: 'relative',
      }}
    >
      {guide.title && (
        <span
          className="absolute top-2 left-3 text-[11px] font-semibold uppercase tracking-wide leading-none"
          style={{
            color: `var(--canvas-${HEX_TO_CANVAS_COLOR[baseColor] || 'olive'}-text)`,
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
  card: { minWidth: 80, minHeight: 40 },
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
          guide.isAdminEditing && 'ring-1 ring-olive-400',
          guide.isAdmin && selected && 'ring-2 ring-olive-600 ring-offset-1',
        )}
      >
        <NodeResizer
          isVisible={!!selected && !!guide.isAdminEditing}
          minWidth={mins.minWidth}
          minHeight={mins.minHeight}
          handleClassName="!bg-olive-600"
          onResize={(_event, params) => {
            guide.onGuideResize?.(guide.id, params.width, params.height);
          }}
          onResizeEnd={(_event, params) => {
            guide.onGuideResizeEnd?.(guide.id, params.width, params.height, params.x, params.y);
          }}
        />
        <AdminEditButton guide={guide} />
        {isTemplatePostit && <TemplateStickyNoteContent guide={guide} />}
        {isFrame && <FrameContent guide={guide} />}
        {isArrow && <ArrowContent guide={guide} />}
      </div>
    );
  }

  // ── Card / image ──
  const isImage = guide.variant === 'image';
  const isCard = guide.variant === 'card';
  const hasColor = !!guide.color;

  return (
    <div
      className={cn(
        'group/guide relative',
        // Card auto-sizes to content; image fills allocated node area
        isImage ? 'w-full h-full' : 'w-full',
        guide.isExiting
          ? 'animate-out fade-out-0 zoom-out-95 duration-200 fill-mode-forwards'
          : 'animate-in fade-in-0 zoom-in-95 duration-300',
        // Card variant — shared shape
        isCard && 'rounded-xl px-4 py-3 backdrop-blur-sm',
        // Default (no color): olive/sage semi-transparent, theme text colors
        isCard && !hasColor && [
          'bg-olive-100/70 dark:bg-olive-900/70',
          'text-foreground',
          'shadow-sm',
        ],
        // With color: tinted semi-transparent, theme text colors
        isCard && hasColor && 'shadow-sm backdrop-blur-sm text-foreground',
        isImage && 'p-0',
        // Admin selection indicator
        guide.isAdminEditing && 'ring-1 ring-olive-400',
        guide.isAdmin && selected && 'ring-2 ring-olive-600 ring-offset-1',
      )}
      style={(isCard && hasColor) ? {
        backgroundColor: `${guide.color}cc`,
      } : undefined}
    >
      <NodeResizer
        isVisible={!!selected && !!guide.isAdminEditing}
        minWidth={mins.minWidth}
        minHeight={mins.minHeight}
        keepAspectRatio={isImage}
        handleClassName="!bg-olive-600"
        onResize={(_event, params) => {
          guide.onGuideResize?.(guide.id, params.width, params.height);
        }}
        onResizeEnd={(_event, params) => {
          guide.onGuideResizeEnd?.(guide.id, params.width, params.height, params.x, params.y);
        }}
      />
      <AdminEditButton guide={guide} />

      {/* Dismiss button — only in non-admin mode */}
      {!guide.isAdminEditing && guide.dismissBehavior === 'hover-x' && (
        <button
          onClick={handleDismiss}
          className={cn(
            'nodrag absolute -top-2 -right-2 rounded-full p-0.5 z-10',
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
        guide.linkedAsset?.inlineSvg ? (
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(guide.linkedAsset.inlineSvg) }}
          />
        ) : guide.linkedAsset?.blobUrl ? (
          <img
            src={guide.linkedAsset.blobUrl}
            alt={guide.title || 'Guide image'}
            className="w-full h-full object-contain"
          />
        ) : (
          <p className="text-xs text-muted-foreground italic py-2">No image</p>
        )
      ) : (
        <div className="min-w-0">
          {guide.title && (
            <p className="text-base font-bold leading-tight mb-1">
              {guide.title}
            </p>
          )}
          <div className="prose prose-sm max-w-none [&_p]:m-0 [&_p]:leading-snug [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0 text-foreground/80 [&_strong]:text-foreground [&_strong]:font-bold">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{guide.body}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export const GuideNode = memo(GuideNodeComponent);
