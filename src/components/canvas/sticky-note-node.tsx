'use client';

import { memo, useCallback, useRef, useEffect, useLayoutEffect, useState } from 'react';
import { Handle, Position, type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { Layers, Sparkles, SquareUserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StickyNoteColor } from '@/stores/canvas-store';

// Miro-style text fit: a sticky grows vertically (at a fixed width) to fit its
// text, up to a max height. If the text still doesn't fit, the font snaps down
// through a small ladder of discrete sizes. At the smallest size the note keeps
// growing tall enough to show everything — text is never clipped (input is
// capped at 200 chars, so the growth is always bounded).
export const STICKY_BASE_FONT_SIZE = 14; // matches Tailwind text-sm
export const STICKY_MIN_FONT_SIZE = 10;
/** The discrete font sizes a sticky snaps between, largest → smallest. */
export const STICKY_FONT_STEPS = [STICKY_BASE_FONT_SIZE, 12, STICKY_MIN_FONT_SIZE] as const;
export const STICKY_DEFAULT_WIDTH = 120;
export const STICKY_DEFAULT_HEIGHT = 120;
export const STICKY_MAX_WIDTH = 280;
export const STICKY_MAX_HEIGHT = 280;
const STICKY_PADDING_Y = 24; // matches p-3 (12 top + 12 bottom)

/**
 * Pick the node height and font-size for the text. `measureContentHeight(fs)`
 * returns the natural (unclipped) content height at font-size `fs` and the
 * note's current width.
 *
 * Unlocked notes (default): take the largest step whose text fits within the max
 * height, and grow the node to that content height. If even the smallest step
 * overflows the max height, stay at the smallest step and let the node grow past
 * the max so nothing is clipped.
 *
 * Locked notes (layout-packed): keep the fixed `lockedHeight` and only pick the
 * largest step that fits it — the node never grows, so packed positions can't
 * overlap.
 */
function computeFit(
  measureContentHeight: (fontSize: number) => number,
  lockedHeight?: number,
): { nodeHeight: number; fontSize: number } {
  const minStep = STICKY_FONT_STEPS[STICKY_FONT_STEPS.length - 1];

  if (lockedHeight != null) {
    const lockedContentH = lockedHeight - STICKY_PADDING_Y;
    for (const fs of STICKY_FONT_STEPS) {
      if (measureContentHeight(fs) <= lockedContentH) return { nodeHeight: lockedHeight, fontSize: fs };
    }
    return { nodeHeight: lockedHeight, fontSize: minStep };
  }

  const maxContentH = STICKY_MAX_HEIGHT - STICKY_PADDING_Y;
  for (const fs of STICKY_FONT_STEPS) {
    const contentH = measureContentHeight(fs);
    if (contentH <= maxContentH) {
      return {
        nodeHeight: Math.max(STICKY_DEFAULT_HEIGHT, contentH + STICKY_PADDING_Y),
        fontSize: fs,
      };
    }
  }
  // Smallest step still overflows the max height: keep that size and grow the
  // note tall enough to show everything (bounded by the 200-char input cap).
  return { nodeHeight: measureContentHeight(minStep) + STICKY_PADDING_Y, fontSize: minStep };
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

export type StickyNoteNodeData = {
  text: string;
  color: StickyNoteColor;
  isEditing: boolean;
  isPreview?: boolean;
  /** When true, keep the node's current height and only shrink font to fit
   *  (no auto-grow). Set for layout-packed generated notes. */
  lockSize?: boolean;
  previewReason?: string;
  clusterLabel?: string;
  clusterChildCount?: number;
  /** Persona this insight is attributed to (shows a name+color provenance badge). */
  cluster?: string;
  /** User-research persona card: renders as an avatar placeholder + editable name. */
  isPersona?: boolean;
  /** Commit a persona rename (cascades to child clusters + the Step 5 snapshot). */
  onPersonaRename?: (id: string, newName: string) => void;
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
  // Smallest height that still shows all the text (text at the smallest font).
  // Drives the resizer's minHeight so the box can never be dragged below its text.
  const [minFitHeight, setMinFitHeight] = useState<number>(STICKY_DEFAULT_HEIGHT);
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Persona card (user-research): rendered as an avatar + editable name instead
  // of a text sticky. New cards carry `isPersona`; legacy cards are detected by
  // the " — " separator. Cluster children are never persona cards.
  const isPersonaCard =
    (data.isPersona || data.text.includes(' — ')) && !data.clusterLabel && !data.cluster;
  // First name only ("Rafael, The Veterinarian — desc" → "Rafael").
  const personaFirstName = isPersonaCard
    ? data.text.split(/\s*[—–]\s*/)[0].split(',')[0].trim()
    : '';

  // Measure content and apply the discrete-step fit (see computeFit).
  useLayoutEffect(() => {
    if (data.isPreview || isPersonaCard) return;

    const measureEl = data.isEditing ? textareaRef.current : displayTextRef.current;
    if (!measureEl) return;

    // Measure the natural (unclipped) content height at a given font-size, at the
    // note's current width. All style mutations are reverted before returning, and
    // it runs inside useLayoutEffect, so no intermediate paint occurs.
    // Edit mode: textarea natural height needs height reset to auto first.
    // Display mode: the <p> is `flex-1 overflow-hidden`, so a constrained parent
    // height would report the clipped height — break it out of flex to measure,
    // then restore.
    const measureContentHeight = (fs: number): number => {
      if (data.isEditing && textareaRef.current) {
        const ta = textareaRef.current;
        const prevHeight = ta.style.height;
        const prevFontSize = ta.style.fontSize;
        ta.style.fontSize = `${fs}px`;
        ta.style.height = 'auto';
        const h = ta.scrollHeight;
        ta.style.height = prevHeight;
        ta.style.fontSize = prevFontSize;
        return h;
      }
      const prevFlex = measureEl.style.flex;
      const prevHeight = measureEl.style.height;
      const prevFontSize = measureEl.style.fontSize;
      measureEl.style.fontSize = `${fs}px`;
      measureEl.style.flex = 'none';
      measureEl.style.height = 'auto';
      const h = measureEl.scrollHeight;
      measureEl.style.flex = prevFlex;
      measureEl.style.height = prevHeight;
      measureEl.style.fontSize = prevFontSize;
      return h;
    };

    // Locked notes (layout-packed) keep their stored height — computeFit snaps
    // the font down to fit that fixed box instead of growing the node, so packed
    // positions never overlap. Unlocked notes grow to fit (Miro-style).
    const lockedHeight = data.lockSize
      ? outerRef.current?.clientHeight ?? STICKY_DEFAULT_HEIGHT
      : undefined;
    const { nodeHeight, fontSize: nextFs } = computeFit(measureContentHeight, lockedHeight);
    setFontSize(nextFs);

    // The absolute floor for this note: the text at its smallest font. Locked
    // notes pin to their fixed height. Clamp to the 80px resizer minimum so short
    // notes can still be made small.
    const minFit = lockedHeight ?? measureContentHeight(STICKY_MIN_FONT_SIZE) + STICKY_PADDING_Y;
    setMinFitHeight(Math.max(80, Math.round(minFit)));

    // Report height to canvas so the node wrapper stays in sync. For locked
    // notes this reports the unchanged locked height (a no-op in handleAutoResize).
    // Width stays at current outer width (notes grow vertically, not horizontally).
    const currentWidth = outerRef.current?.clientWidth ?? STICKY_DEFAULT_WIDTH;
    data.onAutoResize?.(id, currentWidth, nodeHeight);
    // `onAutoResize` is referentially stable from the parent's useCallback,
    // so listing it doesn't cause re-runs. Listed explicitly to keep the deps
    // array size stable across edits (HMR otherwise throws on size changes).
  }, [data.text, data.isEditing, data.isPreview, data.lockSize, id, data.onAutoResize]);

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

  // Commit a persona rename on Enter/blur; cascade is handled upstream.
  const commitPersonaName = useCallback(() => {
    const val = nameInputRef.current?.value.trim();
    setEditingName(false);
    if (val && val !== personaFirstName) data.onPersonaRename?.(id, val);
  }, [id, data, personaFirstName]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      nameInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingName(false);
    }
  }, []);

  // Persona card: avatar placeholder + click-to-edit name, on a transparent
  // background so it reads as the persona's "header" inside the swimlane frame.
  // Previews (real-interview confirm flow) fall through to the preview block
  // below so their Add/Skip controls still render.
  if (isPersonaCard && !data.isPreview) {
    return (
      <div
        ref={outerRef}
        className={cn(
          'w-full h-full flex flex-col items-center justify-start gap-2 p-1 font-sans',
          'rounded-md',
          !dragging && 'transition-shadow duration-150',
          selected && !dragging && 'ring-2 ring-selection',
          dragging && 'scale-[1.02]',
        )}
        style={{ touchAction: 'none' }}
      >
        <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />

        {/* Avatar fills the available space as a square fitting the smaller side,
            so it looks right for both new portrait cards and legacy wide cards. */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center">
          <div className="h-full w-auto aspect-square max-w-full rounded-xl bg-neutral-olive-200/80 flex items-center justify-center">
            <SquareUserRound className="w-1/2 h-1/2 text-neutral-olive-400" strokeWidth={1.25} />
          </div>
        </div>

        {editingName ? (
          <input
            ref={nameInputRef}
            className="nodrag nopan w-full max-w-[140px] text-center bg-transparent border-b border-selection outline-none text-sm font-medium text-neutral-olive-800"
            defaultValue={personaFirstName}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={commitPersonaName}
            onKeyDown={handleNameKeyDown}
          />
        ) : (
          <span
            className="nodrag nopan max-w-full truncate px-1.5 py-0.5 rounded text-sm font-medium text-neutral-olive-800 cursor-text hover:bg-neutral-olive-200/60"
            title="Click to rename — updates everywhere"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setEditingName(true);
            }}
          >
            {personaFirstName}
          </span>
        )}

        <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
      </div>
    );
  }

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
        selected && !dragging && 'ring-2 ring-selection',
        // Editing reuses the exact same ring as selection (same color/width)
        // so focused and selected look identical — the resize handles are the only
        // differentiator. Avoids the old double-stroke (olive ring + blue resizer line).
        // No ring-offset: the ring sits flush on the node edge (no white gap).
        data.isEditing && 'ring-2 ring-selection',
        // Miro-like drag: clean shadow lift, subtle scale, no rotation or opacity change
        dragging && 'shadow-2xl scale-[1.02] ring-2 ring-selection/40',
        // Subtle dashed border for unfilled template cards
        isTemplatePlaceholder && !data.isEditing && 'border border-dashed border-neutral-olive-400/50'
      )}
      style={{ touchAction: 'none' }}
    >
      {/* Resize handles — visible when selected but not editing */}
      <NodeResizer
        isVisible={!!selected && !data.isEditing && !dragging}
        minWidth={80}
        minHeight={minFitHeight}
        onResize={(_, { width, height }) => {
          data.onResize?.(id, width, height);
        }}
        onResizeEnd={(_, { x, y, width, height }) => {
          data.onResizeEnd?.(id, width, height, x, y);
        }}
        handleClassName="!w-2.5 !h-2.5 !bg-background !border-2 !border-selection !rounded-[2px]"
        // Hide the resizer's connecting line — the single border comes from the
        // node's own ring (above), so we only keep the corner handles here.
        lineClassName="!border-transparent"
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
      {!isPersonaCard && !data.clusterLabel && (data.cluster || data.color === 'white') && (() => {
        // White cards are synthesized (no single source) → Sparkles "Synthesized".
        // Coloured cards with a cluster show the source persona's name.
        const isSynth = data.color === 'white';
        return (
          <div
            className="absolute bottom-1 left-1.5 flex items-center gap-1 opacity-75"
            style={{ color: `var(--sticky-note-${data.color || 'yellow'}-text)` }}
            title={isSynth ? 'Synthesized insight' : `From ${data.cluster}`}
          >
            {isSynth ? (
              <Sparkles className="h-2.5 w-2.5" />
            ) : (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: `var(--sticky-note-${data.color || 'yellow'}-text)` }}
              />
            )}
            <span className="text-[9px] font-medium max-w-[90px] truncate">
              {isSynth ? 'Synthesized' : data.cluster}
            </span>
          </div>
        );
      })()}

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
