'use client';

/**
 * PersonaFrameOverlay Component
 *
 * Renders visible rectangular frames for each persona card in the user-research step.
 * Frames appear as soon as persona cards exist (before any sticky notes are assigned).
 * Each frame has a colored header bar (drag handle) and a dashed-border drop zone.
 *
 * Follows the same HTML-overlay-outside-ReactFlow pattern as ClusterHullsOverlay.
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import type { StickyNote } from '@/stores/canvas-store';
import {
  extractPersonaName,
  isPersonaCardNote,
  PERSONA_COL_WIDTH,
  PERSONA_AVATAR_H,
} from '@/lib/canvas/canvas-position';

const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

/** Frame dimensions in canvas-space pixels. Columns are uniform width; height is
 *  equalised across all columns (the tallest wins) so the swimlanes read as an
 *  aligned table. */
const FRAME_PADDING = 24;
const HEADER_H = 28;
const EDGE_GRAB = 12;
/** Uniform column frame width: the insight column + padding on both sides. */
const FRAME_WIDTH = PERSONA_COL_WIDTH + FRAME_PADDING * 2;
/** Minimum column height (avatar/name block + padding) before insights extend it. */
const MIN_FRAME_HEIGHT = PERSONA_AVATAR_H + FRAME_PADDING * 2;

/**
 * Olive sage frame appearance — identical to the cluster-hull containers used in
 * the Stakeholder Mapping step (see cluster-hulls-overlay.tsx HULL_COLORS), so the
 * group containers read consistently across steps. White header text + grip dots
 * sit on the olive-600 sage header for contrast.
 */
const OLIVE_FRAME = {
  fill: 'rgba(139, 150, 121, 0.12)',   // olive-500 tint
  border: 'rgba(118, 131, 100, 0.5)',  // olive-600
  headerBg: '#768364',                  // olive-600 — brand sage green
  text: '#ffffff',
};

export type PersonaFrameData = {
  cardId: string;
  /** Persona first name (also the cluster key) — shown in the header + avatar. */
  name: string;
  /** Archetype / characteristic, e.g. "The Anxious Novice" (header only). */
  characteristic: string;
  color: string;
  /** Canvas-space bounds of the frame (uniform width; equalised height). */
  bounds: { x: number; y: number; width: number; height: number };
  /** All member IDs: persona card + clustered children */
  memberIds: string[];
};

/**
 * Derive the persona swimlane frames from the current sticky notes. One uniform
 * column per persona card; all columns share the tallest column's height so the
 * lanes align as a table. Shared by the overlay AND the drop-into-frame handler
 * so the two never drift. Assumes notes are laid out by computePersonaColumnLayout.
 */
export function computePersonaFrames(stickyNotes: StickyNote[]): PersonaFrameData[] {
  const items = stickyNotes.filter((p) => (!p.type || p.type === 'stickyNote') && !p.isPreview);

  const childrenFor = (card: StickyNote) => {
    const personaNameLower = extractPersonaName(card.text);
    return items.filter(
      (p) => p.cluster && p.id !== card.id && (
        p.cluster.toLowerCase() === personaNameLower
        || extractPersonaName(p.cluster) === personaNameLower
        || personaNameLower.startsWith(p.cluster.toLowerCase())
      ),
    );
  };

  const personaCards = items.filter((p) => isPersonaCardNote(p, items));
  if (personaCards.length === 0) return [];

  const frames = personaCards.map((card) => {
    // Label = text before any em-dash; split first name vs characteristic on the
    // first comma ("Anna, The Anxious Novice" → "Anna" + "The Anxious Novice").
    const label = card.text.split(/\s*[—–]\s*/)[0].trim();
    const commaIdx = label.indexOf(',');
    const name = (commaIdx > 0 ? label.slice(0, commaIdx) : label).trim();
    const characteristic = commaIdx > 0 ? label.slice(commaIdx + 1).trim() : '';
    const color = card.color || 'yellow';
    const children = childrenFor(card);

    const frameX = card.position.x - FRAME_PADDING;
    const frameY = card.position.y - FRAME_PADDING;

    let maxBottom = card.position.y + card.height;
    for (const c of children) maxBottom = Math.max(maxBottom, c.position.y + c.height);
    const naturalHeight = Math.max(MIN_FRAME_HEIGHT, maxBottom - frameY + FRAME_PADDING);

    return {
      cardId: card.id,
      name,
      characteristic,
      color,
      bounds: { x: frameX, y: frameY, width: FRAME_WIDTH, height: naturalHeight },
      memberIds: [card.id, ...children.map((c) => c.id)],
    };
  });

  // Equalise heights across the row — every column grows to the tallest.
  const maxHeight = Math.max(...frames.map((f) => f.bounds.height));
  for (const f of frames) f.bounds.height = maxHeight;
  return frames;
}

type DragState = {
  startMouseX: number;
  startMouseY: number;
  initialPositions: Map<string, { x: number; y: number }>;
  memberIds: string[];
};

export function PersonaFrameOverlay() {
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);
  const batchUpdatePositions = useCanvasStore((s) => s.batchUpdatePositions);
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  const dragRef = useRef<DragState | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const stickyNotesRef = useRef(stickyNotes);
  stickyNotesRef.current = stickyNotes;

  const [isDragging, setIsDragging] = useState(false);

  const frames = useMemo<PersonaFrameData[]>(
    () => computePersonaFrames(stickyNotes),
    [stickyNotes],
  );

  // --- Drag ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const z = zoomRef.current;
    const dx = (e.clientX - drag.startMouseX) / z;
    const dy = (e.clientY - drag.startMouseY) / z;

    const updates = drag.memberIds.map(id => {
      const init = drag.initialPositions.get(id)!;
      return { id, position: { x: init.x + dx, y: init.y + dy } };
    });
    batchUpdatePositions(updates);
  }, [batchUpdatePositions]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startDrag = useCallback((e: React.MouseEvent, frame: PersonaFrameData) => {
    e.stopPropagation();
    e.preventDefault();

    const items = stickyNotesRef.current;
    const initialPositions = new Map<string, { x: number; y: number }>();
    for (const id of frame.memberIds) {
      const p = items.find(pi => pi.id === id);
      if (p) initialPositions.set(id, { ...p.position });
    }

    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialPositions,
      memberIds: frame.memberIds,
    };

    setIsDragging(true);
    document.body.style.cursor = 'grabbing';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  if (frames.length === 0) return null;

  return (
    <>
      {frames.map((frame) => {
        const colors = OLIVE_FRAME;

        // Convert canvas-space frame bounds → screen-space
        const sx = frame.bounds.x * zoom + x;
        const sy = frame.bounds.y * zoom + y;
        const sw = frame.bounds.width * zoom;
        const sh = frame.bounds.height * zoom;

        // Full frame rectangle including header
        const fullTop = sy - HEADER_H;
        const fullHeight = sh + HEADER_H;

        return (
          <div key={frame.cardId}>
            {/* Background fill + dashed border */}
            <div
              className="absolute"
              style={{
                left: sx,
                top: fullTop,
                width: sw,
                height: fullHeight,
                background: colors.fill,
                border: `1.5px dashed ${colors.border}`,
                borderRadius: 10,
                pointerEvents: 'none',
                zIndex: 1,
                boxSizing: 'border-box',
              }}
            />

            {/* Header bar — drag handle */}
            <div
              className="absolute flex items-center gap-1.5 select-none"
              style={{
                left: sx,
                top: fullTop,
                width: sw,
                height: HEADER_H,
                background: colors.headerBg,
                borderRadius: '10px 10px 0 0',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 10,
                paddingLeft: 8,
                paddingRight: 8,
                boxSizing: 'border-box',
              }}
              onMouseDown={(e) => startDrag(e, frame)}
            >
              {/* Grip dots */}
              <svg width="6" height="10" viewBox="0 0 6 10" fill={colors.text} opacity={0.5} className="flex-shrink-0">
                <circle cx="1" cy="1" r="1" />
                <circle cx="5" cy="1" r="1" />
                <circle cx="1" cy="5" r="1" />
                <circle cx="5" cy="5" r="1" />
                <circle cx="1" cy="9" r="1" />
                <circle cx="5" cy="9" r="1" />
              </svg>

              {/* Header: "<name> - <brief title>". Name always shown; the title
                  (characteristic) follows after a dash and truncates if tight. */}
              <div className="flex min-w-0 items-baseline gap-1">
                <span
                  className="text-[11px] font-semibold whitespace-nowrap"
                  style={{ color: colors.text }}
                >
                  {frame.name}
                </span>
                {frame.characteristic && (
                  <span
                    className="flex min-w-0 items-baseline gap-1 text-[11px] font-normal opacity-80"
                    style={{ color: colors.text }}
                  >
                    <span aria-hidden>-</span>
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                      {frame.characteristic}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Edge grab zones for secondary drag access */}
            {/* Left edge */}
            <div
              style={{
                position: 'absolute',
                left: sx - EDGE_GRAB / 2,
                top: sy,
                width: EDGE_GRAB,
                height: sh,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 10,
              }}
              onMouseDown={(e) => startDrag(e, frame)}
            />
            {/* Right edge */}
            <div
              style={{
                position: 'absolute',
                left: sx + sw - EDGE_GRAB / 2,
                top: sy,
                width: EDGE_GRAB,
                height: sh,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 10,
              }}
              onMouseDown={(e) => startDrag(e, frame)}
            />
            {/* Bottom edge */}
            <div
              style={{
                position: 'absolute',
                left: sx - EDGE_GRAB / 2,
                top: sy + sh - EDGE_GRAB / 2,
                width: sw + EDGE_GRAB,
                height: EDGE_GRAB,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 10,
              }}
              onMouseDown={(e) => startDrag(e, frame)}
            />
          </div>
        );
      })}
    </>
  );
}

/**
 * Exported constants for frame-bounds proximity detection in react-flow-canvas.
 * Used by the drag-end handler to check if a dropped sticky note is inside a persona frame.
 */
export { FRAME_WIDTH, MIN_FRAME_HEIGHT, FRAME_PADDING };
