'use client';

/**
 * ClusterHullsOverlay Component
 *
 * Renders draggable cluster hull boxes as HTML divs OUTSIDE ReactFlow.
 * Each hull has a colored header bar (the primary drag handle) with a grip icon
 * and the cluster name, plus a tinted content area with a dashed border.
 * Nodes inside remain fully clickable via pointer-events:none on the content area.
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
  { fill: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.30)', text: '#6366f1', activeFill: 'rgba(99, 102, 241, 0.15)', headerBg: 'rgba(99, 102, 241, 0.65)' },
  { fill: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.30)', text: '#10b981', activeFill: 'rgba(16, 185, 129, 0.15)', headerBg: 'rgba(16, 185, 129, 0.65)' },
  { fill: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.30)', text: '#f59e0b', activeFill: 'rgba(245, 158, 11, 0.15)', headerBg: 'rgba(245, 158, 11, 0.65)' },
  { fill: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.30)', text: '#ef4444', activeFill: 'rgba(239, 68, 68, 0.15)', headerBg: 'rgba(239, 68, 68, 0.65)' },
  { fill: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.30)', text: '#a855f7', activeFill: 'rgba(168, 85, 247, 0.15)', headerBg: 'rgba(168, 85, 247, 0.65)' },
  { fill: 'rgba(14, 165, 233, 0.08)', border: 'rgba(14, 165, 233, 0.30)', text: '#0ea5e9', activeFill: 'rgba(14, 165, 233, 0.15)', headerBg: 'rgba(14, 165, 233, 0.65)' },
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

/** Height of the header bar in screen pixels */
const HEADER_H = 28;
/** Width of edge grab zones (sides + bottom) in screen pixels */
const EDGE_GRAB = 12;

interface ClusterHullsOverlayProps {
  onSelectCluster?: (memberIds: string[]) => void;
  onRenameCluster?: (oldName: string, newName: string) => void;
}

export function ClusterHullsOverlay({ onSelectCluster, onRenameCluster }: ClusterHullsOverlayProps) {
  const postIts = useCanvasStore((s) => s.postIts);
  const batchUpdatePositions = useCanvasStore((s) => s.batchUpdatePositions);
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  const dragRef = useRef<DragState | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const postItsRef = useRef(postIts);
  postItsRef.current = postIts;

  const [isDragging, setIsDragging] = useState(false);

  // Inline rename state
  const [editingHullName, setEditingHullName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

        // Full hull rectangle including header
        const fullTop = sy - HEADER_H;
        const fullHeight = sh + HEADER_H;
        const isEditing = editingHullName === hull.name;

        return (
          <div key={hull.name}>
            {/* Background fill + dashed border — single div, properly aligned */}
            <div
              className="absolute"
              style={{
                left: sx,
                top: fullTop,
                width: sw,
                height: fullHeight,
                background: hull.color.fill,
                border: `1.5px dashed ${hull.color.border}`,
                borderRadius: 10,
                pointerEvents: 'none',
                zIndex: 1,
                boxSizing: 'border-box',
              }}
            />

            {/* Header bar — primary drag handle with grip icon + cluster name */}
            <div
              className="absolute flex items-center gap-1.5 select-none"
              style={{
                left: sx,
                top: fullTop,
                width: sw,
                height: HEADER_H,
                background: hull.color.headerBg,
                borderRadius: '10px 10px 0 0',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isEditing ? 50 : 36,
                paddingLeft: 8,
                paddingRight: 8,
                boxSizing: 'border-box',
              }}
              onMouseDown={(e) => startDrag(e, hull)}
            >
              {/* Grip dots — visual drag affordance */}
              <svg width="6" height="10" viewBox="0 0 6 10" fill="white" opacity={0.5} className="flex-shrink-0">
                <circle cx="1" cy="1" r="1" />
                <circle cx="5" cy="1" r="1" />
                <circle cx="1" cy="5" r="1" />
                <circle cx="5" cy="5" r="1" />
                <circle cx="1" cy="9" r="1" />
                <circle cx="5" cy="9" r="1" />
              </svg>

              {/* Cluster name — double-click to rename */}
              {isEditing ? (
                <input
                  className="text-[11px] font-semibold bg-white/20 text-white placeholder-white/50 px-1 py-0 rounded outline-none flex-1 min-w-0"
                  value={editValue}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      setEditingHullName(null);
                    }
                  }}
                  onBlur={() => {
                    const trimmed = editValue.trim();
                    if (trimmed && trimmed !== hull.name) {
                      onRenameCluster?.(hull.name, trimmed);
                    }
                    setEditingHullName(null);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-[11px] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis cursor-text"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingHullName(hull.name);
                    setEditValue(hull.name);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {hull.name}
                </span>
              )}
            </div>

            {/* Edge grab zones — sides and bottom for secondary drag access */}
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
              onMouseDown={(e) => startDrag(e, hull)}
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
              onMouseDown={(e) => startDrag(e, hull)}
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
              onMouseDown={(e) => startDrag(e, hull)}
            />
          </div>
        );
      })}
    </>
  );
}
