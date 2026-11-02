import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * All 2.0 tables live in the `v2` Postgres schema. The 1.0 tables stay in
 * `public` untouched until launch, so the live site keeps working while 2.0
 * is built against the same database. Phase 6 drops `public`'s old tables.
 */
export const v2 = pgSchema('v2');
