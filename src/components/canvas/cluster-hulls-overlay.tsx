'use client';

/**
 * ClusterHullsOverlay Component
 *
 * Renders draggable cluster hull boxes as HTML divs OUTSIDE ReactFlow.
 * Uses an "inset mask" trick: each hull is a positioned div with a thick transparent
 * border (the grab zone) and pointer-events:none interior, so nodes inside remain
 * fully clickable while the border area is draggable.
 *
 * Visual: the background tint is rendered via an inner div with pointer-events:none.
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

const HULL_COLORS = [
  { fill: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.35)', text: '#6366f1', activeFill: 'rgba(99, 102, 241, 0.15)' },
  { fill: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.35)', text: '#10b981', activeFill: 'rgba(16, 185, 129, 0.15)' },
  { fill: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.35)', text: '#f59e0b', activeFill: 'rgba(245, 158, 11, 0.15)' },
  { fill: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.35)', text: '#ef4444', activeFill: 'rgba(239, 68, 68, 0.15)' },
  { fill: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.35)', text: '#a855f7', activeFill: 'rgba(168, 85, 247, 0.15)' },
  { fill: 'rgba(14, 165, 233, 0.08)', border: 'rgba(14, 165, 233, 0.35)', text: '#0ea5e9', activeFill: 'rgba(14, 165, 233, 0.15)' },
];

export type ClusterHullData = {
  name: string;
  memberIds: string[];
  /** Canvas-space bounds (before viewport transform) */
  bounds: { x: number; y: number; width: number; height: number };
  color: typeof HULL_COLORS[number];
};

type DragState = {
  startMouseX: number;
  startMouseY: number;
  initialPositions: Map<string, { x: number; y: number }>;
  memberIds: string[];
};

/** Grab zone width in screen pixels — the border area that responds to pointer events */
const GRAB_ZONE = 28;

interface ClusterHullsOverlayProps {
  onSelectCluster?: (memberIds: string[]) => void;
}

export function ClusterHullsOverlay({ onSelectCluster }: ClusterHullsOverlayProps) {
  const postIts = useCanvasStore((s) => s.postIts);
  const batchUpdatePositions = useCanvasStore((s) => s.batchUpdatePositions);
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  const dragRef = useRef<DragState | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const postItsRef = useRef(postIts);
  postItsRef.current = postIts;

  const [isDragging, setIsDragging] = useState(false);

  const hulls = useMemo<ClusterHullData[]>(() => {
    const items = postIts.filter(p => (!p.type || p.type === 'postIt') && !p.isPreview);

    const clusterMap = new Map<string, PostIt[]>();
    for (const item of items) {
      if (!item.cluster) continue;
      const key = item.cluster.toLowerCase();
      if (!clusterMap.has(key)) clusterMap.set(key, []);
      clusterMap.get(key)!.push(item);
    }

    const result: ClusterHullData[] = [];
    let colorIdx = 0;

    for (const [key, children] of clusterMap) {
      const parent = items.find(p => p.text.toLowerCase() === key && !p.cluster);
      const members = parent ? [parent, ...children] : children;
      if (members.length < 2) continue;

      const padding = 24;
      const minX = Math.min(...members.map(m => m.position.x)) - padding;
      const minY = Math.min(...members.map(m => m.position.y)) - padding;
      const maxX = Math.max(...members.map(m => m.position.x + m.width)) + padding;
      const maxY = Math.max(...members.map(m => m.position.y + m.height)) + padding;

      result.push({
        name: children[0]?.cluster || key,
        memberIds: members.map(m => m.id),
        bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        color: HULL_COLORS[colorIdx % HULL_COLORS.length],
      });
      colorIdx++;
    }

    return result;
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startDrag = useCallback((e: React.MouseEvent, hull: ClusterHullData) => {
    e.stopPropagation();
    e.preventDefault();

    const items = postItsRef.current;
    const initialPositions = new Map<string, { x: number; y: number }>();
    for (const id of hull.memberIds) {
      const p = items.find(pi => pi.id === id);
      if (p) initialPositions.set(id, { ...p.position });
    }

    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialPositions,
      memberIds: hull.memberIds,
    };

    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
    onSelectCluster?.(hull.memberIds);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onSelectCluster, handleMouseMove, handleMouseUp]);

  if (hulls.length === 0) return null;

  return (
    <>
      {hulls.map((hull) => {
        // Convert canvas-space bounds → screen-space
        const sx = hull.bounds.x * zoom + x;
        const sy = hull.bounds.y * zoom + y;
        const sw = hull.bounds.width * zoom;
        const sh = hull.bounds.height * zoom;

        return (
          <div key={hull.name}>
            {/* Background tint — below everything, not interactive */}
            <div
              className="absolute rounded-lg"
              style={{
                left: sx,
                top: sy,
                width: sw,
                height: sh,
                background: hull.color.fill,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

            {/* Grab frame — the border zone that captures mouse events.
                Uses a thick transparent border that IS the grab zone,
                and an inner area that passes clicks through to nodes. */}
            <div
              className="absolute rounded-lg transition-shadow duration-150"
              style={{
                left: sx - GRAB_ZONE / 2,
                top: sy - GRAB_ZONE / 2,
                width: sw + GRAB_ZONE,
                height: sh + GRAB_ZONE,
                // The border IS the interactive area
                border: `${GRAB_ZONE / 2}px solid transparent`,
                borderRadius: 12,
                // Visual dashed border rendered via outline (inside the grab zone)
                outline: `1.5px dashed ${hull.color.border}`,
                outlineOffset: -GRAB_ZONE / 2,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 35,
                // The box-sizing ensures the border is OUTSIDE the content area
                boxSizing: 'content-box',
                // Pointer events only on the border, NOT the content interior
                pointerEvents: 'none',
              }}
            >
              {/* Inner transparent div — blocks the grab zone over the interior */}
            </div>

            {/* Four edge grab zones — positioned on each side of the hull.
                This avoids covering the interior where nodes live. */}
            {/* Top edge */}
            <div
              style={{
                position: 'absolute',
                left: sx - GRAB_ZONE / 2,
                top: sy - GRAB_ZONE / 2,
                width: sw + GRAB_ZONE,
                height: GRAB_ZONE,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 35,
              }}
              onMouseDown={(e) => startDrag(e, hull)}
            />
            {/* Bottom edge */}
            <div
              style={{
                position: 'absolute',
                left: sx - GRAB_ZONE / 2,
                top: sy + sh - GRAB_ZONE / 2,
                width: sw + GRAB_ZONE,
                height: GRAB_ZONE,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 35,
              }}
              onMouseDown={(e) => startDrag(e, hull)}
            />
            {/* Left edge */}
            <div
              style={{
                position: 'absolute',
                left: sx - GRAB_ZONE / 2,
                top: sy + GRAB_ZONE / 2,
                width: GRAB_ZONE,
                height: sh - GRAB_ZONE,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 35,
              }}
              onMouseDown={(e) => startDrag(e, hull)}
            />
            {/* Right edge */}
            <div
              style={{
                position: 'absolute',
                left: sx + sw - GRAB_ZONE / 2,
                top: sy + GRAB_ZONE / 2,
                width: GRAB_ZONE,
                height: sh - GRAB_ZONE,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 35,
              }}
              onMouseDown={(e) => startDrag(e, hull)}
            />

            {/* Label pill */}
            <div
              className="absolute"
              style={{
                left: sx + 6,
                top: sy + 4,
                zIndex: 36,
                pointerEvents: 'none',
              }}
            >
              <span
                className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/90 dark:bg-zinc-800/90 shadow-sm whitespace-nowrap"
                style={{ color: hull.color.text }}
              >
                {hull.name}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
