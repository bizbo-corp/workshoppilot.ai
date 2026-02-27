'use client';

/**
 * GuestLobby — Waiting screen shown after a guest joins a multiplayer workshop.
 *
 * Polls /api/session-status/[token] every 3 seconds to:
 *   - Update the live participant list
 *   - Detect when the facilitator starts the session (status → 'active')
 *   - Auto-transition to the workshop canvas when the session becomes active
 *
 * Design decisions:
 * - Polling over Liveblocks Presence for the lobby: guests are not yet in the
 *   Liveblocks room (that requires a room token), so we poll the public REST endpoint.
 * - 3-second interval balances freshness vs. server load for a lobby with 2-5 participants.
 * - Auto-transition uses router.push (not window.location) to preserve Next.js nav state.
 * - Fade-out (opacity-0 + 500ms transition) before navigation for smooth UX.
 * - Late joiners (status already 'active' on mount) see "Workshop in progress..."
 *   for 2 seconds then are redirected — gives visual feedback without abrupt jump.
 * - Failed polling (3 consecutive errors) shows a warning toast but keeps retrying.
 * - CSS-only pulse animation (no framer-motion) — lightweight for a lobby screen.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Participant {
  id: string;
  displayName: string;
  color: string;
  role: 'owner' | 'participant';
}

interface SessionStatusResponse {
  status: 'waiting' | 'active' | 'ended';
  workshopTitle: string;
  participantCount: number;
  participants: Participant[];
}

interface GuestLobbyProps {
  token: string;
  workshopTitle: string;
  sessionStatus: 'waiting' | 'active' | 'ended';
  aiSessionId: string | null;
  currentStepOrder: number;
  participantId: string;
  displayName: string;
  color: string;
}

export function GuestLobby({
  token,
  workshopTitle: initialTitle,
  sessionStatus: initialStatus,
  aiSessionId,
  currentStepOrder,
  participantId,
  displayName,
  color,
}: GuestLobbyProps) {
  const router = useRouter();

  const [status, setStatus] = useState<'waiting' | 'active' | 'ended'>(initialStatus);
  const [workshopTitle, setWorkshopTitle] = useState(initialTitle);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [sessionNotFound, setSessionNotFound] = useState(false);

  const failedPollsRef = useRef(0);
  const hasShownFailureToastRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const transitionToCanvas = useCallback(() => {
    if (!aiSessionId) return;
    setTransitioning(true);
    setTimeout(() => {
      router.push(`/workshop/${aiSessionId}/step/${currentStepOrder}`);
    }, 500);
  }, [aiSessionId, currentStepOrder, router]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/session-status/${token}`, {
        cache: 'no-store',
      });

      if (res.status === 404) {
        setSessionNotFound(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      if (!res.ok) {
        failedPollsRef.current += 1;
        if (failedPollsRef.current >= 3 && !hasShownFailureToastRef.current) {
          hasShownFailureToastRef.current = true;
          toast.warning('Having trouble connecting. Still trying...', { duration: 5000 });
        }
        return;
      }

      // Reset fail counter on success
      failedPollsRef.current = 0;
      hasShownFailureToastRef.current = false;

      const data = (await res.json()) as SessionStatusResponse;
      setParticipants(data.participants);
      setWorkshopTitle(data.workshopTitle);
      setStatus(data.status);

      if (data.status === 'active') {
        // Clear interval — we're transitioning
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        transitionToCanvas();
      }
    } catch {
      failedPollsRef.current += 1;
      if (failedPollsRef.current >= 3 && !hasShownFailureToastRef.current) {
        hasShownFailureToastRef.current = true;
        toast.warning('Having trouble connecting. Still trying...', { duration: 5000 });
      }
    }
  }, [token, transitionToCanvas]);

  useEffect(() => {
    // Handle late joiner: status already 'active' on mount
    if (initialStatus === 'active') {
      const timeout = setTimeout(() => {
        transitionToCanvas();
      }, 2000);
      return () => clearTimeout(timeout);
    }

    // Handle already ended session on mount
    if (initialStatus === 'ended') {
      return;
    }

    // Start polling for status and participant updates
    // Run immediately on mount, then every 3 seconds
    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (sessionNotFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Workshop Not Found</h2>
          <p className="text-sm text-muted-foreground">
            This workshop no longer exists or the link has expired.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Session Ended</h2>
          <p className="text-sm text-muted-foreground">This session has ended. Thanks for participating!</p>
        </div>
      </div>
    );
  }

  const isActive = status === 'active';

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center bg-background px-4 transition-opacity duration-500 ${
        transitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* WorkshopPilot branding */}
      <div className="mb-8 text-center">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          WorkshopPilot
        </span>
      </div>

      {/* Lobby card */}
      <div className="w-full max-w-sm rounded-xl border bg-card shadow-sm">
        <div className="p-6">
          <h1 className="mb-1 text-xl font-semibold text-card-foreground">
            {workshopTitle}
          </h1>

          {/* Status message */}
          <div className="mb-6 flex items-center gap-2">
            {!isActive && (
              <span className="flex gap-1">
                <span
                  className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: '300ms' }}
                />
              </span>
            )}
            <p className="text-sm text-muted-foreground">
              {isActive
                ? 'Workshop in progress...'
                : 'Waiting for the facilitator to start...'}
            </p>
          </div>

          {/* Participant list */}
          {participants.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
              </p>
              <ul className="space-y-1.5">
                {participants.map((p) => {
                  const isMe = p.id === participantId;
                  return (
                    <li key={p.id} className="flex items-center gap-2.5">
                      {/* Color dot */}
                      <span
                        className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                        style={{ backgroundColor: p.color }}
                        aria-hidden="true"
                      >
                        {p.displayName.charAt(0).toUpperCase()}
                      </span>
                      <span className="flex-1 truncate text-sm text-card-foreground">
                        {p.displayName}
                      </span>
                      {isMe && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          You
                        </span>
                      )}
                      {p.role === 'owner' && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                          Facilitator
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Pulse indicator — shows the page is alive */}
          {participants.length === 0 && !isActive && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted-foreground opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground" />
              </span>
              <span className="text-xs">Waiting for others to join...</span>
            </div>
          )}
        </div>

        {/* Your identity footer */}
        <div className="border-t px-6 py-3">
          <div className="flex items-center gap-2">
            <span
              className="h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">
              Joined as <span className="font-medium text-foreground">{displayName}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
