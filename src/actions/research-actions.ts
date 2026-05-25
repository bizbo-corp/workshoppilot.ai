'use server';

import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  participantResearchContributions,
  workshops,
  workshopInvitations,
  sessions,
} from '@/db/schema';
import {
  sendResearchReminderEmail,
  researchStepUrl,
} from '@/lib/email/research-reminder-email';

/**
 * Record (or clear) a participant's "research submitted" status for a step.
 * Mirrors the in-room Liveblocks roster into the DB so the dashboard and reminder
 * emails — which run outside the Liveblocks room — can read who's done.
 */
export async function recordResearchSubmission(
  workshopId: string,
  participantId: string,
  stepId: string,
  submitted: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    if (submitted) {
      await db
        .insert(participantResearchContributions)
        .values({ workshopId, participantId, stepId })
        .onConflictDoNothing({
          target: [
            participantResearchContributions.workshopId,
            participantResearchContributions.participantId,
            participantResearchContributions.stepId,
          ],
        });
    } else {
      await db
        .delete(participantResearchContributions)
        .where(
          and(
            eq(participantResearchContributions.workshopId, workshopId),
            eq(participantResearchContributions.participantId, participantId),
            eq(participantResearchContributions.stepId, stepId),
          ),
        );
    }
    return { success: true };
  } catch (e) {
    console.error('recordResearchSubmission failed:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Facilitator-only: email a "add your research" reminder to accepted participants
 * who haven't submitted their fieldwork yet. Returns how many were emailed.
 */
export async function sendResearchReminders(
  workshopId: string,
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const workshop = await db.query.workshops.findFirst({
      where: and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)),
    });
    if (!workshop) return { success: false, error: 'Only the facilitator can send reminders' };

    const [session] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.workshopId, workshopId))
      .limit(1);
    if (!session) return { success: false, error: 'No session found for this workshop' };

    const submittedRows = await db
      .select({ participantId: participantResearchContributions.participantId })
      .from(participantResearchContributions)
      .where(
        and(
          eq(participantResearchContributions.workshopId, workshopId),
          eq(participantResearchContributions.stepId, 'user-research'),
        ),
      );
    const submittedIds = new Set(submittedRows.map((r) => r.participantId));

    const invites = await db
      .select({
        email: workshopInvitations.email,
        sessionParticipantId: workshopInvitations.sessionParticipantId,
        status: workshopInvitations.status,
      })
      .from(workshopInvitations)
      .where(eq(workshopInvitations.workshopId, workshopId));

    const targets = invites.filter(
      (i) =>
        i.status === 'accepted' &&
        !(i.sessionParticipantId && submittedIds.has(i.sessionParticipantId)),
    );
    if (targets.length === 0) return { success: true, sent: 0 };

    const link = researchStepUrl(session.id);
    let sent = 0;
    for (const t of targets) {
      const r = await sendResearchReminderEmail({
        to: t.email,
        workshopTitle: workshop.title,
        link,
      });
      if (r.ok) sent += 1;
      // Resend rate-limit spacing (mirrors sendWorkshopInvites).
      await new Promise((res) => setTimeout(res, 650));
    }
    return { success: true, sent };
  } catch (e) {
    console.error('sendResearchReminders failed:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
