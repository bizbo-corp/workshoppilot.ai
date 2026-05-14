import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { stepArtifacts, workshopSteps, workshops } from '@/db/schema';
import { getRoomId } from '@/lib/liveblocks/config';
import { unwrapLiveblocksStorage } from '@/lib/liveblocks/unwrap-storage';

export interface ChallengeArtifact {
  hmwStatement: string | null;
  idea: string | null;
  problem: string | null;
  audience: string | null;
  /** Top-level workshop record's free-form `originalIdea` field, used as a fallback. */
  originalIdea: string | null;
  /** Current revision the facilitator has published. */
  challengeRevision: number;
  challengePublishedAt: Date | null;
}

/**
 * Load the data participants need to review the challenge: the HMW statement,
 * idea, problem, and audience.
 *
 * Reads from `step_artifacts.artifact._canvas.stickyNotes` (kept current by
 * `saveCanvasState` for solo and the Liveblocks webhook for multiplayer).
 * Falls back to extracted top-level fields when available.
 */
export async function getChallengeArtifact(workshopId: string): Promise<ChallengeArtifact | null> {
  const [workshop] = await db
    .select({
      originalIdea: workshops.originalIdea,
      challengeRevision: workshops.challengeRevision,
      challengePublishedAt: workshops.challengePublishedAt,
    })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);
  if (!workshop) return null;

  const [step] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, 'challenge')))
    .limit(1);

  let hmwStatement: string | null = null;
  let idea: string | null = null;
  let problem: string | null = null;
  let audience: string | null = null;

  if (step) {
    const [artifactRow] = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, step.id))
      .limit(1);

    const artifact = (artifactRow?.artifact ?? {}) as Record<string, unknown>;
    const canvas = (artifact._canvas ?? {}) as Record<string, unknown>;
    const stickyNotes = Array.isArray(canvas.stickyNotes)
      ? (canvas.stickyNotes as Array<{ templateKey?: string; text?: string }>)
      : [];

    const findText = (key: string): string | null => {
      const note = stickyNotes.find((n) => n.templateKey === key && (n.text ?? '').trim());
      return note?.text?.trim() ?? null;
    };

    idea = findText('idea');
    problem = findText('problem');
    audience = findText('audience');
    hmwStatement = findText('challenge-statement');

    if (!hmwStatement && typeof artifact.hmwStatement === 'string') {
      hmwStatement = (artifact.hmwStatement as string).trim() || null;
    }
  }

  return {
    hmwStatement,
    idea,
    problem,
    audience,
    originalIdea: workshop.originalIdea?.trim() ? workshop.originalIdea.trim() : null,
    challengeRevision: workshop.challengeRevision,
    challengePublishedAt: workshop.challengePublishedAt,
  };
}

/**
 * Pull the latest challenge canvas state from Liveblocks (for multiplayer workshops)
 * and persist it into `step_artifacts.artifact` so subsequent reads (e.g. invitation
 * email rendering) see the up-to-date sticky-note text. Idempotent — does nothing for
 * solo workshops or when Liveblocks returns no data.
 *
 * This mirrors the challenge-step extraction in
 * `workshop-actions.ts:extractCanvasArtifactsOnCompletion`, scoped just to Step 1 so
 * we can run it from the setupWorkshop pipeline without piggy-backing on step advance.
 */
export async function syncChallengeArtifactFromLiveblocks(
  workshopId: string,
  isMultiplayer: boolean
): Promise<void> {
  if (!isMultiplayer) return;
  if (!process.env.LIVEBLOCKS_SECRET_KEY) return;

  const [stepRow] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(
      and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, 'challenge'))
    )
    .limit(1);
  if (!stepRow) return;

  const liveblocksRoomId = `${getRoomId(workshopId)}-step-challenge`;
  let canvasData: Record<string, unknown> | null = null;
  try {
    const res = await fetch(
      `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(liveblocksRoomId)}/storage`,
      { headers: { Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}` } }
    );
    if (res.ok) {
      const raw = await res.json();
      canvasData = unwrapLiveblocksStorage(raw) as Record<string, unknown>;
    }
  } catch (err) {
    console.warn('[syncChallengeArtifact] Liveblocks fetch failed:', err);
    return;
  }

  if (!canvasData) return;

  // Extract hmwStatement from the challenge-statement sticky
  const stickyNotes = canvasData.stickyNotes as
    | Array<{ templateKey?: string; text?: string }>
    | undefined;
  const hmwStatement = stickyNotes?.find(
    (n) => n.templateKey === 'challenge-statement' && (n.text ?? '').trim()
  )?.text?.trim();

  const [existing] = await db
    .select({ id: stepArtifacts.id, artifact: stepArtifacts.artifact, version: stepArtifacts.version })
    .from(stepArtifacts)
    .where(eq(stepArtifacts.workshopStepId, stepRow.id))
    .limit(1);

  const merged: Record<string, unknown> = {
    ...(existing?.artifact as Record<string, unknown> | null ?? {}),
    _canvas: canvasData,
  };
  if (hmwStatement) merged.hmwStatement = hmwStatement;

  if (existing) {
    await db
      .update(stepArtifacts)
      .set({ artifact: merged, version: existing.version + 1, extractedAt: new Date() })
      .where(eq(stepArtifacts.id, existing.id));
  } else {
    await db.insert(stepArtifacts).values({
      workshopStepId: stepRow.id,
      stepId: 'challenge',
      artifact: merged,
      schemaVersion: '1.0',
      version: 1,
    });
  }
}
