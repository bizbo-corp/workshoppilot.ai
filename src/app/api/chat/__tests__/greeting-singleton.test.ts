/**
 * Integration test for the DB-lock greeting singleton (62.1-02 — GREET-01).
 * Tests that 5 simultaneous __step_start__ POSTs produce exactly 1 assistant row.
 *
 * Test runner: vitest (NOT YET INSTALLED in this repo as of 2026-05-16).
 * These tests require: npm install -D vitest
 * Then run: npx dotenv -e .env.local -- vitest run src/app/api/chat/__tests__/greeting-singleton.test.ts
 *
 * RUNNABLE ALTERNATIVE (no vitest required):
 * npx dotenv -e .env.local -- tsx scripts/test-62.1-02-greeting-singleton.ts
 *
 * PRIMARY TEST PATH: Direct POST handler import + Clerk mock.
 * This test fires 5 simultaneous POSTs and asserts exactly 1 non-empty assistant
 * row in chat_messages for the test scope after all promises settle.
 *
 * IMPORTANT: This test triggers real Gemini API calls if ANY request wins the claim
 * and needs to generate a greeting. In CI without a live Gemini key this test will
 * be slow or fail. Use E2E_DEV_SERVER=true + a running dev server for full E2E.
 *
 * All fixtures use ses_test621_* / ws_test621_* prefixes.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — vitest not installed; this file is a design-time artifact
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/db/client';
import { chatMessages, sessions, workshops } from '@/db/schema';
import { eq, like, and } from 'drizzle-orm';

// Primary path: mock Clerk auth so we can import the route handler directly
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'user_test_singleton_621' }),
}));

// NOTE: If Clerk mock fails due to module init side effects, use the
// E2E_DEV_SERVER fallback path below.
import { POST } from '@/app/api/chat/route';

const WS_ID = 'ws_test621_5xmount';
const SES_ID = 'ses_test621_5xmount';
const STEP_ID = 'stakeholder-mapping';

// Step-start trigger message (same format as the client sends)
const STEP_START_MESSAGES = [
  {
    id: `step-start:${SES_ID}:${STEP_ID}:fac`,
    role: 'user',
    parts: [{ type: 'text', text: '__step_start__' }],
  },
];

beforeAll(async () => {
  await db.insert(workshops).values({
    id: WS_ID,
    clerkUserId: 'user_test_singleton_621',
    title: 'Test 62.1 Greeting Singleton',
    originalIdea: 'test fixture',
  }).onConflictDoNothing();

  await db.insert(sessions).values({
    id: SES_ID,
    workshopId: WS_ID,
  }).onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(chatMessages).where(like(chatMessages.sessionId, 'ses_test621_%'));
  await db.delete(sessions).where(like(sessions.id, 'ses_test621_%'));
  await db.delete(workshops).where(like(workshops.id, 'ws_test621_%'));
});

function buildRequest(): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SES_ID,
      stepId: STEP_ID,
      workshopId: WS_ID,
      messages: STEP_START_MESSAGES,
    }),
  });
}

describe('/api/chat greeting singleton — 5x simultaneous step-start', () => {
  it(
    'produces exactly 1 non-empty assistant row in chat_messages after 5 concurrent POSTs',
    async () => {
      // Fire 5 simultaneous POSTs — 1 should win the claim, 4 should race-lose and replay
      const promises = Array.from({ length: 5 }, () => POST(buildRequest()));
      const responses = await Promise.all(promises);

      // All responses should be 2xx (the streaming response may be 200)
      for (const res of responses) {
        expect(res.status).toBeLessThan(500);
      }

      // Wait for onFinish to fire on the winner (give it up to 60s for Gemini)
      // In practice the winner's stream + onFinish may take a few seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const rows = await db
        .select({
          messageId: chatMessages.messageId,
          role: chatMessages.role,
          contentLen: chatMessages.content,
        })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.sessionId, SES_ID),
            eq(chatMessages.stepId, STEP_ID),
            eq(chatMessages.role, 'assistant'),
          ),
        );

      // Filter out the placeholder row (empty content) — the filled greeting is what matters
      const nonEmptyAssistantRows = rows.filter((r) => r.contentLen.trim().length > 0);

      // The core assertion: exactly 1 non-empty assistant greeting
      expect(nonEmptyAssistantRows.length).toBe(1);
    },
    // 70s timeout to accommodate Gemini streaming
    70_000,
  );

  // FALLBACK: dev-server fetch (skipped unless E2E_DEV_SERVER=true)
  it.skipIf(!process.env.E2E_DEV_SERVER)(
    'dev-server: 5 simultaneous POSTs produce 1 non-empty assistant row',
    async () => {
      const makeReq = () =>
        fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: SES_ID,
            stepId: STEP_ID,
            workshopId: WS_ID,
            messages: STEP_START_MESSAGES,
          }),
        });

      const responses = await Promise.all(Array.from({ length: 5 }, makeReq));
      for (const res of responses) {
        expect(res.status).toBeLessThan(500);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const rows = await db
        .select({ contentLen: chatMessages.content })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.sessionId, SES_ID),
            eq(chatMessages.stepId, STEP_ID),
            eq(chatMessages.role, 'assistant'),
          ),
        );

      const nonEmpty = rows.filter((r) => r.contentLen.trim().length > 0);
      expect(nonEmpty.length).toBe(1);
    },
    70_000,
  );
});
