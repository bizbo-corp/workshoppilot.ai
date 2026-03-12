'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useOthers, useSelf, useOthersListener, useBroadcastEvent } from '@liveblocks/react';
import { shallow } from '@liveblocks/react';
import { Crown, Check, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCanvasStore } from '@/providers/canvas-store-provider';

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
      lastSeenRef.current.set(user.connectionId, Date.now());
    } else if (type === 'leave') {
      lastSeenRef.current.delete(user.connectionId);
    } else if (type === 'update') {
      if (user.presence?.cursor !== null && user.presence?.cursor !== undefined) {
        lastSeenRef.current.set(user.connectionId, Date.now());
      }
    }
  });

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

interface PresenceBarProps {
  shareToken?: string | null;
  workshopSessionId?: string | null;
  workshopId?: string;
  isFacilitator?: boolean;
}

/**
 * PresenceBar — fixed top-right avatar stack showing all connected participants.
 *
 * - Collapsed: overlapping colored circles with initials
 * - Expanded: full participant management dropdown with:
 *   - Share link copy button (facilitator only)
 *   - Participant list with online/idle status
 *   - Remove button per participant (facilitator only)
 *   - Crown badge for facilitator
 *   - Vote completion checkmarks during open voting
 *
 * Must be rendered inside the Liveblocks RoomProvider tree.
 */
export function PresenceBar({
  shareToken,
  workshopSessionId,
  workshopId,
  isFacilitator,
}: PresenceBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null); // participantId pending confirmation
  const [removeLoading, setRemoveLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleIds = useIdleStatus();
  const broadcast = useBroadcastEvent();

  const others = useOthers(
    (others) =>
      others.map((o) => ({
        connectionId: o.connectionId,
        id: o.id,
        name: o.info?.name ?? 'Unknown',
        color: o.info?.color ?? '#608850',
        role: o.info?.role ?? 'participant',
        participantId: o.info?.participantId ?? null,
      })),
    shallow,
  );

  const self = useSelf((me) => ({
    id: me.id,
    name: me.info?.name ?? 'You',
    color: me.info?.color ?? '#608850',
    role: me.info?.role ?? 'participant',
    participantId: me.info?.participantId ?? null,
  }));

  const dotVotes = useCanvasStore((s) => s.dotVotes);
  const votingSession = useCanvasStore((s) => s.votingSession);

  const allParticipants = self
    ? [{ ...self, connectionId: -1, isSelf: true }, ...others.map((o) => ({ ...o, isSelf: false }))]
    : others.map((o) => ({ ...o, isSelf: false }));

  const completedVoterIds = useMemo(() => {
    if (votingSession.status !== 'open') return new Set<string>();
    const countByVoter = new Map<string, number>();
    for (const vote of dotVotes) {
      countByVoter.set(vote.voterId, (countByVoter.get(vote.voterId) ?? 0) + 1);
    }
    const completed = new Set<string>();
    countByVoter.forEach((count, voterId) => {
      if (count >= votingSession.voteBudget) completed.add(voterId);
    });
    return completed;
  }, [dotVotes, votingSession.status, votingSession.voteBudget]);

  // Close expanded panel when clicking outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setRemovingId(null);
      }
    }
    if (expanded) {
      document.addEventListener('mousedown', handleMouseDown);
    }
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [expanded]);

  const handleCopyLink = useCallback(async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/join/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [shareToken]);

  const deleteOwnerContent = useCanvasStore((s) => s.deleteOwnerContent);

  const handleRemoveParticipant = useCallback(async (participantId: string) => {
    if (!workshopId) return;
    setRemoveLoading(true);
    try {
      // Remove canvas content (mind map nodes, crazy 8s slots, etc.)
      deleteOwnerContent(participantId);

      const res = await fetch('/api/remove-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, workshopId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove participant');
      }
      // Broadcast removal so the participant gets kicked in real-time
      broadcast({ type: 'PARTICIPANT_REMOVED', participantId });
      toast('Participant removed', { duration: 3000 });
      setRemovingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove participant');
    } finally {
      setRemoveLoading(false);
    }
  }, [workshopId, broadcast, deleteOwnerContent]);

  return (
    <div className="relative flex flex-col items-end gap-2" ref={containerRef}>
      {/* Collapsed: avatar stack — click to expand */}
      <div
        className="flex items-center -space-x-1 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {allParticipants.map((p) => {
          const isIdle = !p.isSelf && idleIds.has(p.connectionId);
          const isVoteComplete = votingSession.status === 'open' && !!p.id && completedVoterIds.has(p.id);
          return (
            <div
              key={p.connectionId}
              className="relative w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold ring-2 ring-card"
              style={{
                backgroundColor: p.color,
                opacity: isIdle ? 0.5 : 1,
              }}
              title={p.isSelf ? `${p.name} (you) — Facilitator` : p.role === 'owner' ? `${p.name} — Facilitator` : p.name}
            >
              {getInitials(p.name)}
              {isIdle && !isVoteComplete && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-card" />
              )}
              {p.role === 'owner' && !isIdle && !isVoteComplete && (
                <span className="absolute -top-1 -left-1 w-3.5 h-3.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500 drop-shadow-sm" />
                </span>
              )}
              {isVoteComplete && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card flex items-center justify-center">
                  <Check className="w-2 h-2 text-white" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded: participant management dropdown */}
      {expanded && (
        <div className="absolute top-full right-0 mt-2 bg-card rounded-xl shadow-lg border border-border p-3 min-w-[240px] max-w-[300px] animate-in fade-in-0 zoom-in-95 duration-150 z-50">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Participants ({allParticipants.length})
          </div>

          {/* Share link — facilitator only */}
          {isFacilitator && shareToken && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 w-full px-2 py-1.5 mb-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-dashed border-border"
            >
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left truncate">Invite Link</span>
              <span className="text-[10px] font-medium shrink-0">
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>
          )}

          {/* Participant list */}
          {allParticipants.map((p) => {
            const isIdle = !p.isSelf && idleIds.has(p.connectionId);
            const isVoteComplete = votingSession.status === 'open' && !!p.id && completedVoterIds.has(p.id);
            const canRemove = isFacilitator && !p.isSelf && p.role !== 'owner' && p.participantId;
            const isConfirming = removingId === p.participantId;

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
                {isVoteComplete && (
                  <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                {/* Online/idle status dot */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isIdle ? 'bg-yellow-400' : 'bg-green-500'
                  }`}
                />
                {/* Remove button — facilitator only, not on owner */}
                {canRemove && !isConfirming && (
                  <button
                    onClick={() => setRemovingId(p.participantId)}
                    className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title={`Remove ${p.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Inline confirmation */}
                {canRemove && isConfirming && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRemoveParticipant(p.participantId!)}
                      disabled={removeLoading}
                      className="text-[10px] font-medium text-destructive hover:text-destructive/80 disabled:opacity-50"
                    >
                      {removeLoading ? '...' : 'Remove?'}
                    </button>
                    <button
                      onClick={() => setRemovingId(null)}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
