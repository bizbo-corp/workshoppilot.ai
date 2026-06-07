'use server';

import { revalidatePath } from 'next/cache';
import { auth, currentUser } from '@clerk/nextjs/server';
import { and, count, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  workshops,
  workshopSteps,
  stepArtifacts,
  sessions,
  workshopSessions,
  sessionParticipants,
  workshopInvitations,
  challengeApprovals,
} from '@/db/schema';
import {
  getChallengeArtifact,
  type ChallengeArtifact,
} from '@/lib/workshop/challenge-artifact';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { getStepTemplateStickyNotes } from '@/lib/canvas/template-sticky-note-config';
import { MAX_TEAM_INVITES } from '@/lib/workshop/workshop-schedule';
import type { LobbyRosterEntry } from '@/app/workshop/[sessionId]/lobby/lobby-roster';

type WorkshopRow = typeof workshops.$inferSelect;

/** Is the current Clerk user the configured admin? */
async function isCurrentUserAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  return !!email && email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Resolve manage access (facilitator/owner OR admin) for a workshop.
 * Returns the workshop row when allowed, else null.
 */
async function resolveManageAccess(workshopId: string): Promise<WorkshopRow | null> {
  const { userId } = await auth();
  const [workshop] = await db
    .select()
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);
  if (!workshop) return null;
  if (userId && userId === workshop.clerkUserId) return workshop;
  if (await isCurrentUserAdmin()) return workshop;
  return null;
}

/**
 * Load the challenge for any authorized viewer (participant, owner, or admin).
 * Used by the read-only challenge view and the settings Challenge tab.
 */
export async function getChallengeForViewer(
  workshopId: string
): Promise<ChallengeArtifact | null> {
  const { userId } = await auth();

  const [workshop] = await db
    .select({ clerkUserId: workshops.clerkUserId })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);
  if (!workshop) return null;

  const isOwner = !!userId && userId === workshop.clerkUserId;
  let allowed = isOwner;
  if (!allowed) allowed = await isCurrentUserAdmin();
  if (!allowed) {
    // Authenticated participant of this workshop?
    const participant = await resolveClerkParticipant(workshopId);
    allowed = !!participant;
  }
  if (!allowed) return null;

  return getChallengeArtifact(workshopId);
}

/**
 * Update the challenge fields inline from the settings dialog.
 *
 * SOLO ONLY: the challenge canvas for multiplayer workshops lives in a live
 * Liveblocks room, and the DB `_canvas` is only written *from* Liveblocks — a
 * DB-only write here would be overwritten on the next sync. Multiplayer
 * facilitators edit the challenge on the setup canvas (Step 1) instead, so this
 * action rejects multiplayer workshops. Facilitator/owner or admin only.
 */
export async function updateChallenge(
  workshopId: string,
  fields: { hmwStatement?: string; idea?: string; problem?: string; audience?: string }
): Promise<{ success: boolean; error?: string }> {
  const workshop = await resolveManageAccess(workshopId);
  if (!workshop) return { success: false, error: 'Access denied' };

  if (workshop.workshopType === 'multiplayer') {
    return {
      success: false,
      error: 'Edit the challenge on the setup canvas — multiplayer challenges are not editable here.',
    };
  }

  const [step] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, 'challenge')))
    .limit(1);
  if (!step) return { success: false, error: 'Challenge step not found' };

  const [existing] = await db
    .select({ id: stepArtifacts.id, artifact: stepArtifacts.artifact, version: stepArtifacts.version })
    .from(stepArtifacts)
    .where(eq(stepArtifacts.workshopStepId, step.id))
    .limit(1);

  const artifact = (existing?.artifact ?? {}) as Record<string, unknown>;
  const canvas = (artifact._canvas ?? {}) as Record<string, unknown>;
  const stickyNotes = Array.isArray(canvas.stickyNotes)
    ? [...(canvas.stickyNotes as Array<Record<string, unknown>>)]
    : [];

  // Map editable fields → canvas template keys (matches getChallengeArtifact's read path).
  const fieldToKey: Record<string, string> = {
    idea: 'idea',
    problem: 'problem',
    audience: 'audience',
    hmwStatement: 'challenge-statement',
  };
  const templateDefs = getStepTemplateStickyNotes('challenge');

  for (const [field, rawValue] of Object.entries(fields)) {
    if (rawValue === undefined) continue;
    const key = fieldToKey[field];
    if (!key) continue;
    const text = rawValue.trim();
    const idx = stickyNotes.findIndex((n) => n.templateKey === key);
    if (idx >= 0) {
      stickyNotes[idx] = { ...stickyNotes[idx], text };
    } else {
      const def = templateDefs.find((d) => d.key === key);
      stickyNotes.push({
        id: crypto.randomUUID(),
        text,
        position: def?.position ?? { x: 0, y: 0 },
        width: def?.width ?? 220,
        height: def?.height ?? 160,
        color: def?.color ?? 'yellow',
        type: 'stickyNote',
        templateKey: key,
        templateLabel: def?.label,
        placeholderText: def?.placeholderText,
      });
    }
  }

  const merged: Record<string, unknown> = {
    ...artifact,
    _canvas: { ...canvas, stickyNotes },
  };
  // Keep top-level hmwStatement in sync — invitation emails + the ideation root
  // node read it directly (the canvas sticky is only the primary source).
  if (fields.hmwStatement !== undefined) {
    merged.hmwStatement = fields.hmwStatement.trim();
  }

  if (existing) {
    await db
      .update(stepArtifacts)
      .set({ artifact: merged, version: existing.version + 1 })
      .where(eq(stepArtifacts.id, existing.id));
  } else {
    await db.insert(stepArtifacts).values({
      workshopStepId: step.id,
      stepId: 'challenge',
      artifact: merged,
      schemaVersion: '1.0',
      version: 1,
    });
  }

  const [sessionRow] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.workshopId, workshopId))
    .limit(1);
  if (sessionRow) {
    revalidatePath(`/workshop/${sessionRow.id}/step/challenge`);
    revalidatePath(`/workshop/${sessionRow.id}/lobby`);
  }

  return { success: true };
}

export type WorkshopTeam = {
  roster: LobbyRosterEntry[];
  pendingInvites: { id: string; email: string }[];
  shareToken: string | null;
  seatsRemaining: number;
};

/**
 * Load the team roster + pending invites for the settings Team tab.
 * Mirrors the lobby's roster query. Facilitator/owner or admin only.
 */
export async function getWorkshopTeam(workshopId: string): Promise<WorkshopTeam | null> {
  const workshop = await resolveManageAccess(workshopId);
  if (!workshop) return null;

  const [wSession] = await db
    .select({ id: workshopSessions.id, shareToken: workshopSessions.shareToken })
    .from(workshopSessions)
    .where(eq(workshopSessions.workshopId, workshopId))
    .limit(1);
  if (!wSession) {
    return { roster: [], pendingInvites: [], shareToken: null, seatsRemaining: MAX_TEAM_INVITES };
  }

  const participants = await db
    .select({
      id: sessionParticipants.id,
      displayName: sessionParticipants.displayName,
      role: sessionParticipants.role,
      status: sessionParticipants.status,
    })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, wSession.id));

  const pendingInvites = await db
    .select({ id: workshopInvitations.id, email: workshopInvitations.email })
    .from(workshopInvitations)
    .where(
      and(
        eq(workshopInvitations.workshopId, workshopId),
        eq(workshopInvitations.status, 'pending')
      )
    );

  const allApprovals = await db
    .select({
      participantId: challengeApprovals.sessionParticipantId,
      status: challengeApprovals.status,
      revision: challengeApprovals.challengeRevision,
    })
    .from(challengeApprovals)
    .where(eq(challengeApprovals.workshopId, workshopId));
  const approvalByParticipantId = new Map(allApprovals.map((a) => [a.participantId, a]));

  const roster: LobbyRosterEntry[] = participants
    .filter((p) => p.status !== 'removed')
    .map((p) => {
      const approval = approvalByParticipantId.get(p.id);
      return {
        id: p.id,
        label: p.displayName,
        role: p.role === 'owner' ? 'facilitator' : 'participant',
        changeRequest:
          approval?.status === 'change_requested' &&
          approval.revision === workshop.challengeRevision,
      };
    });

  // Seats: cap minus current participants (excl. facilitator) minus pending invites.
  const activeParticipants = participants.filter(
    (p) => p.status !== 'removed' && p.role === 'participant'
  ).length;
  const seatsRemaining = Math.max(
    0,
    MAX_TEAM_INVITES - activeParticipants - pendingInvites.length
  );

  return {
    roster,
    pendingInvites,
    shareToken: wSession.shareToken,
    seatsRemaining,
  };
}

/**
 * Count of participants who have an open change request against the current
 * challenge revision. Drives the badge on the header Settings button.
 * Facilitator/owner or admin only; returns 0 otherwise.
 */
export async function getPendingChangeRequestCount(workshopId: string): Promise<number> {
  const workshop = await resolveManageAccess(workshopId);
  if (!workshop) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(challengeApprovals)
    .where(
      and(
        eq(challengeApprovals.workshopId, workshopId),
        eq(challengeApprovals.status, 'change_requested')
      )
    );
  return Number(row?.value ?? 0);
}
