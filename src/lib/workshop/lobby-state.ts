import 'server-only';
import { and, eq } from 'drizzle-orm';
import { Liveblocks } from '@liveblocks/node';
import { db } from '@/db/client';
import { sessions, workshopSteps } from '@/db/schema';
import { getRoomId } from '@/lib/liveblocks/config';
import { STEPS } from '@/lib/workshop/step-metadata';

/**
 * Snapshot of what a participant waiting in the lobby needs to decide what to
 * show: has the workshop started, is the facilitator currently online, and
 * which step would they enter.
 */
export interface LobbyState {
  /** Workshop's aiSession id (the `sessions` table id), echoed for the client. */
  sessionId: string;
  started: boolean;
  /** True when the facilitator (owner) is connected to the workshop room. */
  facilitatorPresent: boolean;
  currentStepOrder: number;
  currentStepName: string;
}

// Lazy Liveblocks server client — mirrors the pattern in liveblocks-auth so the
// module doesn't blow up at build time when the secret is absent.
let _liveblocks: Liveblocks | null = null;
function getLiveblocks(): Liveblocks | null {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) return null;
  if (!_liveblocks) {
    _liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
  }
  return _liveblocks;
}

const STAKEHOLDER_MAPPING = STEPS.find((s) => s.id === 'stakeholder-mapping')!;

/**
 * Is the facilitator (role 'owner') currently connected to the workshop's
 * Liveblocks presence room? Presence lives on the workshop-level room
 * (`workshop-{id}`), not the per-step storage rooms. Returns false on any
 * failure — the lobby degrades to "waiting on facilitator" rather than throwing.
 */
export async function isFacilitatorPresent(workshopId: string): Promise<boolean> {
  const liveblocks = getLiveblocks();
  if (!liveblocks) return false;
  try {
    const { data } = await liveblocks.getActiveUsers(getRoomId(workshopId));
    return data.some(
      (u) => (u.info as { role?: string } | undefined)?.role === 'owner',
    );
  } catch {
    return false;
  }
}

/**
 * Resolve the current in-progress step for a workshop, defaulting to
 * Stakeholder Mapping (step 2) — the first participant-facing step after the
 * facilitator-only Challenge step.
 */
export async function getCurrentStep(workshopId: string) {
  const [inProgress] = await db
    .select({ stepId: workshopSteps.stepId })
    .from(workshopSteps)
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        eq(workshopSteps.status, 'in_progress'),
      ),
    )
    .limit(1);
  const stepId = inProgress?.stepId ?? STAKEHOLDER_MAPPING.id;
  return STEPS.find((s) => s.id === stepId) ?? STAKEHOLDER_MAPPING;
}

/**
 * Full lobby state for the given aiSession id. Returns null if the session
 * doesn't exist. The Liveblocks presence lookup only runs once the workshop has
 * started (pre-start the facilitator isn't in the room anyway).
 */
export async function getLobbyState(sessionId: string): Promise<LobbyState | null> {
  const sessionRow = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { workshop: true },
  });
  if (!sessionRow) return null;

  const workshop = sessionRow.workshop;
  const started = !!workshop.workshopStartedAt;
  const step = await getCurrentStep(workshop.id);
  const facilitatorPresent = started
    ? await isFacilitatorPresent(workshop.id)
    : false;

  return {
    sessionId,
    started,
    facilitatorPresent,
    currentStepOrder: step.order,
    currentStepName: step.name,
  };
}
