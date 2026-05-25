'use client';

import { memo, useCallback, useRef, useEffect, useLayoutEffect, useState } from 'react';
import { Handle, Position, type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StickyNoteColor } from '@/stores/canvas-store';

// Miro-style hybrid text fit: stickies grow vertically up to max, then text
// shrinks down to a min font-size, then text wraps and scrolls.
export const STICKY_BASE_FONT_SIZE = 14; // matches Tailwind text-sm
export const STICKY_MIN_FONT_SIZE = 10;
export const STICKY_DEFAULT_WIDTH = 120;
export const STICKY_DEFAULT_HEIGHT = 120;
export const STICKY_MAX_WIDTH = 280;
export const STICKY_MAX_HEIGHT = 280;
const STICKY_PADDING_Y = 24; // matches p-3 (12 top + 12 bottom)

/** Compute the node height and font-size that fits the given natural content height. */
function fitText(naturalContentHeight: number): { nodeHeight: number; fontSize: number } {
  const maxContentH = STICKY_MAX_HEIGHT - STICKY_PADDING_Y;
  if (naturalContentHeight <= maxContentH) {
    return {
      nodeHeight: Math.max(STICKY_DEFAULT_HEIGHT, naturalContentHeight + STICKY_PADDING_Y),
      fontSize: STICKY_BASE_FONT_SIZE,
    };
  }
  // Shrink: font-size scales roughly as sqrt of area ratio. Using linear ratio
  // is a slight overshoot toward smaller text, which is fine for one pass.
  const ratio = maxContentH / naturalContentHeight;
  const fs = Math.max(STICKY_MIN_FONT_SIZE, Math.floor(STICKY_BASE_FONT_SIZE * ratio));
  return { nodeHeight: STICKY_MAX_HEIGHT, fontSize: fs };
}

export const COLOR_CLASSES: Record<StickyNoteColor, string> = {
  yellow: 'bg-[var(--sticky-note-yellow)]',
  pink: 'bg-[var(--sticky-note-pink)]',
  blue: 'bg-[var(--sticky-note-blue)]',
  green: 'bg-[var(--sticky-note-green)]',
  orange: 'bg-[var(--sticky-note-orange)]',
  red: 'bg-[var(--sticky-note-red)]',
  teal: 'bg-[var(--sticky-note-teal)]',
  purple: 'bg-[var(--sticky-note-purple)]',
  white: 'bg-[var(--sticky-note-white)]',
};

/** Dark text hues matching each pastel background — constant across light/dark mode */
export const TEXT_COLOR_CLASSES: Record<StickyNoteColor, string> = {
  yellow: 'text-[var(--sticky-note-yellow-text)]',
  pink: 'text-[var(--sticky-note-pink-text)]',
  blue: 'text-[var(--sticky-note-blue-text)]',
  green: 'text-[var(--sticky-note-green-text)]',
  orange: 'text-[var(--sticky-note-orange-text)]',
  red: 'text-[var(--sticky-note-red-text)]',
  teal: 'text-[var(--sticky-note-teal-text)]',
  purple: 'text-[var(--sticky-note-purple-text)]',
  white: 'text-[var(--sticky-note-white-text)]',
};

/** Darker avatar background colors per sticky note color — muted to match nature palette */
const AVATAR_BG: Record<StickyNoteColor, string> = {
  yellow: 'bg-amber-700',
  pink: 'bg-rose-600',
  blue: 'bg-slate-500',
  green: 'bg-emerald-700',
  orange: 'bg-amber-600',
  red: 'bg-red-700',
  teal: 'bg-teal-700',
  purple: 'bg-violet-700',
  white: 'bg-neutral-400',
};

/** Extract initials from a persona name (first letter of first two words) */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0]?.substring(0, 2).toUpperCase() || '?';
}

export type StickyNoteNodeData = {
  text: string;
  color: StickyNoteColor;
  isEditing: boolean;
  isPreview?: boolean;
  previewReason?: string;
  clusterLabel?: string;
  clusterChildCount?: number;
  /** Persona this insight is attributed to (shows a name+color provenance badge). */
  cluster?: string;
  templateKey?: string;
  templateLabel?: string;
  placeholderText?: string;
  ownerId?: string;
  ownerName?: string;
  ownerColor?: string;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onTextChange?: (id: string, text: string) => void;
  onEditComplete?: (id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onResizeEnd?: (id: string, width: number, height: number, x: number, y: number) => void;
  // Auto-resize from text fit logic — keeps width, updates height.
  onAutoResize?: (id: string, width: number, height: number) => void;
};

export type StickyNoteNode = Node<StickyNoteNodeData, 'stickyNote'>;

// `dragging` comes from ReactFlow's NodeProps — no React state needed for drag feedback
export const StickyNoteNode = memo(({ data, selected, id, dragging }: NodeProps<StickyNoteNode>) => {
  const colorKey = data.color || 'yellow';
  const bgColor = COLOR_CLASSES[colorKey];
  const textColor = TEXT_COLOR_CLASSES[colorKey];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayTextRef = useRef<HTMLParagraphElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [fontSize, setFontSize] = useState<number>(STICKY_BASE_FONT_SIZE);

  // Measure content and apply hybrid grow-then-shrink fit.
  // Edit mode: textarea (scrollHeight after height:auto reset).
  // Display mode: p element (scrollHeight directly).
  useLayoutEffect(() => {
    if (data.isPreview) return;

    const measureEl = data.isEditing ? textareaRef.current : displayTextRef.current;
    if (!measureEl) return;

    let naturalHeight: number;
    if (data.isEditing && textareaRef.current) {
      // Textarea natural height requires resetting height to auto first.
      const ta = textareaRef.current;
      const prevHeight = ta.style.height;
      ta.style.fontSize = `${STICKY_BASE_FONT_SIZE}px`;
      ta.style.height = 'auto';
      naturalHeight = ta.scrollHeight;
      ta.style.height = prevHeight;
    } else {
      // Display mode: the <p> is `flex-1 overflow-hidden`, so when the parent
      // height is constrained (e.g. a template sticky still at its default size
      // while the AI streams long text into it), scrollHeight reports the
      // clipped/rendered height — not the natural content height. Break the <p>
      // out of flex sizing for the measurement, then restore. Both mutations
      // happen inside useLayoutEffect so no paint occurs in between.
      const prevFlex = measureEl.style.flex;
      const prevHeight = measureEl.style.height;
      measureEl.style.fontSize = `${STICKY_BASE_FONT_SIZE}px`;
      measureEl.style.flex = 'none';
      measureEl.style.height = 'auto';
      naturalHeight = measureEl.scrollHeight;
      measureEl.style.flex = prevFlex;
      measureEl.style.height = prevHeight;
    }

    const { nodeHeight, fontSize: nextFs } = fitText(naturalHeight);
    setFontSize(nextFs);

    // Report grow-phase height to canvas so the node wrapper resizes.
    // Width stays at current outer width (or default).
    const currentWidth = outerRef.current?.clientWidth ?? STICKY_DEFAULT_WIDTH;
    data.onAutoResize?.(id, currentWidth, nodeHeight);
    // `onAutoResize` is referentially stable from the parent's useCallback,
    // so listing it doesn't cause re-runs. Listed explicitly to keep the deps
    // array size stable across edits (HMR otherwise throws on size changes).
  }, [data.text, data.isEditing, data.isPreview, id, data.onAutoResize]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      data.onEditComplete?.(id);
    }
  }, [id, data]);

  // Guarded blur handler: defer edit-complete to distinguish real blur from
  // transient focus loss caused by React re-renders (e.g. remote CRDT updates).
  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      if (textareaRef.current && document.activeElement !== textareaRef.current) {
        data.onEditComplete?.(id);
      }
    }, 100);
  }, [id, data]);

  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // Auto-focus textarea when entering edit mode and place cursor at end.
  // setTimeout ensures focus survives ReactFlow's own focus management after node creation.
  useEffect(() => {
    if (data.isEditing) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [data.isEditing]);

  if (data.isPreview) {
    return (
      <div
        className={cn(
          bgColor,
          textColor,
          'shadow-md rounded-sm p-3',
          'font-sans text-sm',
          'opacity-60',
          'ring-2 ring-olive-500 ring-offset-1',
          'w-full h-full flex flex-col',
        )}
        style={{ touchAction: 'none' }}
      >
        <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />

        <p className="break-words whitespace-pre-wrap mb-2 text-xs flex-1">{data.text || ''}</p>

        {data.previewReason && (
          <p className="text-[10px] text-neutral-olive-500 italic mb-2 leading-tight">{data.previewReason}</p>
        )}

        <div className="flex gap-1.5 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onConfirm?.(id);
            }}
            className="nodrag nopan flex-1 px-2 py-1 text-xs bg-olive-600 text-white rounded hover:bg-olive-700 transition-colors font-medium"
          >
            Add
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onReject?.(id);
            }}
            className="nodrag nopan flex-1 px-2 py-1 text-xs bg-neutral-olive-200 text-neutral-olive-700 rounded hover:bg-neutral-olive-300 transition-colors"
          >
            Skip
          </button>
        </div>

        <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
      </div>
    );
  }

  // Template state derivation
  const isTemplate = !!data.templateKey;
  const isEmpty = !data.text?.trim();
  const isTemplatePlaceholder = isTemplate && isEmpty;

  // Persona card detection: has em-dash separator and is not a cluster child
  const isPersonaCard = data.text.includes(' — ') && !data.clusterLabel;
  const personaName = isPersonaCard ? data.text.split(/\s*[—–]\s*/)[0].trim() : '';
  const personaInitials = isPersonaCard ? getInitials(personaName) : '';
  const avatarBg = isPersonaCard ? (AVATAR_BG[data.color || 'yellow'] || AVATAR_BG.yellow) : '';

  return (
    <div
      ref={outerRef}
      className={cn(
        bgColor,
        textColor,
        'shadow-md rounded-sm p-3',
        'font-sans',
        // Smooth shadow transition on hover — no transform to avoid flicker
        !dragging && 'transition-shadow duration-150',
        !dragging && !selected && 'hover:shadow-lg',
        'w-full h-full flex flex-col overflow-hidden',
        selected && !dragging && 'ring-2 ring-selection ring-offset-1',
        data.isEditing && 'ring-2 ring-olive-500 ring-offset-1',
        // Miro-like drag: clean shadow lift, subtle scale, no rotation or opacity change
        dragging && 'shadow-2xl scale-[1.02] ring-2 ring-olive-500/40',
        // Subtle dashed border for unfilled template cards
        isTemplatePlaceholder && !data.isEditing && 'border border-dashed border-neutral-olive-400/50'
      )}
      style={{ touchAction: 'none' }}
    >
      {/* Resize handles — visible when selected but not editing */}
      <NodeResizer
        isVisible={!!selected && !data.isEditing}
        minWidth={80}
        minHeight={80}
        onResize={(_, { width, height }) => {
          data.onResize?.(id, width, height);
        }}
        onResizeEnd={(_, { x, y, width, height }) => {
          data.onResizeEnd?.(id, width, height, x, y);
        }}
        handleClassName="!w-2.5 !h-2.5 !bg-white !border-2 !border-selection !rounded-full"
        lineClassName="!border-selection/50"
      />

      {/* Hidden handles for future edge connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-0 !h-0"
      />

      {/* Persistent header label for template cards */}
      {data.templateLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-olive-600/70 mb-0.5 block">
          {data.templateLabel}
        </span>
      )}

      {data.isEditing ? (
        <textarea
          ref={textareaRef}
          maxLength={200}
          className="nodrag nopan bg-transparent border-none outline-none resize-none w-full flex-1 overflow-y-auto"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.35 }}
          defaultValue={data.text}
          onBlur={handleBlur}
          onChange={(e) => data.onTextChange?.(id, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={data.placeholderText || "Type here..."}
        />
      ) : (
        <>
          {isPersonaCard ? (
            <div className="flex items-start gap-2 flex-1 overflow-hidden">
              <div className={cn(
                avatarBg,
                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                'text-[10px] font-bold text-white leading-none'
              )}>
                {personaInitials}
              </div>
              <p
                ref={displayTextRef}
                className="break-words whitespace-pre-wrap overflow-hidden flex-1 font-semibold"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.35 }}
              >
                {data.text || ''}
              </p>
            </div>
          ) : (
            <p
              ref={displayTextRef}
              className={cn(
                'break-words whitespace-pre-wrap overflow-hidden flex-1',
                isTemplatePlaceholder && 'text-neutral-olive-500/50 italic'
              )}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.35 }}
            >
              {data.text || data.placeholderText || ''}
            </p>
          )}
          {data.clusterLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-olive-500 mt-1">
              <Layers className="w-2.5 h-2.5" />
              {data.clusterLabel} ({data.clusterChildCount ?? 0})
            </span>
          )}
        </>
      )}

      {/* Bottom-left provenance badge, tinted in the sticky's own darkened
          (body-text) color. Persona-attributed insights show the persona name;
          synthesized (white) insights show a "Synthesized" marker. Hidden for
          persona cards and cluster parents. */}
      {!isPersonaCard && !data.clusterLabel && (data.cluster || data.color === 'white') && (
        <div
          className="absolute bottom-1 left-1.5 flex items-center gap-1 opacity-75"
          style={{ color: `var(--sticky-note-${data.color || 'yellow'}-text)` }}
          title={data.cluster ? `From ${data.cluster}` : 'Synthesized insight'}
        >
          {data.cluster ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: `var(--sticky-note-${data.color || 'yellow'}-text)` }}
            />
          ) : (
            <Sparkles className="h-2.5 w-2.5" />
          )}
          <span className="text-[9px] font-medium max-w-[90px] truncate">
            {data.cluster ? data.cluster : 'Synthesized'}
          </span>
        </div>
      )}

      {/* Provenance indicator for participant-contributed items */}
      {data.ownerId && (
        <div
          className="absolute bottom-1 right-1.5 flex items-center gap-1"
          title={data.ownerName || 'Participant'}
        >
          <div
            className="h-2.5 w-2.5 rounded-full border border-white/60"
            style={{ backgroundColor: data.ownerColor || '#b3efbd' }}
          />
          <span className="text-[9px] font-medium text-neutral-olive-500/70 max-w-[60px] truncate">
            {data.ownerName}
          </span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-0 !h-0"
      />
    </div>
  );
});

StickyNoteNode.displayName = 'StickyNoteNode';
