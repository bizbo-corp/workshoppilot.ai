'use client';

/**
 * PersonaFrameOverlay Component
 *
 * Renders visible rectangular frames for each persona card in the user-research step.
 * Frames appear as soon as persona cards exist (before any post-its are assigned).
 * Each frame has a colored header bar (drag handle) and a dashed-border drop zone.
 *
 * Follows the same HTML-overlay-outside-ReactFlow pattern as ClusterHullsOverlay.
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import type { PostIt } from '@/stores/canvas-store';

const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

/** Frame dimensions in canvas-space pixels */
const FRAME_WIDTH = 350;
const MIN_FRAME_HEIGHT = 400;
const FRAME_PADDING = 24;
const HEADER_H = 28;
const EDGE_GRAB = 12;

/** Color mapping from PostItColor to frame appearance */
const FRAME_COLORS: Record<string, { fill: string; border: string; headerBg: string }> = {
  pink:   { fill: 'rgba(236, 72, 153, 0.06)', border: 'rgba(236, 72, 153, 0.25)', headerBg: 'rgba(236, 72, 153, 0.55)' },
  blue:   { fill: 'rgba(59, 130, 246, 0.06)', border: 'rgba(59, 130, 246, 0.25)', headerBg: 'rgba(59, 130, 246, 0.55)' },
  green:  { fill: 'rgba(34, 197, 94, 0.06)',  border: 'rgba(34, 197, 94, 0.25)',  headerBg: 'rgba(34, 197, 94, 0.55)' },
  yellow: { fill: 'rgba(234, 179, 8, 0.06)',  border: 'rgba(234, 179, 8, 0.25)',  headerBg: 'rgba(234, 179, 8, 0.55)' },
  orange: { fill: 'rgba(249, 115, 22, 0.06)', border: 'rgba(249, 115, 22, 0.25)', headerBg: 'rgba(249, 115, 22, 0.55)' },
  red:    { fill: 'rgba(239, 68, 68, 0.06)',  border: 'rgba(239, 68, 68, 0.25)',  headerBg: 'rgba(239, 68, 68, 0.55)' },
};

const DEFAULT_FRAME_COLOR = FRAME_COLORS.yellow;

export type PersonaFrameData = {
  cardId: string;
  name: string;
  color: string;
  /** Canvas-space bounds of the frame (below the persona card) */
  bounds: { x: number; y: number; width: number; height: number };
  /** All member IDs: persona card + clustered children */
  memberIds: string[];
};

type DragState = {
  startMouseX: number;
  startMouseY: number;
  initialPositions: Map<string, { x: number; y: number }>;
  memberIds: string[];
};

export function PersonaFrameOverlay() {
  const postIts = useCanvasStore((s) => s.postIts);
  const batchUpdatePositions = useCanvasStore((s) => s.batchUpdatePositions);
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  const dragRef = useRef<DragState | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const postItsRef = useRef(postIts);
  postItsRef.current = postIts;

  const [isDragging, setIsDragging] = useState(false);

  const frames = useMemo<PersonaFrameData[]>(() => {
    const items = postIts.filter(p => (!p.type || p.type === 'postIt') && !p.isPreview);

    // Find persona cards: unclustered post-its with em-dash in text
    const personaCards = items.filter(p => !p.cluster && p.text.includes(' — '));
    if (personaCards.length === 0) return [];

    return personaCards.map(card => {
      const personaName = card.text.split(/\s*[—–]\s*/)[0].trim();
      const color = card.color || 'yellow';

      // Find clustered children for this persona
      const children = items.filter(
        p => p.cluster && p.cluster.toLowerCase() === personaName.toLowerCase() && p.id !== card.id
      );

      // Frame is centered on card's X, starts just below card
      const frameX = card.position.x + card.width / 2 - FRAME_WIDTH / 2;
      const frameY = card.position.y + card.height + 10; // small gap below card

      // Calculate height: min height or extend to contain all children
      let frameHeight = MIN_FRAME_HEIGHT;
      if (children.length > 0) {
        const childMaxY = Math.max(...children.map(c => c.position.y + c.height));
        const neededHeight = childMaxY - frameY + FRAME_PADDING;
        frameHeight = Math.max(MIN_FRAME_HEIGHT, neededHeight);
      }

      // Member IDs: card + all children
      const memberIds = [card.id, ...children.map(c => c.id)];

      return {
        cardId: card.id,
        name: personaName,
        color,
        bounds: { x: frameX, y: frameY, width: FRAME_WIDTH, height: frameHeight },
        memberIds,
      };
    });
  }, [postIts]);

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

    const items = postItsRef.current;
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
        const colors = FRAME_COLORS[frame.color] || DEFAULT_FRAME_COLOR;

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
                zIndex: 36,
                paddingLeft: 8,
                paddingRight: 8,
                boxSizing: 'border-box',
              }}
              onMouseDown={(e) => startDrag(e, frame)}
            >
              {/* Grip dots */}
              <svg width="6" height="10" viewBox="0 0 6 10" fill="white" opacity={0.5} className="flex-shrink-0">
                <circle cx="1" cy="1" r="1" />
                <circle cx="5" cy="1" r="1" />
                <circle cx="1" cy="5" r="1" />
                <circle cx="5" cy="5" r="1" />
                <circle cx="1" cy="9" r="1" />
                <circle cx="5" cy="9" r="1" />
              </svg>

              {/* Persona name */}
              <span className="text-[11px] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                {frame.name}
              </span>
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
                zIndex: 35,
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
                zIndex: 35,
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
                zIndex: 35,
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
 * Used by the drag-end handler to check if a dropped post-it is inside a persona frame.
 */
export { FRAME_WIDTH, MIN_FRAME_HEIGHT, FRAME_PADDING };
