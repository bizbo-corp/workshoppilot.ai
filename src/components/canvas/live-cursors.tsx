'use client';

import { useCallback } from 'react';
import { ViewportPortal, useReactFlow } from '@xyflow/react';
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
// LiveCursors — renders all remote participants' cursors inside ViewportPortal
// so they pan and zoom correctly with the canvas.
// Only mounted in multiplayer mode.
// ---------------------------------------------------------------------------

export function LiveCursors() {
  const others = useOthersMapped(
    (other) => ({
      cursor: other.presence.cursor,
      name: other.info?.name ?? 'Unknown',
      color: other.info?.color ?? '#608850',
      role: other.info?.role ?? 'participant',
    }),
    shallow,
  );

  return (
    <ViewportPortal>
      {others.map(([connectionId, data]) => {
        if (!data.cursor) return null;
        return (
          <div
            key={connectionId}
            style={{
              position: 'absolute',
              transform: `translate(${data.cursor.x}px, ${data.cursor.y}px)`,
              pointerEvents: 'none',
              userSelect: 'none',
              transition: 'transform 80ms linear',
              zIndex: 9999,
            }}
          >
            <CursorArrow color={data.color} />
            <CursorLabel
              name={data.name}
              color={data.color}
              isFacilitator={data.role === 'owner'}
            />
          </div>
        );
      })}
    </ViewportPortal>
  );
}
