/**
 * Unit tests never touch a database or a model. The db module is mocked
 * wholesale here; tests that need a db shape import `mockDb` and set
 * return values per call.
 */
import { vi } from 'vitest';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost/test';

vi.mock('@/db/client', async () => {
  const { createMockDb } = await import('./mock-db');
  return { db: createMockDb() };
});
