'use client';

import { memo, useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { X, Lightbulb, StickyNote, Pencil, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { darkenColor } from '@/lib/canvas/color-utils';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';

// Variant icons (null = no icon for that variant)
const VARIANT_ICONS: Record<string, typeof StickyNote | null> = {
  sticker: null,
  note: Lightbulb,
  hint: Lightbulb,
  image: null,
  'template-postit': null,
  frame: null,
  arrow: null,
};

const VARIANT_DEFAULTS: Record<string, { bg: string }> = {
  sticker: { bg: '#b8c9a3' },
  note: { bg: '#dce8f5' },
  hint: { bg: '' },
  'template-postit': { bg: '' },
  frame: { bg: '' },
  arrow: { bg: '' },
};

const VARIANT_LABELS: Record<string, string> = {
  sticker: 'Sticker',
  note: 'Note',
  hint: 'Hint',
  image: 'Image',
  'template-postit': 'Template Post-it',
  frame: 'Frame',
  arrow: 'Arrow',
};

// PostIt color name → CSS variable class (matches PostItNode COLOR_CLASSES)
const POSTIT_COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-[var(--postit-yellow)]',
  pink: 'bg-[var(--postit-pink)]',
  blue: 'bg-[var(--postit-blue)]',
  green: 'bg-[var(--postit-green)]',
  orange: 'bg-[var(--postit-orange)]',
  red: 'bg-[var(--postit-red)]',
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
  isExiting: boolean;
}

/** Admin drag handle header — shared across all variants in admin mode. */
function AdminDragHandle({ guide, selected }: { guide: GuideNodeData; selected?: boolean }) {
  if (!guide.isAdminEditing) return null;
  return (
    <div className="guide-drag-handle flex items-center gap-1.5 px-2 py-1.5 bg-blue-500 text-white cursor-grab active:cursor-grabbing select-none">
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

// ─── Template Post-it variant ───
function TemplatePostItContent({ guide }: { guide: GuideNodeData }) {
  const w = guide.width ?? 160;
  const h = guide.height ?? 100;
  const colorName = guide.color || 'yellow';
  const bgClass = POSTIT_COLOR_CLASSES[colorName] || POSTIT_COLOR_CLASSES.yellow;

  return (
    <div
      className={cn(
        bgClass,
        'shadow-md rounded-sm p-3',
        'font-sans text-sm text-neutral-olive-800 dark:text-neutral-olive-200',
        'rotate-[-1deg]',
        !guide.isAdminEditing && 'pointer-events-none',
      )}
      style={{ width: w, minHeight: h }}
    >
      {guide.title && (
        <p className="text-xs font-semibold leading-tight mb-1">{guide.title}</p>
      )}
      {guide.body && (
        <p className="text-xs leading-snug whitespace-pre-line">{guide.body}</p>
      )}
    </div>
  );
}

// ─── Frame variant ───
function FrameContent({ guide }: { guide: GuideNodeData }) {
  const w = guide.width ?? 400;
  const h = guide.height ?? 300;
  const borderColor = guide.color || '#94a3b8';

  return (
    <div
      className={cn(
        'rounded-lg',
        // Allow clicks to pass through to the canvas beneath
        !guide.isAdminEditing && 'pointer-events-none',
      )}
      style={{
        width: w,
        height: h,
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
        !guide.isAdminEditing && 'pointer-events-none',
      )}
      style={{
        width: w,
        height: h,
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

function GuideNodeComponent({ data, selected }: NodeProps) {
  const guide = data as unknown as GuideNodeData;

  const handleDismiss = useCallback(() => {
    guide.onDismiss(guide.id);
  }, [guide]);

  const isTemplatePostit = guide.variant === 'template-postit';
  const isFrame = guide.variant === 'frame';
  const isArrow = guide.variant === 'arrow';

  // New variants have dedicated renderers
  if (isTemplatePostit || isFrame || isArrow) {
    return (
      <div
        className={cn(
          'group/guide',
          guide.isExiting
            ? 'animate-out fade-out-0 zoom-out-95 duration-200 fill-mode-forwards'
            : 'animate-in fade-in-0 zoom-in-95 duration-300',
          guide.isAdminEditing && 'rounded-lg border border-blue-300 shadow-md overflow-hidden',
          guide.isAdmin && selected && 'ring-2 ring-blue-500 ring-offset-1',
        )}
      >
        <AdminDragHandle guide={guide} selected={selected} />
        <div className={cn(guide.isAdminEditing && 'p-1')}>
          {isTemplatePostit && <TemplatePostItContent guide={guide} />}
          {isFrame && <FrameContent guide={guide} />}
          {isArrow && <ArrowContent guide={guide} />}
        </div>
      </div>
    );
  }

  // ── Existing variants (sticker, note, hint, image) ──
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
        'max-w-xs group/guide',
        guide.isExiting
          ? 'animate-out fade-out-0 zoom-out-95 duration-200 fill-mode-forwards'
          : 'animate-in fade-in-0 zoom-in-95 duration-300',
        // Non-admin-editing: normal variant styling
        !guide.isAdminEditing && guide.variant === 'sticker' && 'rounded-sm px-6 py-5 shadow-md rotate-[-1deg] border-b-4',
        !guide.isAdminEditing && guide.variant === 'note' && 'rounded-xl px-4 py-3 border',
        !guide.isAdminEditing && guide.variant === 'hint' && 'rounded-lg px-4 py-2.5 backdrop-blur-sm bg-black/50 text-white dark:bg-white/10 dark:text-white/90',
        !guide.isAdminEditing && isImage && 'p-0',
        // Admin editing mode: card with drag handle
        guide.isAdminEditing && 'rounded-lg border border-blue-300 shadow-md overflow-hidden',
        guide.isAdmin && selected && 'ring-2 ring-blue-500 ring-offset-1',
      )}
      style={(!guide.isAdminEditing && !isHint && !isImage) ? {
        backgroundColor: baseBg,
        color: textColor,
        borderBottomColor: guide.variant === 'sticker' ? borderBottomColor : undefined,
        borderColor: guide.variant === 'note' ? borderBottomColor : undefined,
      } : undefined}
    >
      <AdminDragHandle guide={guide} selected={selected} />

      {/* ── Guide content ── */}
      <div
        className={cn(
          guide.isAdminEditing && 'px-3 py-2',
          guide.isAdminEditing && isImage && 'p-1',
        )}
        style={guide.isAdminEditing && !isHint && !isImage ? {
          backgroundColor: baseBg,
          color: textColor,
        } : undefined}
      >
        {/* Dismiss button — only in non-admin mode */}
        {!guide.isAdminEditing && guide.dismissBehavior === 'hover-x' && (
          <button
            onClick={handleDismiss}
            className={cn(
              'nodrag absolute -top-2 -right-2 rounded-full p-0.5',
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
              className="[&>svg]:max-w-full [&>svg]:h-auto"
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
              {guide.title && !guide.isAdminEditing && (
                <p className={cn('text-sm font-semibold leading-tight', guide.variant === 'sticker' && 'mb-1')}>
                  {guide.title}
                </p>
              )}
              <p className={cn('leading-snug whitespace-pre-line', guide.variant === 'hint' ? 'text-sm' : 'text-xs')}>
                {guide.body}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const GuideNode = memo(GuideNodeComponent);
