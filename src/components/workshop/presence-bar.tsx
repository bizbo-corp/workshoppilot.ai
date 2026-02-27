'use client';

import { useRef, useState, useEffect } from 'react';
import { useOthers, useSelf, useOthersListener } from '@liveblocks/react';
import { shallow } from '@liveblocks/react';
import { Crown } from 'lucide-react';

const IDLE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * useIdleStatus — tracks which participants (by connectionId) have not moved
 * their cursor for more than IDLE_THRESHOLD_MS. Re-evaluated every 30 seconds.
 */
function useIdleStatus(): Set<number> {
  const lastSeenRef = useRef<Map<number, number>>(new Map());
  const [idleIds, setIdleIds] = useState<Set<number>>(new Set());

  useOthersListener(({ type, user }) => {
    if (type === 'enter') {
      // Treat new/reconnected users as freshly active
      lastSeenRef.current.set(user.connectionId, Date.now());
    } else if (type === 'leave') {
      lastSeenRef.current.delete(user.connectionId);
    } else if (type === 'update') {
      // Any cursor movement counts as activity
      if (user.presence?.cursor !== null && user.presence?.cursor !== undefined) {
        lastSeenRef.current.set(user.connectionId, Date.now());
      }
    }
  });

  // Re-evaluate idle status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newIdleIds = new Set<number>();
      lastSeenRef.current.forEach((lastSeen, connectionId) => {
        if (now - lastSeen > IDLE_THRESHOLD_MS) {
          newIdleIds.add(connectionId);
        }
      });
      setIdleIds(newIdleIds);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return idleIds;
}

/** Derive two-letter initials from a display name. */
function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  );
}

/**
 * PresenceBar — fixed top-right avatar stack showing all connected participants.
 *
 * - Collapsed: overlapping colored circles with initials
 * - Expanded: full list with name, online/idle dot, and crown for the facilitator
 * - Idle participants (no cursor activity for 2+ min) shown semi-transparent with a yellow dot
 *
 * Must be rendered inside the Liveblocks RoomProvider tree.
 */
export function PresenceBar() {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleIds = useIdleStatus();

  const others = useOthers(
    (others) =>
      others.map((o) => ({
        connectionId: o.connectionId,
        name: o.info?.name ?? 'Unknown',
        color: o.info?.color ?? '#6366f1',
        role: o.info?.role ?? 'participant',
      })),
    shallow,
  );

  const self = useSelf((me) => ({
    name: me.info?.name ?? 'You',
    color: me.info?.color ?? '#6366f1',
    role: me.info?.role ?? 'participant',
  }));

  const allParticipants = self
    ? [{ ...self, connectionId: -1, isSelf: true }, ...others.map((o) => ({ ...o, isSelf: false }))]
    : others.map((o) => ({ ...o, isSelf: false }));

  // Close expanded panel when clicking outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    if (expanded) {
      document.addEventListener('mousedown', handleMouseDown);
    }
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [expanded]);

  return (
    <div className="fixed top-3 right-3 z-50 flex flex-col items-end gap-2" ref={containerRef}>
      {/* Collapsed: avatar stack — click to expand */}
      <div
        className="flex items-center -space-x-1 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {allParticipants.map((p) => {
          const isIdle = !p.isSelf && idleIds.has(p.connectionId);
          return (
            <div
              key={p.connectionId}
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-background"
              style={{
                backgroundColor: p.color,
                opacity: isIdle ? 0.5 : 1,
              }}
              title={p.isSelf ? `${p.name} (you) — Facilitator` : p.role === 'owner' ? `${p.name} — Facilitator` : p.name}
            >
              {getInitials(p.name)}
              {isIdle && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-background" />
              )}
              {p.role === 'owner' && !isIdle && (
                <span className="absolute -top-1 -left-1 w-3.5 h-3.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500 drop-shadow-sm" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded: full participant list */}
      {expanded && (
        <div className="bg-card rounded-xl shadow-lg border border-border p-3 min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Participants ({allParticipants.length})
          </div>
          {allParticipants.map((p) => {
            const isIdle = !p.isSelf && idleIds.has(p.connectionId);
            return (
              <div key={p.connectionId} className="flex items-center gap-2 py-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                  style={{ backgroundColor: p.color, opacity: isIdle ? 0.5 : 1 }}
                >
                  {getInitials(p.name)}
                </div>
                <span className="text-sm text-foreground flex-1 truncate">
                  {p.name}
                  {p.isSelf && (
                    <span className="text-muted-foreground ml-1">(you)</span>
                  )}
                </span>
                {p.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                {/* Online/idle status dot */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isIdle ? 'bg-yellow-400' : 'bg-green-500'
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
