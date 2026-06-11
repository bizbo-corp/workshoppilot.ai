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
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  sessions,
  workshopSessions,
  sessionParticipants,
  workshopInvitations,
  challengeApprovals,
} from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { getChallengeArtifact } from '@/lib/workshop/challenge-artifact';
import { formatSchedule } from '@/lib/workshop/workshop-schedule';
import { getCurrentStep } from '@/lib/workshop/lobby-state';
import { LobbyParticipantCta } from '@/components/workshop/lobby-participant-cta';
import { LobbyPoller } from './lobby-poller';
import { LobbyCountdown } from './lobby-countdown';
import { LobbyIntroVideo } from './lobby-intro-video';
import { LobbyStepsJourney } from './lobby-steps-journey';
import { LobbyRoster, type LobbyRosterEntry } from './lobby-roster';
import { LobbyScheduleDisplay } from './lobby-schedule-display';
import { StartWorkshopButton } from './start-workshop-button';
import { LobbyParticipantActions } from './lobby-actions';
import { Heading, Text, Eyebrow, Caption } from '@/components/ui/typography';
import { Icon } from '@/components/ui/icon';

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
    redirect(`/workshop/${sessionId}/step/challenge`);
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

  // Resolve the caller's participant row (skipped for facilitator — they are the owner).
  // This MUST run before the late-joiner redirect below, otherwise an unauthenticated
  // visitor bounces lobby → step/N → lobby in an infinite loop (step page sends
  // unauth users back here, and the late-joiner block would send them right back
  // out without ever checking identity).
  let callerParticipantId: string | null = null;
  if (!isFacilitator) {
    const caller = await resolveClerkParticipant(workshop.id);
    if (!caller) {
      // Not an authenticated participant of this workshop — send home.
      redirect('/');
    }
    callerParticipantId = caller.participantId;
  }

  // Late joiner: workshop already started.
  //  - Facilitator → drop straight into the current step (they're running it).
  //  - Participant → stay in the lobby for context; the LobbyParticipantCta
  //    lets them click into the step when the facilitator is online (or nudge
  //    them if not). This is the whole point of routing joiners through here.
  if (workshop.workshopStartedAt && isFacilitator) {
    const step = await getCurrentStep(workshop.id);
    redirect(`/workshop/${sessionId}/step/${step.order}`);
  }

  // Step the participant CTA would enter (current in-progress step, or
  // Stakeholder Mapping before anything is in progress).
  const ctaStep = await getCurrentStep(workshop.id);

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

  const countdownBlock =
    schedule && workshop.scheduledStartAt ? (
      <LobbyCountdown startAtIso={workshop.scheduledStartAt.toISOString()} />
    ) : (
      <div className="relative h-full overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50 px-8 py-10 text-center shadow-sm dark:border-emerald-700/30 dark:from-emerald-950/40 dark:to-teal-950/30">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
          <Icon name="sparkles" className="h-6 w-6" />
        </div>
        <Eyebrow className="text-emerald-700 dark:text-emerald-300">
          Ready to roll
        </Eyebrow>
        <Heading level={1} as="h2" className="mt-2 text-4xl sm:text-5xl">
          Let&apos;s do this
        </Heading>
        <Text variant="muted" className="mt-3">
          The facilitator can kick things off whenever you&apos;re ready.
        </Text>
      </div>
    );

  const rosterBlock = (
    <aside className="rounded-3xl border bg-card p-6 shadow-sm">
      {isFacilitator && (
        // Primary CTA pinned to the top of the card so the facilitator can't
        // miss it. Visually separated from the participant list with a divider
        // below.
        <div className="mb-6 border-b pb-6">
          <StartWorkshopButton
            workshopId={workshop.id}
            className="h-12 w-full text-base shadow-md"
          />
          <Caption className="mt-2 text-center">
            Starting will pull everyone in this lobby into Step 2 together.
          </Caption>
        </div>
      )}
      <div className="mb-4 flex items-center gap-2">
        <Icon name="users" className="h-4 w-4 text-muted-foreground" />
        <Eyebrow>
          Who&apos;s here
        </Eyebrow>
        <span className="ml-auto text-xs text-muted-foreground">
          {rosterEntries.length}
        </span>
      </div>
      <LobbyRoster entries={rosterEntries} />
    </aside>
  );

  const walkOutBlock = <WalkOutSection durationLabel={schedule?.durationLabel ?? null} />;

  const challengeBlock = (
    // h-full + flex column = inside the xl left-column flex stack, this section
    // grows to fill the remaining vertical space below the countdown so the
    // left column matches the height of the right column (roster + video).
    // justify-center keeps the content vertically centred when the box grows.
    <section className="relative flex h-full flex-col justify-center overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40 p-8 shadow-sm dark:border-amber-700/30 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/20 sm:p-10">
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-eyebrow text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/60 dark:text-amber-300">
          <Icon name="lightbulb" className="h-3 w-3" />
          The challenge
        </span>
        {artifact?.hmwStatement ? (
          <blockquote className="mt-5 text-2xl font-medium leading-snug text-foreground sm:text-3xl">
            <span className="font-serif text-4xl leading-none text-amber-600 dark:text-amber-400">
              &ldquo;
            </span>
            {artifact.hmwStatement}
            <span className="font-serif text-4xl leading-none text-amber-600 dark:text-amber-400">
              &rdquo;
            </span>
          </blockquote>
        ) : (
          <p className="mt-5 text-base italic text-muted-foreground">
            Challenge not yet framed.
          </p>
        )}
        {workshop.scheduledStartAt && workshop.scheduledDurationMinutes && (
          // Client component — renders the time in the viewer's timezone (with
          // a Change picker) rather than the facilitator's stored one. Initial
          // server render uses the workshop's TZ so hydration matches.
          <LobbyScheduleDisplay
            startAtIso={workshop.scheduledStartAt.toISOString()}
            durationMinutes={workshop.scheduledDurationMinutes}
            defaultTimezone={workshop.scheduledTimezone ?? 'UTC'}
          />
        )}
      </div>
    </section>
  );

  return (
    // h-full + overflow-y-auto: the parent <main> in workshop/[sessionId]/layout.tsx
    // is locked to viewport height with overflow-hidden so step pages can pin a
    // full-bleed canvas. The lobby has tall stacked content, so we make this
    // wrapper the scroll container instead.
    <div className="h-full overflow-y-auto bg-background px-4 py-10">
      <LobbyPoller />
      <div className="mx-auto max-w-4xl space-y-8 xl:max-w-7xl">
        {/* Header */}
        <header>
          <Eyebrow>
            Workshop lobby
          </Eyebrow>
          <Heading level={1} className="mt-2 leading-tight">
            {workshop.title}
          </Heading>
          <p className="mt-3 max-w-2xl text-base italic leading-relaxed text-amber-700 dark:text-amber-300 sm:text-lg">
            Bring curiosity and wild ideas — that&apos;s where innovation comes from. ✨
          </p>
        </header>

        {/*
          Hero region — fluid across three breakpoints.

          mobile (< lg): one column, stacks vertically in DOM order
          (countdown → roster).

          lg (1024–1280): 3-col grid. Pairs countdown (2/3) with roster (1/3).
          Challenge + video appear below the hero as full-width sections.

          xl/2xl (≥1280): 5-col grid → 60/40 left:right split. LEFT column (3/5)
          stacks countdown → challenge. RIGHT column (2/5) stacks roster →
          video. The challenge / video sections lower down are hidden at xl so
          they don't duplicate. Walk-out is *never* in the hero — it always
          lives at the very bottom of the page.
        */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-5">
          {/* Left column — flex column so the challenge wrapper can use flex-1
              at xl to fill the remaining height below the countdown, matching
              the right column. */}
          <div className="flex flex-col gap-6 lg:col-span-2 xl:col-span-3">
            {countdownBlock}
            {/* Participant's primary CTA, pinned directly under "Let's do this".
                sticky top-6: as the page scrolls, the Begin button rides along
                the top of the scroll container through the whole hero region so
                a late joiner can't miss it. Facilitators get their Start button
                in the roster card instead. */}
            {!isFacilitator && (
              <div className="sticky top-6 z-10">
                <LobbyParticipantCta
                  sessionId={sessionId}
                  workshopId={workshop.id}
                  initialStarted={!!workshop.workshopStartedAt}
                  initialStepOrder={ctaStep.order}
                  initialStepName={ctaStep.name}
                />
              </div>
            )}
            <div className="hidden flex-1 xl:flex xl:flex-col">{challengeBlock}</div>
          </div>
          <div className="flex flex-col gap-6 lg:col-span-1 xl:col-span-2">
            {rosterBlock}
            <div className="hidden xl:block">
              <LobbyIntroVideo />
            </div>
          </div>
        </div>

        {/* 9-step illustrated journey — sits right under the hero as the
            bottom of the top content, always full width. */}
        <LobbyStepsJourney />

        {/* Below-xl-only: challenge + video appear here, between the journey
            and the walk-out. At xl they're already in the hero. */}
        <div className="space-y-8 xl:hidden">
          {challengeBlock}
          <LobbyIntroVideo />
        </div>

        {/* Walk-out — full width at the very bottom on every breakpoint. */}
        {walkOutBlock}

        {/* Footer — participant-only. The primary CTA now lives pinned under the
            hero (see left column above); only the secondary change-request
            affordance remains here. */}
        {!isFacilitator && (
          <section className="mx-auto flex w-full max-w-xl flex-col items-end gap-2 pb-4">
            <LobbyParticipantActions
              workshopId={workshop.id}
              isWaiting={callerIsWaiting}
              existingNote={callerApproval?.note ?? null}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function WalkOutSection({ durationLabel }: { durationLabel: string | null }) {
  return (
    <section className="rounded-3xl border bg-gradient-to-br from-olive-50/60 to-card p-6 shadow-sm dark:from-olive-950/20 sm:p-8">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Eyebrow>
            What you&apos;ll walk out with
          </Eyebrow>
          <Heading level={2} className="mt-1 text-xl leading-tight sm:text-2xl">
            A validated Build Pack in {durationLabel ?? '60–120 minutes'}
          </Heading>
        </div>
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-olive-100 text-olive-700 dark:bg-olive-900/50 dark:text-olive-300">
          <Icon name="file-check" className="h-6 w-6" />
        </span>
      </div>
      <ul className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-1">
        <li className="rounded-xl border bg-background/60 p-4">
          <p className="text-sm font-semibold">PRD &amp; tech specs</p>
          <Caption className="mt-1">
            A spec document ready to brief AI coders or engineers.
          </Caption>
        </li>
        <li className="rounded-xl border bg-background/60 p-4">
          <p className="text-sm font-semibold">Persona &amp; journey map</p>
          <Caption className="mt-1">
            A real user you can keep designing for after the session.
          </Caption>
        </li>
        <li className="rounded-xl border bg-background/60 p-4">
          <p className="text-sm font-semibold">Concept sheet</p>
          <Caption className="mt-1">
            SWOT, feasibility, and elevator pitch for your strongest idea.
          </Caption>
        </li>
      </ul>
    </section>
  );
}
