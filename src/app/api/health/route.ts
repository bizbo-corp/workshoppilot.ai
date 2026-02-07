import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Health check endpoint that verifies database connectivity
 * Returns 200 with healthy status if database is reachable
 * Returns 500 with unhealthy status if database is unreachable or times out
 */
export async function GET() {
  try {
    // Execute simple health check query with 5-second timeout
    const healthCheck = db.execute(sql`SELECT 1 as health`);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database health check timed out after 5 seconds')), 5000)
    );

    await Promise.race([healthCheck, timeout]);

    return NextResponse.json(
      {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
