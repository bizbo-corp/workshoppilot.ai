/**
 * Convert a solo workshop (by sessions.id) to multiplayer and add a participant.
 * Mirrors convertToTeamWorkshop()'s free path + invite-claim participant creation,
 * but runs directly (bypasses Clerk auth + the challenge-published/billing gates).
 * Idempotent. PRODUCTION DB — writes are real.
 *
 * Usage: dotenv -e .env.local -- tsx scripts/setup-multiplayer.ts <ses_id> <participant_email>
 */
import { randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../src/db/client';
import {
  sessions,
  workshops,
  users,
  workshopSessions,
  sessionParticipants,
} from '../src/db/schema';

const OWNER_COLOR = '#b3efbd';        // PARTICIPANT_COLORS[0]
const PARTICIPANT_COLORS = ['#b3efbd', '#ffa8db', '#a8daff', '#ffd3a8', '#ffe299', '#ffafa3', '#b3f4ef', '#d3bdff'];

function nameOf(u?: { firstName: string | null; lastName: string | null } | null) {
  return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Participant' : 'Participant';
}

async function main() {
  const sesId = process.argv[2] ?? 'ses_vk3b99mlurxqdepnqa8w7239';
  const email = process.argv[3] ?? 'christie.michael@gmail.com';

  const [ses] = await db.select().from(sessions).where(eq(sessions.id, sesId));
  if (!ses) throw new Error(`No sessions row for ${sesId}`);
  const workshopId = ses.workshopId;

  const [ws] = await db.select().from(workshops).where(eq(workshops.id, workshopId));
  if (!ws) throw new Error(`No workshop ${workshopId}`);

  const [target] = await db.select().from(users).where(eq(users.email, email));
  if (!target) throw new Error(`No Clerk user for ${email} — they must sign in once first`);

  // 1. Flip workshop to multiplayer/team
  if (ws.workshopType !== 'multiplayer' || ws.facilitatorMode !== 'team') {
    await db.update(workshops)
      .set({ facilitatorMode: 'team', workshopType: 'multiplayer', maxParticipants: 15 })
      .where(eq(workshops.id, workshopId));
    console.log('• workshop flipped → multiplayer/team');
  } else {
    console.log('• workshop already multiplayer/team');
  }

  // 2. Ensure workshop_sessions row
  let wss = await db.query.workshopSessions.findFirst({ where: eq(workshopSessions.workshopId, workshopId) });
  if (!wss) {
    const [created] = await db.insert(workshopSessions).values({
      workshopId,
      liveblocksRoomId: `workshop-${workshopId}`,
      shareToken: randomBytes(18).toString('base64url'),
      status: 'waiting',
      maxParticipants: 15,
    }).returning();
    wss = created;
    console.log(`• created workshop_session ${wss.id}`);
  } else {
    console.log(`• workshop_session exists ${wss.id}`);
  }

  // 3. Ensure owner participant
  const ownerExists = await db.query.sessionParticipants.findFirst({
    where: and(eq(sessionParticipants.sessionId, wss.id), eq(sessionParticipants.clerkUserId, ws.clerkUserId)),
  });
  if (!ownerExists) {
    const [ownerUser] = await db.select().from(users).where(eq(users.clerkUserId, ws.clerkUserId));
    await db.insert(sessionParticipants).values({
      sessionId: wss.id,
      clerkUserId: ws.clerkUserId,
      liveblocksUserId: ws.clerkUserId,
      displayName: nameOf(ownerUser) === 'Participant' ? 'Facilitator' : nameOf(ownerUser),
      color: OWNER_COLOR,
      role: 'owner',
      status: 'active',
    });
    console.log('• owner participant created');
  } else {
    console.log('• owner participant exists');
  }

  // 4. Ensure target participant
  const targetExists = await db.query.sessionParticipants.findFirst({
    where: and(eq(sessionParticipants.sessionId, wss.id), eq(sessionParticipants.clerkUserId, target.clerkUserId)),
  });
  if (!targetExists) {
    const count = (await db.select().from(sessionParticipants).where(eq(sessionParticipants.sessionId, wss.id))).length;
    await db.insert(sessionParticipants).values({
      sessionId: wss.id,
      clerkUserId: target.clerkUserId,
      liveblocksUserId: target.clerkUserId,
      displayName: nameOf(target),
      color: PARTICIPANT_COLORS[count % PARTICIPANT_COLORS.length],
      role: 'participant',
      status: 'active',
    });
    console.log(`• participant ${email} added`);
  } else {
    console.log(`• participant ${email} already present`);
  }

  const parts = await db.select().from(sessionParticipants).where(eq(sessionParticipants.sessionId, wss.id));
  console.log('\n=== RESULT ===');
  console.log('open URL (both users):', `/workshop/${sesId}/step/ideation`);
  console.log('participants:', parts.map((p) => ({ name: p.displayName, role: p.role, clerk: p.clerkUserId, color: p.color })));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
