/**
 * /workshop/[sessionId]/lobby
 *
 * Pre-workshop rendezvous screen. Replaces the previous /challenge-review route.
 *
 * - Facilitator sees the challenge + roster + Start workshop button.
 * - Participants see the challenge + roster + "Waiting for facilitator" / change-request affordance.
 * - Late joiners (workshopStartedAt is set) are redirected to the current in-progress step.
 */

import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  sessions,
  workshopSessions,
  sessionParticipants,
  workshopInvitations,
  challengeApprovals,
  workshopSteps,
} from '@/db/schema';
import { COOKIE_NAME, verifyGuestCookie } from '@/lib/auth/guest-cookie';
import { getChallengeArtifact } from '@/lib/workshop/challenge-artifact';
import { formatSchedule } from '@/lib/workshop/workshop-schedule';
import { STEPS } from '@/lib/workshop/step-metadata';
import { LobbyPoller } from './lobby-poller';
import { LobbyCountdown } from './lobby-countdown';
import { LobbyRoster, type LobbyRosterEntry } from './lobby-roster';
import { StartWorkshopButton } from './start-workshop-button';
import { LobbyParticipantActions } from './lobby-actions';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function LobbyPage({ params }: PageProps) {
  const { sessionId } = await params;

  const sessionRow = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { workshop: true },
  });
  if (!sessionRow) notFound();
  const workshop = sessionRow.workshop;

  // Solo workshops never use the lobby
  if (workshop.facilitatorMode !== 'team') {
    redirect(`/workshop/${sessionId}/step/1`);
  }

  // Late joiner: workshop already started — drop them at the current step.
  if (workshop.workshopStartedAt) {
    const inProgress = await db
      .select({ stepId: workshopSteps.stepId })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshop.id),
          eq(workshopSteps.status, 'in_progress')
        )
      )
      .limit(1);
    const currentStepId = inProgress[0]?.stepId ?? 'stakeholder-mapping';
    const order = STEPS.find((s) => s.id === currentStepId)?.order ?? 2;
    redirect(`/workshop/${sessionId}/step/${order}`);
  }

  const { userId } = await auth();
  const isFacilitator = !!userId && userId === workshop.clerkUserId;

  // Workshop session (multiplayer container) is required to resolve participants
  const [wSession] = await db
    .select({ id: workshopSessions.id })
    .from(workshopSessions)
    .where(eq(workshopSessions.workshopId, workshop.id))
    .limit(1);
  if (!wSession) notFound();

  // Resolve the caller's participant row (skipped for facilitator — they are the owner)
  let callerParticipantId: string | null = null;
  if (!isFacilitator) {
    if (userId) {
      const [p] = await db
        .select({ id: sessionParticipants.id })
        .from(sessionParticipants)
        .where(
          and(
            eq(sessionParticipants.sessionId, wSession.id),
            eq(sessionParticipants.clerkUserId, userId)
          )
        )
        .limit(1);
      if (p) callerParticipantId = p.id;
    }
    if (!callerParticipantId) {
      const cookieStore = await cookies();
      const raw = cookieStore.get(COOKIE_NAME)?.value;
      const payload = raw ? verifyGuestCookie(raw) : null;
      if (payload && payload.workshopId === workshop.id) {
        const [p] = await db
          .select({ id: sessionParticipants.id, sessionId: sessionParticipants.sessionId })
          .from(sessionParticipants)
          .where(eq(sessionParticipants.id, payload.participantId))
          .limit(1);
        if (p && p.sessionId === wSession.id) callerParticipantId = p.id;
      }
    }
    if (!callerParticipantId) {
      // Not a participant of this workshop — send home
      redirect('/');
    }
  }

  // Load challenge + schedule data
  const artifact = await getChallengeArtifact(workshop.id);
  const schedule = formatSchedule(
    workshop.scheduledStartAt ?? null,
    workshop.scheduledDurationMinutes ?? null,
    workshop.scheduledTimezone ?? null
  );

  // Roster: facilitator + active participants + pending invitees
  const participants = await db
    .select({
      id: sessionParticipants.id,
      displayName: sessionParticipants.displayName,
      role: sessionParticipants.role,
      status: sessionParticipants.status,
      clerkUserId: sessionParticipants.clerkUserId,
    })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, wSession.id));

  const pendingInvites = await db
    .select({ id: workshopInvitations.id, email: workshopInvitations.email })
    .from(workshopInvitations)
    .where(
      and(
        eq(workshopInvitations.workshopId, workshop.id),
        eq(workshopInvitations.status, 'pending')
      )
    );

  const allApprovals = await db
    .select({
      participantId: challengeApprovals.sessionParticipantId,
      status: challengeApprovals.status,
      note: challengeApprovals.changeRequestNote,
      revision: challengeApprovals.challengeRevision,
    })
    .from(challengeApprovals)
    .where(eq(challengeApprovals.workshopId, workshop.id));
  const approvalByParticipantId = new Map(allApprovals.map((a) => [a.participantId, a]));

  const rosterEntries: LobbyRosterEntry[] = participants
    .filter((p) => p.status !== 'removed')
    .map((p) => {
      const approval = approvalByParticipantId.get(p.id);
      const role: LobbyRosterEntry['role'] = p.role === 'owner' ? 'facilitator' : 'participant';
      return {
        id: p.id,
        label: p.displayName,
        role,
        changeRequest:
          approval?.status === 'change_requested' &&
          approval.revision === workshop.challengeRevision,
      };
    });
  for (const inv of pendingInvites) {
    rosterEntries.push({ id: inv.id, label: inv.email, role: 'invited' });
  }

  // Participant-specific approval state for the "Request change" UI
  const callerApproval = callerParticipantId
    ? approvalByParticipantId.get(callerParticipantId)
    : null;
  const callerIsWaiting =
    !!callerApproval &&
    callerApproval.status === 'change_requested' &&
    callerApproval.revision === workshop.challengeRevision;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <LobbyPoller />
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Workshop lobby
          </p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight">{workshop.title}</h1>
        </header>

        {/* Schedule / readiness banner */}
        {schedule && workshop.scheduledStartAt ? (
          <LobbyCountdown startAtIso={workshop.scheduledStartAt.toISOString()} />
        ) : (
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            ✨ Ready to start whenever the facilitator hits Go.
          </div>
        )}

        {/* Challenge block */}
        <section className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              The challenge
            </p>
            {artifact?.hmwStatement ? (
              <p className="mt-1 text-lg font-medium leading-snug">
                {artifact.hmwStatement}
              </p>
            ) : (
              <p className="mt-1 text-sm italic text-muted-foreground">
                Challenge not yet framed.
              </p>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ArtifactField label="The idea" value={artifact?.idea ?? artifact?.originalIdea} />
            <ArtifactField label="The problem" value={artifact?.problem} />
            <ArtifactField label="The audience" value={artifact?.audience} />
          </dl>
          {schedule && (
            <p className="text-sm text-muted-foreground">
              🗓 {schedule.full} · {schedule.durationLabel} workshop
            </p>
          )}
        </section>

        {/* Roster */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Who&apos;s here
          </h2>
          <LobbyRoster entries={rosterEntries} />
        </section>

        {/* 10-step preview */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            What&apos;s coming — 10 steps of design thinking
          </h2>
          <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-background text-xs font-medium text-muted-foreground">
                  {s.order}
                </span>
                <span>{s.name}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Over the next {schedule?.durationLabel ?? '60–120 min'} we&apos;ll go from a fuzzy
            problem to a validated build pack you can hand to AI coders. Bring curiosity and
            bad ideas — that&apos;s where the good ones come from. ✨
          </p>
        </section>

        {/* Footer actions */}
        <section className="flex flex-col items-end gap-3">
          {isFacilitator ? (
            <StartWorkshopButton workshopId={workshop.id} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Waiting for the facilitator to begin…
              </p>
              <LobbyParticipantActions
                workshopId={workshop.id}
                isWaiting={callerIsWaiting}
                existingNote={callerApproval?.note ?? null}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ArtifactField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-snug text-foreground">
        {value && value.trim() ? (
          value
        ) : (
          <span className="italic text-muted-foreground">Not provided</span>
        )}
      </dd>
    </div>
  );
}
