/**
 * scripts/verify-message-id-resolution.ts
 *
 * Verifies phase 62.2 server-side acceptance criteria (AC-1, AC-2, AC-4, AC-6,
 * plus the wire-through join) against the dev DB by driving a real /api/chat
 * POST against the running dev server.
 *
 * SCOPE: This script verifies SERVER-SIDE invariants only. It drives one
 * /api/chat request and asserts the resulting DB rows are consistent. The
 * client/server dual-write RACE (where server `onFinish` and client
 * `useAutoSave` both try to insert a chat_messages row with the same id
 * concurrently across multiple React mounts) is NOT exercised here — that's
 * inherently a UI scenario. The dual-write race is verified by Plan 01 Test 1
 * (manual 5x-rapid-mount checkpoint in 62.2-01-PLAN.md).
 *
 * PREREQUISITE: `npm run dev` must be running in another terminal (default
 * http://localhost:3000). Override with API_BASE_URL env var if needed.
 *
 * Run: npx tsx scripts/verify-message-id-resolution.ts
 *   (Matches scripts/verify-sentinel.ts precedent: no dotenv-cli wrapper —
 *    `import 'dotenv/config'` below loads `.env`/`.env.local` inline. The
 *    `dotenv-cli` package is NOT in package.json deps; do not invoke via
 *    `npx dotenv -e .env.local -- tsx ...`.)
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed (details printed to stderr)
 *   2 — setup/teardown failed (dev server unreachable, DB connection broken, etc.)
 *
 * Fixture id convention: ws_test622_msgid / ses_test622_msgid (cleaned up by prefix on exit).
 *
 * AC mapping:
 *   Assertion 1 — AC-1: zero empty-messageId rows in chat_messages
 *   Assertion 2 — AC-2: fresh-gen chat_request_logs.response_message_id populated
 *   Assertion 3 — AC-4: exactly 1 assistant row per scope, no lingering greeting:* messageId
 *   Assertion 4 — AC-2 wire-through: response_message_id matches a chat_messages.message_id
 *   Assertion 5 — AC-6: chat_messages_message_id_nonempty_chk CHECK constraint still present
 *
 * AC-3 (replay path) is unchanged from 62.1 and verified manually at Plan 01 Test 2.
 * AC-5 (Known Limitations doc updates) is done by Task 2 of this plan.
 *
 * NOTE on /api/chat auth: the route uses Clerk auth() which returns { userId: null }
 * for unauthenticated requests. Per route.ts guest fallback, unauthenticated requests
 * are allowed (rate-limited by IP only). This script does NOT need Clerk credentials.
 */

import 'dotenv/config'; // matches scripts/verify-sentinel.ts:15 — load env inline
import { db } from '../src/db/client';
import {
  workshops,
  sessions,
  chatMessages,
  chatRequestLogs,
} from '../src/db/schema';
import { and, eq, like, sql } from 'drizzle-orm';
import { createPrefixedId } from '../src/lib/ids';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const WORKSHOP_ID = 'ws_test622_msgid';
const SESSION_ID = 'ses_test622_msgid';
const STEP_ID = 'challenge'; // simpler than stakeholder-mapping — no dependency on prior step summaries

// createPrefixedId is used for a unique run tag to avoid conflicts on concurrent runs.
// The main fixture IDs are static for prefix-scoped cleanup; the run tag is informational only.
const RUN_TAG = createPrefixedId('run');

type AssertionResult = { name: string; passed: boolean; detail: string };
const results: AssertionResult[] = [];

function record(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
  if (passed) {
    console.log(`  PASS: ${name}`);
  } else {
    console.error(`  FAIL: ${name} — ${detail}`);
  }
}

async function cleanup() {
  // Order matters: chat_messages + chat_request_logs have FK to sessions, sessions FK to workshops.
  await db.delete(chatMessages).where(like(chatMessages.sessionId, 'ses_test622_%'));
  await db.delete(chatRequestLogs).where(like(chatRequestLogs.sessionId, 'ses_test622_%'));
  await db.delete(sessions).where(like(sessions.id, 'ses_test622_%'));
  await db.delete(workshops).where(like(workshops.id, 'ws_test622_%'));
}

async function setup() {
  await cleanup(); // idempotent — clear any prior run's leftovers

  // Insert minimal workshop. Only required NOT NULL fields are set;
  // columns with .default() or optional nullability are omitted.
  // Matches the pattern from scripts/seed-workshop.ts minimal fixture insertion.
  await db.insert(workshops).values({
    id: WORKSHOP_ID,
    clerkUserId: 'user_test622_verify',
    title: 'phase 62.2 verification fixture',
    originalIdea: 'verify-message-id-resolution script fixture — auto-cleanup on exit',
    status: 'active',
  } as any); // 'as any' acceptable for script-only fixture; cleanup is prefix-scoped

  await db.insert(sessions).values({
    id: SESSION_ID,
    workshopId: WORKSHOP_ID,
  } as any);
}

async function driveChatRequest(): Promise<boolean> {
  // Drive the greeting flow: a __step_start__ trigger message simulates a fresh page mount.
  // The challenge step has no prior-step dependencies, so no step_summaries are needed
  // and the sentinel injection path (HALL-01) is not triggered.
  const body = {
    sessionId: SESSION_ID,
    stepId: STEP_ID,
    workshopId: WORKSHOP_ID,
    participantId: null, // facilitator (solo) flow
    messages: [
      {
        id: `step-start:${SESSION_ID}:${STEP_ID}:fac`,
        role: 'user',
        parts: [{ type: 'text', text: '__step_start__' }],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`\n[fatal] cannot reach ${API_BASE_URL} — is 'npm run dev' running?`);
    console.error(`        Error: ${err}`);
    return false;
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`\n[fatal] /api/chat returned HTTP ${res.status}: ${text.slice(0, 500)}`);
    return false;
  }

  // Drain the stream to ensure onFinish fires server-side. The body is a UI
  // message stream — we don't need to parse it, just consume to completion.
  const reader = res.body?.getReader();
  if (reader) {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  }
  return true;
}

async function runAssertions() {
  // Give onFinish a moment to complete the DB writes after stream is drained.
  // onFinish fires synchronously at stream end server-side, but the Neon HTTP
  // round-trip adds ~50-200ms latency. 1500ms is conservative.
  await new Promise<void>((r) => setTimeout(r, 1500));

  // Assertion 1 (AC-1): no chat_messages rows with empty message_id in our fixture scope
  const emptyIdRows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, SESSION_ID),
        eq(chatMessages.messageId, ''),
      ),
    );
  record(
    'AC-1: zero empty-messageId rows in chat_messages',
    emptyIdRows.length === 0,
    `found ${emptyIdRows.length} empty-id row(s)`,
  );

  // Assertion 2 (AC-2): every fresh-gen chat_request_logs row has populated response_message_id
  const freshGenLogs = await db
    .select()
    .from(chatRequestLogs)
    .where(
      and(
        eq(chatRequestLogs.sessionId, SESSION_ID),
        eq(chatRequestLogs.isReplay, false),
      ),
    );
  const unpopulated = freshGenLogs.filter((r) => r.responseMessageId === null);
  record(
    'AC-2: fresh-gen chat_request_logs.response_message_id populated',
    freshGenLogs.length > 0 && unpopulated.length === 0,
    `${freshGenLogs.length} fresh-gen row(s); ${unpopulated.length} unpopulated`,
  );

  // Assertion 3 (AC-4): exactly 1 assistant row for this scope, id has msg_ prefix (no lingering greeting:* id)
  const assistantRows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, SESSION_ID),
        eq(chatMessages.stepId, STEP_ID),
        eq(chatMessages.role, 'assistant'),
      ),
    );
  const greetingPrefixed = assistantRows.filter((r) => r.messageId.startsWith('greeting:'));
  record(
    'AC-4: exactly 1 assistant row, no lingering greeting:* messageId',
    assistantRows.length === 1 && greetingPrefixed.length === 0,
    `${assistantRows.length} assistant row(s); ${greetingPrefixed.length} with greeting:* prefix; ids=[${assistantRows.map((r) => r.messageId).join(', ')}]`,
  );

  // Assertion 4 (AC-2 wire-through): each fresh-gen log's response_message_id joins to a chat_messages row
  const matchedLogs = freshGenLogs.filter((log) =>
    assistantRows.some((row) => row.messageId === log.responseMessageId),
  );
  record(
    'AC-2 wire-through: response_message_id matches a chat_messages.message_id',
    freshGenLogs.length > 0 && matchedLogs.length === freshGenLogs.length,
    `${matchedLogs.length}/${freshGenLogs.length} logs matched a chat_messages row`,
  );

  // Assertion 5 (AC-6): chat_messages_message_id_nonempty_chk CHECK constraint still present in pg_constraint catalog
  const constraintCheck = await db.execute(sql`
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_message_id_nonempty_chk'
  `);
  record(
    'AC-6: chat_messages_message_id_nonempty_chk CHECK constraint present',
    constraintCheck.rows.length === 1,
    `pg_constraint returned ${constraintCheck.rows.length} row(s) for chat_messages_message_id_nonempty_chk (expected 1)`,
  );
}

async function main() {
  console.log(`=== verify-message-id-resolution: phase 62.2 server-side AC verification [${RUN_TAG}] ===`);
  console.log(`    API: ${API_BASE_URL}`);
  console.log(`    Fixture: ${WORKSHOP_ID} / ${SESSION_ID} / step=${STEP_ID}`);

  // Setup
  try {
    console.log('\n[setup] Creating fixture workshop + session...');
    await setup();
    console.log('[setup] Done.');
  } catch (err) {
    console.error('[fatal] setup failed:', err);
    process.exit(2);
  }

  let chatOk = false;
  try {
    console.log('\n[drive] Posting __step_start__ to /api/chat...');
    chatOk = await driveChatRequest();
    if (!chatOk) {
      await cleanup().catch(() => {});
      process.exit(2);
    }
    console.log('[drive] Stream drained — server onFinish should have fired.');

    console.log('\n[assert] Running assertions...');
    await runAssertions();
  } catch (err) {
    console.error('[fatal] assertion run failed:', err);
    await cleanup().catch(() => {});
    process.exit(2);
  } finally {
    try {
      console.log('\n[cleanup] Removing fixture data...');
      await cleanup();
      console.log('[cleanup] Done.');
    } catch (err) {
      console.error('[warn] cleanup failed:', err);
    }
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n=== Results: ${results.length - failed.length}/${results.length} assertions passed ===`);
  if (failed.length === 0) {
    console.log('[verify-message-id-resolution] All assertions passed.');
    process.exit(0);
  } else {
    console.error(`[verify-message-id-resolution] ${failed.length} assertion(s) failed.`);
    process.exit(1);
  }
}

main();
