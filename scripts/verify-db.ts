/**
 * Verify database schema and seed data
 */

import { db } from '../src/db/client';
import { sql } from 'drizzle-orm';
import { stepDefinitions } from '../src/db/schema';

async function verifyDatabase() {
  console.log('Verifying database state...\n');

  try {
    // Check tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map((r: any) => r.table_name);
    console.log(`✓ Tables found (${tables.length}):`);
    tables.forEach((table: string) => console.log(`  - ${table}`));

    // Check step definitions count
    const steps = await db.select().from(stepDefinitions);
    console.log(`\n✓ Step definitions seeded: ${steps.length}/10`);

    if (steps.length === 10) {
      console.log('\n✅ Database verification passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Expected 10 step definitions, found', steps.length);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    process.exit(1);
  }
}

verifyDatabase();
