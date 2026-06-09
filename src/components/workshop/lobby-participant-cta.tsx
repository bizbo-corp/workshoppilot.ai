'use client';

/**
 * LobbyParticipantCta — the participant's adaptive lobby action.
 *
 * Polls /api/lobby-state and renders one of:
 *  - Pre-start waiter: "Waiting for the facilitator to begin…" — and when the
 *    facilitator starts, follows the group into the step automatically (the
 *    synchronized start is preserved for people already in the lobby).
 *  - Late joiner (workshop already in progress at mount) + facilitator online:
 *    "Ready to start? Begin <step>" — clicking enters the current step.
 *  - Late joiner + facilitator offline: "Waiting on facilitator" + a Nudge
 *    button that emails them (5-min cooldown, enforced server-side).
 */

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { nudgeFacilitator } from '@/actions/lobby-actions';
import { getStepByOrder, getFirstStep } from '@/lib/workshop/step-metadata';
import { toast } from 'sonner';

interface LobbyStateResponse {
  started: boolean;
  facilitatorPresent: boolean;
  currentStepOrder: number;
  currentStepName: string;
}

interface LobbyParticipantCtaProps {
  sessionId: string;
  workshopId: string;
  initialStarted: boolean;
  initialStepOrder: number;
  initialStepName: string;
}

const POLL_MS = 10_000; // Liveblocks getActiveUsers should be polled ≤ every 10s.

export function LobbyParticipantCta({
  sessionId,
  workshopId,
  initialStarted,
  initialStepOrder,
  initialStepName,
}: LobbyParticipantCtaProps) {
  const router = useRouter();

  // Whether the workshop was already running when this participant arrived.
  // Late joiners click-to-enter; pre-start waiters get pulled in on start.
  const startedAtMount = useRef(initialStarted);
  const navigatedRef = useRef(false);

  const [state, setState] = useState<LobbyStateResponse>({
    started: initialStarted,
    facilitatorPresent: false,
    currentStepOrder: initialStepOrder,
    currentStepName: initialStepName,
  });
  const [entering, setEntering] = useState(false);
  const [nudgePending, startNudge] = useTransition();
  const [nudgedUntil, setNudgedUntil] = useState<number | null>(null);

  const stepHref = useCallback(
    (order: number) =>
      `/workshop/${sessionId}/step/${(getStepByOrder(order) ?? getFirstStep()).slug}`,
    [sessionId],
  );

  const enterStep = useCallback(
    (order: number) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      setEntering(true);
      router.push(stepHref(order));
    },
    [router, stepHref],
  );

  // Poll lobby state.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/lobby-state?sessionId=${sessionId}`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as LobbyStateResponse;
        if (cancelled) return;
        setState(data);

        // Pre-start waiter → workshop just started: follow the group in.
        if (!startedAtMount.current && data.started) {
          enterStep(data.currentStepOrder);
        }
      } catch {
        // Network blip — keep last known state, try again next tick.
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId, enterStep]);

  const handleNudge = () => {
    startNudge(async () => {
      const result = await nudgeFacilitator(workshopId);
      if (result.ok) {
        setNudgedUntil(Date.now() + 5 * 60_000);
        toast.success('Nudge sent — the facilitator has been emailed.');
      } else {
        if (result.retryAfterMs) {
          setNudgedUntil(Date.now() + result.retryAfterMs);
        }
        toast.error(result.error ?? 'Couldn’t send the nudge.');
      }
    });
  };

  const nudgeOnCooldown = nudgedUntil != null && nudgedUntil > Date.now();

  // ── Late joiner, facilitator online → enter the step ──
  if (startedAtMount.current && state.facilitatorPresent) {
    return (
      <div className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Ready to start?</p>
        <Button
          size="lg"
          className="mt-3 h-12 w-full text-base shadow-md sm:w-auto sm:px-8"
          disabled={entering}
          onClick={() => enterStep(state.currentStepOrder)}
        >
          {entering ? (
            <Icon name="spinner" className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Begin {state.currentStepName}
              <Icon name="arrow-right" className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          The facilitator is here — jump into Step {state.currentStepOrder}.
        </p>
      </div>
    );
  }

  // ── Late joiner, facilitator offline → waiting + nudge ──
  if (startedAtMount.current && !state.facilitatorPresent) {
    return (
      <div className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">
          Waiting on the facilitator
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          The workshop is in progress but the facilitator isn’t online right now.
          Give them a nudge and we’ll let you in as soon as they’re back.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          disabled={nudgePending || nudgeOnCooldown}
          onClick={handleNudge}
        >
          {nudgePending ? (
            <Icon name="spinner" className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Icon name="bell" className="mr-1.5 h-4 w-4" />
              {nudgeOnCooldown ? 'Facilitator nudged' : 'Nudge facilitator'}
            </>
          )}
        </Button>
      </div>
    );
  }

  // ── Pre-start waiter → waiting for the facilitator to begin ──
  return (
    <div className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm">
      <p className="text-sm font-medium text-foreground">
        Waiting for the facilitator to begin…
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        You’ll be brought into the first activity automatically when they start.
        Use this time to read through what the workshop covers below.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        disabled={nudgePending || nudgeOnCooldown}
        onClick={handleNudge}
      >
        {nudgePending ? (
          <Icon name="spinner" className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Icon name="bell" className="mr-1.5 h-4 w-4" />
            {nudgeOnCooldown ? 'Facilitator nudged' : 'Nudge facilitator'}
          </>
        )}
      </Button>
    </div>
  );
}
