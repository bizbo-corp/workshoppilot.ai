/**
 * Integration tests for /api/chat scope assertion (62.1-02 — SCOPE-01).
 *
 * Test runner: vitest (NOT YET INSTALLED in this repo as of 2026-05-16).
 * These tests require: npm install -D vitest
 * Then run: npx dotenv -e .env.local -- vitest run src/app/api/chat/__tests__/scope-assertion.test.ts
 *
 * RUNNABLE ALTERNATIVE (no vitest required):
 * npx dotenv -e .env.local -- tsx scripts/test-62.1-02-scope-assertion.ts
 *
 * PRIMARY TEST PATH: Direct POST handler import + Clerk mock.
 * FALLBACK: it.skipIf(!process.env.E2E_DEV_SERVER) dev-server fetch (guarded).
 *
 * All fixtures use ses_test621_* / ws_test621_* prefixes.
 * Cleanup uses prefix-scoped DELETE to avoid blast radius.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — vitest not installed; this file is a design-time artifact
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/db/client';
import { chatMessages, sessions, workshops } from '@/db/schema';
import { like } from 'drizzle-orm';

// Primary path: mock Clerk auth so we can import the route handler directly
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'user_test_scope_621' }),
}));

// NOTE: If Clerk mock fails due to module init side effects, use the
// E2E_DEV_SERVER fallback path (guarded below with it.skipIf).
import { POST } from '@/app/api/chat/route';

const WS_REAL = 'ws_test621_scope_real';
const WS_WRONG = 'ws_test621_scope_wrong';
const SES_REAL = 'ses_test621_scope_real';
const STEP_ID = 'stakeholder-mapping';

beforeAll(async () => {
  // Insert fixture workshops
  await db.insert(workshops).values([
    {
      id: WS_REAL,
      clerkUserId: 'user_test_scope_621',
      title: 'Scope Test Real',
      originalIdea: 'test fixture',
    },
    {
      id: WS_WRONG,
      clerkUserId: 'user_test_scope_621',
      title: 'Scope Test Wrong',
      originalIdea: 'test fixture',
    },
  ]).onConflictDoNothing();

  // Insert fixture session linked to WS_REAL
  await db.insert(sessions).values({
    id: SES_REAL,
    workshopId: WS_REAL,
  }).onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(chatMessages).where(like(chatMessages.sessionId, 'ses_test621_%'));
  await db.delete(sessions).where(like(sessions.id, 'ses_test621_%'));
  await db.delete(workshops).where(like(workshops.id, 'ws_test621_%'));
});

// Helper to build a minimal request
function buildRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/chat scope assertion (direct import path)', () => {
  it('returns 409 workshop_session_mismatch when workshopId does not match session', async () => {
    const req = buildRequest({
      sessionId: SES_REAL,
      stepId: STEP_ID,
      workshopId: WS_WRONG, // mismatched — session belongs to WS_REAL
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
    });

    const res = await POST(req);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.error).toBe('workshop_session_mismatch');
    expect(body.sessionId).toBe(SES_REAL);
    expect(body.requestedWorkshopId).toBe(WS_WRONG);
    expect(body.actualWorkshopId).toBe(WS_REAL);

    // Verify no chat_messages row was written
    const rows = await db
      .select()
      .from(chatMessages)
      .where(like(chatMessages.sessionId, 'ses_test621_%'));
    expect(rows).toHaveLength(0);
  });

  it('returns 404 session_not_found when sessionId does not exist', async () => {
    const req = buildRequest({
      sessionId: 'ses_test621_does_not_exist',
      stepId: STEP_ID,
      workshopId: WS_REAL,
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
    });

    const res = await POST(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('session_not_found');
  });
});

// FALLBACK PATH: dev-server fetch (skipped unless E2E_DEV_SERVER=true is set)
// Use: E2E_DEV_SERVER=true npx dotenv -e .env.local -- vitest run ...
// Requires: npm run dev running in another terminal
describe('/api/chat scope assertion (dev-server fallback)', () => {
  it.skipIf(!process.env.E2E_DEV_SERVER)(
    'dev-server: returns 409 for mismatched workshopId',
    async () => {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: SES_REAL,
          stepId: STEP_ID,
          workshopId: WS_WRONG,
          messages: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
        }),
      });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('workshop_session_mismatch');
    },
  );
});
