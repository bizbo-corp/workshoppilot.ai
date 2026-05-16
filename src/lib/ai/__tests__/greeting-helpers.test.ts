/**
 * Unit-ish integration tests for greeting placeholder helpers (62.1-02).
 *
 * Test runner: vitest (NOT YET INSTALLED in this repo as of 2026-05-16).
 * These tests require: npm install -D vitest
 * Then run: npx dotenv -e .env.local -- vitest run src/lib/ai/__tests__/greeting-helpers.test.ts
 *
 * RUNNABLE ALTERNATIVE (no vitest required):
 * npx dotenv -e .env.local -- tsx scripts/test-62.1-02-greeting-helpers.ts
 *
 * Tests run against the live dev Neon DB via process.env.DATABASE_URL.
 * All fixtures use ses_test621_* / ws_test621_* prefixes for blast-radius safety.
 *
 * NOTE: Because chat_messages has a FK to sessions, fixture sessions must
 * exist in the DB before insert. This test inserts a fixture session row
 * in beforeAll and cleans up in afterAll by prefix.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — vitest not installed; this file is a design-time artifact
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db/client';
import { chatMessages, sessions, workshops } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import {
  claimGreetingPlaceholder,
  fillGreetingPlaceholder,
  pollForFilledGreeting,
  greetingPlaceholderMessageId,
} from '@/lib/ai/message-persistence';

const WS_ID = 'ws_test621_greeting_helpers';
const SES_ID = 'ses_test621_greeting_helpers';
const STEP_ID = 'stakeholder-mapping';

beforeAll(async () => {
  // Insert fixture workshop + session (FK chain)
  await db.insert(workshops).values({
    id: WS_ID,
    clerkUserId: 'user_test_greeting_helpers',
    title: 'Test 62.1 Greeting Helpers',
    originalIdea: 'test fixture',
  }).onConflictDoNothing();

  await db.insert(sessions).values({
    id: SES_ID,
    workshopId: WS_ID,
  }).onConflictDoNothing();
});

afterAll(async () => {
  // Cleanup by prefix — never delete by exact messageId
  await db.delete(chatMessages).where(like(chatMessages.sessionId, 'ses_test621_%'));
  await db.delete(sessions).where(like(sessions.id, 'ses_test621_%'));
  await db.delete(workshops).where(like(workshops.id, 'ws_test621_%'));
});

describe('claimGreetingPlaceholder', () => {
  it('first call wins (won=true), second call loses (won=false) for the same scope', async () => {
    const [result1, result2] = await Promise.all([
      claimGreetingPlaceholder(SES_ID, STEP_ID, null),
      claimGreetingPlaceholder(SES_ID, STEP_ID, null),
    ]);

    const wonCount = [result1, result2].filter((r) => r.won).length;
    const lostCount = [result1, result2].filter((r) => !r.won).length;

    expect(wonCount).toBe(1);
    expect(lostCount).toBe(1);

    const winner = [result1, result2].find((r) => r.won);
    expect(winner).toBeDefined();
    if (winner && winner.won) {
      expect(winner.placeholderRowId).toBeTruthy();
      expect(winner.messageId).toBe(greetingPlaceholderMessageId(SES_ID, STEP_ID, null));
    }
  });
});

describe('fillGreetingPlaceholder', () => {
  it('updates content + messageId on the placeholder row; fresh select returns new messageId', async () => {
    const STEP_FILL = 'challenge';
    const claim = await claimGreetingPlaceholder(SES_ID, STEP_FILL, null);
    expect(claim.won).toBe(true);
    if (!claim.won) return;

    const finalMessageId = `msg_test621_filled_${Date.now()}`;
    const finalContent = 'Hello from the winner!';

    await fillGreetingPlaceholder(claim.placeholderRowId, finalContent, finalMessageId);

    const rows = await db
      .select({ messageId: chatMessages.messageId, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.id, claim.placeholderRowId));

    expect(rows).toHaveLength(1);
    expect(rows[0].messageId).toBe(finalMessageId);
    expect(rows[0].content).toBe(finalContent);
  });
});

describe('pollForFilledGreeting', () => {
  it('returns null after budget expires when no row is filled', async () => {
    // Use a scope with no rows at all (different stepId)
    const result = await pollForFilledGreeting(SES_ID, 'empathize', null, 500, 100);
    expect(result).toBeNull();
  });

  it('returns the filled row when fill happens during the poll window', async () => {
    const STEP_POLL = 'define';
    // Claim and then fill asynchronously while poll is running
    const claim = await claimGreetingPlaceholder(SES_ID, STEP_POLL, null);
    expect(claim.won).toBe(true);
    if (!claim.won) return;

    const finalMessageId = `msg_test621_poll_${Date.now()}`;
    const finalContent = 'Streamed greeting content!';

    // Fill after 200ms — poll budget is 2000ms so it should catch it
    setTimeout(() => {
      fillGreetingPlaceholder(claim.placeholderRowId, finalContent, finalMessageId).catch(
        (err) => console.error('[test] fill failed', err),
      );
    }, 200);

    const result = await pollForFilledGreeting(SES_ID, STEP_POLL, null, 2000, 100);
    expect(result).not.toBeNull();
    expect(result?.content).toBe(finalContent);
    expect(result?.messageId).toBe(finalMessageId);
  });
});
