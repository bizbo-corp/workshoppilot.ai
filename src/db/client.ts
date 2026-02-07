import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Please configure your Neon database connection string.'
  );
}

// Create Neon HTTP client (serverless-optimized, no connection pooling needed)
const sql = neon(process.env.DATABASE_URL);

// Export Drizzle database instance with schema
export const db = drizzle(sql, { schema });
