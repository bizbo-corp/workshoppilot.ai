import { vi } from 'vitest';

/**
 * A chainable stand-in for the Drizzle db. Every builder method returns the
 * chain; awaiting it resolves to the next queued result. Tests queue results
 * with `queue(...)` in the order the code under test will await them.
 */
export interface MockDb {
  queue: (...results: unknown[]) => void;
  calls: string[];
  reset: () => void;
  [key: string]: unknown;
}

export function createMockDb(): MockDb {
  const results: unknown[] = [];
  const calls: string[] = [];

  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'limit', 'orderBy', 'insert', 'values', 'update', 'set',
    'delete', 'returning', 'onConflictDoNothing', 'onConflictDoUpdate', 'groupBy', 'innerJoin', 'leftJoin',
  ];
  for (const m of methods) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push(m);
      void args;
      return chain;
    });
  }
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    const next = results.shift();
    if (next instanceof Error) return Promise.reject(next).then(resolve, reject);
    return Promise.resolve(next ?? []).then(resolve, reject);
  };

  const db = chain as unknown as MockDb;
  db.queue = (...r: unknown[]) => results.push(...r);
  db.calls = calls;
  db.reset = () => {
    results.length = 0;
    calls.length = 0;
  };
  return db;
}
