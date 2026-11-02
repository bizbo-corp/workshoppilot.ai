import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import type { MockDb } from '@/test/mock-db';
import { addCredits, spendCredits, withCredits, InsufficientCreditsError } from './ledger';

const mock = db as unknown as MockDb;

describe('credit ledger', () => {
  beforeEach(() => mock.reset());

  it('adds credits and records the balance after', async () => {
    mock.queue(
      [], // idempotency lookup: no existing row
      [{ balance: 550 }], // users update returning
      [{ id: 'led_1', delta: 500, balanceAfter: 550 }], // ledger insert returning
    );
    const r = await addCredits({ userId: 'usr_1', amount: 500, kind: 'purchase', description: 'Starter pack', reference: 'cs_1' });
    expect(r.duplicate).toBe(false);
    expect(r.entry.balanceAfter).toBe(550);
  });

  it('is idempotent on (kind, reference)', async () => {
    mock.queue([{ id: 'led_existing', delta: 500 }]);
    const r = await addCredits({ userId: 'usr_1', amount: 500, kind: 'purchase', description: 'Starter pack', reference: 'cs_1' });
    expect(r.duplicate).toBe(true);
    expect(mock.calls).not.toContain('update');
  });

  it('spends when the balance covers it', async () => {
    mock.queue([{ balance: 150 }], [{ id: 'led_2', delta: -400, balanceAfter: 150 }]);
    const e = await spendCredits({ userId: 'usr_1', amount: 400, kind: 'spend', description: 'Verdict' });
    expect(e.delta).toBe(-400);
  });

  it('refuses to overspend', async () => {
    mock.queue([], [{ balance: 20 }]);
    await expect(spendCredits({ userId: 'usr_1', amount: 400, kind: 'spend', description: 'Verdict' })).rejects.toBeInstanceOf(
      InsufficientCreditsError,
    );
  });

  it('refunds when the paid job throws', async () => {
    mock.queue(
      [{ balance: 100 }], [{ id: 'led_3', delta: -400 }], // spend
      [], [{ balance: 500 }], [{ id: 'led_4', delta: 400 }], // refund
    );
    await expect(
      withCredits({ userId: 'usr_1', amount: 400, kind: 'spend', description: 'Verdict' }, async () => {
        throw new Error('model down');
      }),
    ).rejects.toThrow('model down');
    expect(mock.calls.filter((c) => c === 'insert')).toHaveLength(2);
  });

  it('skips the ledger for free jobs', async () => {
    const out = await withCredits({ userId: 'usr_1', amount: 0, kind: 'spend', description: 'free' }, async () => 'ok');
    expect(out).toBe('ok');
    expect(mock.calls).toHaveLength(0);
  });
});
