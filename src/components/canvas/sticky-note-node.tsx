'use client';

import { memo, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StickyNoteColor } from '@/stores/canvas-store';

export const COLOR_CLASSES: Record<StickyNoteColor, string> = {
  yellow: 'bg-[var(--sticky-note-yellow)]',
  pink: 'bg-[var(--sticky-note-pink)]',
  blue: 'bg-[var(--sticky-note-blue)]',
  green: 'bg-[var(--sticky-note-green)]',
  orange: 'bg-[var(--sticky-note-orange)]',
  red: 'bg-[var(--sticky-note-red)]',
};

/** Dark text hues matching each pastel background — constant across light/dark mode */
export const TEXT_COLOR_CLASSES: Record<StickyNoteColor, string> = {
  yellow: 'text-[var(--sticky-note-yellow-text)]',
  pink: 'text-[var(--sticky-note-pink-text)]',
  blue: 'text-[var(--sticky-note-blue-text)]',
  green: 'text-[var(--sticky-note-green-text)]',
  orange: 'text-[var(--sticky-note-orange-text)]',
  red: 'text-[var(--sticky-note-red-text)]',
};

/** Darker avatar background colors per sticky note color — muted to match nature palette */
const AVATAR_BG: Record<StickyNoteColor, string> = {
  yellow: 'bg-amber-700',
  pink: 'bg-rose-600',
  blue: 'bg-slate-500',
  green: 'bg-emerald-700',
  orange: 'bg-amber-600',
  red: 'bg-red-700',
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
};

export type StickyNoteNode = Node<StickyNoteNodeData, 'stickyNote'>;

// `dragging` comes from ReactFlow's NodeProps — no React state needed for drag feedback
export const StickyNoteNode = memo(({ data, selected, id, dragging }: NodeProps<StickyNoteNode>) => {
  const colorKey = data.color || 'yellow';
  const bgColor = COLOR_CLASSES[colorKey];
  const textColor = TEXT_COLOR_CLASSES[colorKey];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

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
      className={cn(
        bgColor,
        textColor,
        'shadow-md rounded-sm p-3',
        'font-sans text-sm',
        // Transitions only when not actively dragging — instant feedback during manipulation
        !dragging && 'transition-[box-shadow,transform,opacity] duration-150',
        !dragging && !selected && 'hover:shadow-lg hover:-translate-y-0.5',
        'cursor-pointer',
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
          className="nodrag nopan bg-transparent border-none outline-none resize-none w-full flex-1 text-sm overflow-y-auto"
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
              <p className="break-words whitespace-pre-wrap overflow-hidden flex-1 font-semibold">
                {data.text || ''}
              </p>
            </div>
          ) : (
            <p className={cn(
              'break-words whitespace-pre-wrap overflow-hidden flex-1',
              isTemplatePlaceholder && 'text-neutral-olive-500/50 italic text-xs'
            )}>
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

      {/* Provenance indicator for participant-contributed items */}
      {data.ownerId && (
        <div
          className="absolute bottom-1 right-1.5 flex items-center gap-1"
          title={data.ownerName || 'Participant'}
        >
          <div
            className="h-2.5 w-2.5 rounded-full border border-white/60"
            style={{ backgroundColor: data.ownerColor || '#608850' }}
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
