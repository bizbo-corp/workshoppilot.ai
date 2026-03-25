'use client';

import { useCallback, useMemo } from 'react';
import { useReactFlow, useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import { useUpdateMyPresence, useOthersMapped, shallow } from '@liveblocks/react';
import { Crown } from 'lucide-react';

// ---------------------------------------------------------------------------
// CursorArrow — SVG arrow cursor in the participant's assigned color
// ---------------------------------------------------------------------------

function CursorArrow({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}
    >
      <path
        d="M3 2L17 10L10 11L7 18L3 2Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CursorLabel — colored pill with participant name; crown icon for facilitator
// ---------------------------------------------------------------------------

function CursorLabel({
  name,
  color,
  isFacilitator,
}: {
  name: string;
  color: string;
  isFacilitator: boolean;
}) {
  return (
    <div
      className="ml-4 -mt-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white whitespace-nowrap shadow-sm"
      style={{ backgroundColor: color }}
    >
      {isFacilitator && <Crown className="w-3 h-3" />}
      {name}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CursorBroadcaster — renderless; populates handlersRef with mouse handlers
// so the parent ReactFlow component can wire onMouseMove / onMouseLeave.
// Only mounted in multiplayer mode — calls Liveblocks hooks safely inside RoomProvider.
// ---------------------------------------------------------------------------

interface CursorBroadcasterProps {
  handlersRef: React.MutableRefObject<{
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
  } | null>;
}

export function CursorBroadcaster({ handlersRef }: CursorBroadcasterProps) {
  const updateMyPresence = useUpdateMyPresence();
  const { screenToFlowPosition } = useReactFlow();

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      updateMyPresence({ cursor: flowPos });
    },
    [updateMyPresence, screenToFlowPosition],
  );

  const handleMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  // Populate ref so parent can wire handlers to ReactFlow props.
  // Safe to assign in render — ref mutation is not a React side effect.
  handlersRef.current = { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };

  return null;
}

// ---------------------------------------------------------------------------
// LiveCursors — renders all remote participants' cursors as an absolutely-
// positioned overlay outside ReactFlow, converting flow-space coordinates to
// screen coordinates via the viewport transform. This ensures cursors render
// above all canvas overlays (concentric rings, empathy map zones, etc.).
// Only mounted in multiplayer mode.
// ---------------------------------------------------------------------------

const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

export function LiveCursors() {
  const { x, y, zoom } = useReactFlowStore(viewportSelector);
  const others = useOthersMapped(
    (other) => ({
      cursor: other.presence.cursor,
      name: other.info?.name ?? 'Unknown',
      color: other.info?.color ?? '#608850',
      role: other.info?.role ?? 'participant',
    }),
    shallow,
  );

  // Show first name only; disambiguate duplicates with last initial
  const displayNames = useMemo(() => {
    const firstNameCounts = new Map<string, number>();
    for (const [, data] of others) {
      const firstName = data.name.split(' ')[0];
      firstNameCounts.set(firstName, (firstNameCounts.get(firstName) ?? 0) + 1);
    }
    const map = new Map<number, string>();
    for (const [connectionId, data] of others) {
      const parts = data.name.split(' ');
      const firstName = parts[0];
      if ((firstNameCounts.get(firstName) ?? 0) > 1 && parts.length > 1) {
        map.set(connectionId, `${firstName} ${parts[parts.length - 1][0]}.`);
      } else {
        map.set(connectionId, firstName);
      }
    }
    return map;
  }, [others]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[50]">
      {others.map(([connectionId, data]) => {
        if (!data.cursor) return null;
        const screenX = data.cursor.x * zoom + x;
        const screenY = data.cursor.y * zoom + y;
        return (
          <div
            key={connectionId}
            style={{
              position: 'absolute',
              transform: `translate(${screenX}px, ${screenY}px)`,
              pointerEvents: 'none',
              userSelect: 'none',
              transition: 'transform 80ms linear',
            }}
          >
            <CursorArrow color={data.color} />
            <CursorLabel
              name={displayNames.get(connectionId) ?? data.name}
              color={data.color}
              isFacilitator={data.role === 'owner'}
            />
          </div>
        );
      })}
    </div>
  );
}
